import { initWialon, getWialonSession } from './loginWialon.js';

function msg(text) { 
    $("#log").prepend(text + "<br/>"); 
}

async function init() {
    try {
        await initWialon();
        var sess = getWialonSession();
        if (!sess) {
            throw new Error("No se pudo obtener la sesión de Wialon");
        }

        var res_flags = wialon.item.Item.dataFlag.base | wialon.item.Resource.dataFlag.reports;
        var unit_flags = wialon.item.Item.dataFlag.base;
        
        sess.loadLibrary("resourceReports");
        sess.updateDataFlags(
            [
                {type: "type", data: "avl_resource", flags: res_flags, mode: 0},
                {type: "type", data: "avl_unit", flags: unit_flags, mode: 0}
            ],
            function (code) {
                if (code) { msg(wialon.core.Errors.getErrorText(code)); return; }

                var res = sess.getItems("avl_resource");
                if (!res || !res.length){ msg("No se encontraron recursos"); return; }
                var $resourceSelect = $("#resourceSelect");
                res.forEach(function(resource) {
                    $resourceSelect.append($("<option>").val(resource.getId()).text(resource.getName()));
                });

                getTemplates();
                
                $("#resourceSelect").change(getTemplates);

                var units = sess.getItems("avl_unit");
                if (!units || !units.length){ msg("No se encontraron unidades"); return; }
                var $unitSelect = $("#unitSelect");
                units.forEach(function(unit) {
                    $unitSelect.append($("<option>").val(unit.getId()).text(unit.getName()));
                });
            }
        );
    } catch (error) {
        console.error("Error al inicializar Wialon:", error);
        msg("Error al inicializar Wialon: " + error.message);
    }
}

function getTemplates() {
    $("#templateSelect").empty().append("<option></option>");
    var sess = getWialonSession();
    var res = sess.getItem($("#resourceSelect").val());
    if (!wialon.util.Number.and(res.getUserAccess(), wialon.item.Item.accessFlag.execReports)){
        $("#executeReportBtn").prop("disabled", true);
        msg("No tiene suficientes permisos para ejecutar informes");
        return;
    } else {
        $("#executeReportBtn").prop("disabled", false);
    }

    var templ = res.getReports();
    for(var i in templ){
        if (templ[i].ct != "avl_unit") continue;
        $("#templateSelect").append($("<option>").val(templ[i].id).text(templ[i].n));
    }
}

function executeReport(e) {
    e.preventDefault();
    var id_res = $("#resourceSelect").val(),
        id_templ = $("#templateSelect").val(),
        id_unit = $("#unitSelect").val(),
        intervalValue = $("#intervalSelect").val();
    if(!id_res){ msg("Seleccione un recurso"); return; }
    if(!id_templ){ msg("Seleccione un template de informe"); return; }
    if(!id_unit){ msg("Seleccione una unidad"); return; }

    var sess = getWialonSession();
    var res = sess.getItem(id_res);
    var to = sess.getServerTime();
    var from;

    if (intervalValue === "today") {
        var todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        from = Math.floor(todayStart.getTime() / 1000);
    } else {
        from = to - parseInt(intervalValue, 10);
    }

    var interval = { "from": from, "to": to, "flags": wialon.item.MReport.intervalFlag.absolute };
    var template = res.getReport(id_templ);
    $("#executeReportBtn").prop("disabled", true);

    res.execReport(template, id_unit, 0, interval,
        function(code, data) {
            $("#executeReportBtn").prop("disabled", false);
            if(code){ msg(wialon.core.Errors.getErrorText(code)); return; }
            if(!data.getTables().length){
                msg("<b>No se generaron datos</b>");
                return;
            }
            else showReportResult(data);
        }
    );
}

function setLocale() {
    var params = {
        "tzOffset": -134173792,  // Valor para Ciudad de México con horario de verano
        "language": "es",  // Código de idioma de dos letras
        "flags": 256,  // Flags: 0 - sistema métrico, 1 - sistema US, 2 - sistema imperial
        "formatDate": "%d-%b-%Y %H:%M:%S"  // Formato de fecha y hora
    };

    var sess = getWialonSession();
    sess.execute('render/set_locale', params, function(code, result) {
        if (code) {
            console.error("Error al establecer la configuración local:", wialon.core.Errors.getErrorText(code));
        } else {
            console.log("Configuración local establecida correctamente");
        }
    });
}

async function onLoginSuccess() {
    try {
        await initWialon();
        setLocale();
        init();
    } catch (error) {
        console.error("Error en onLoginSuccess:", error);
        msg("Error al inicializar Wialon: " + error.message);
    }
}

function showReportResult(result) {
    var tables = result.getTables();
    if (!tables) return;
    for(var i=0; i < tables.length; i++){
        var html = "<b>" + tables[i].label + "</b><div class='wrap'><table class='styled-table' style='width:100%'>";
        
        var headers = tables[i].header;
        html += "<tr>";
        for (var j=0; j<headers.length; j++)
            html += "<th>" + headers[j] + "</th>";
        html += "</tr>";
        
        result.getTableRows(i, 0, tables[i].rows,
            function(html, code, rows) {
                if (code) {msg(wialon.core.Errors.getErrorText(code)); return;}
                for(var j in rows) {
                    if (typeof rows[j].c == "undefined") continue;
                    html += "<tr" + (j%2==1 ? " class='odd'" : "") + ">";
                    for (var k = 0; k < rows[j].c.length; k++) {
                        var value = getTableValue(rows[j].c[k]);
                        html += "<td>" + value + "</td>";
                    }
                    html += "</tr>";
                }
                html += "</table>";
                msg(html + "</div>");
            }.bind(this, html)
        );
    }
}

function getTableValue(data) {
    if (typeof data == "object")
        if (typeof data.t == "string") return data.t; else return data.v;
    else return data;
}

$(document).ready(function () {
    $("#reportForm").submit(executeReport);
    onLoginSuccess();
});