import { initWialon, getWialonSession } from './loginWialon.js';

const RESOURCE_ID = 400730713;
const TEMPLATE_ID = 27;

function msg(text) { 
    $("#log").prepend(text + "<br/>"); 
}
    // Hacer executeReport disponible globalmente
    window.executeReport = function(action) {
        // Establecer la acción
        document.getElementById('action').value = action;
    
        var id_group = $("#unitGroupSelect").val(),
            startDate = flatpickr.parseDate($("#startDateTime").val(), "d/m/Y H:i"),
            endDate = flatpickr.parseDate($("#endDateTime").val(), "d/m/Y H:i");
        
        if(!id_group){ msg("Seleccione un grupo de unidades"); return; }
    
        var sess = wialon.core.Session.getInstance();
        var res = sess.getItem(RESOURCE_ID);
        if (!res) {
            msg("No se pudo encontrar el recurso con ID " + RESOURCE_ID);
            listAvailableResources();
            return;
        }
    
        var from = Math.floor(startDate.getTime() / 1000);
        var to = Math.floor(endDate.getTime() / 1000);
    
        var interval = { "from": from, "to": to, "flags": wialon.item.MReport.intervalFlag.absolute };
        var template = res.getReport(TEMPLATE_ID);
        if (!template) {
            msg("No se pudo encontrar la plantilla con ID " + TEMPLATE_ID);
            return;
        }
    
        $("#executeReportBtn").prop("disabled", true);
        msg("Ejecutando informe...");
    
        res.execReport(template, id_group, 0 , interval,
        function(code, data) {
            $("#executeReportBtn").prop("disabled", false);
            if(code){ msg("Error al ejecutar el informe: " + wialon.core.Errors.getErrorText(code)); return; }
            if(!data.getTables().length){
                msg("<b>No se generaron datos</b>");
                return;
            }
            else {
                if (action === 'tablas') {
                    showReportResult(data);
                } else if (action === 'graficas') {
                    sendDataToBackend(data);
                }
            }
        });
    };
async function init() {
    try {
        const sess = await initWialon();
        if (!sess) {
            throw new Error("No se pudo obtener la sesión de Wialon");
        }

        var res_flags = wialon.item.Item.dataFlag.base | wialon.item.Resource.dataFlag.reports;
        var group_flags = wialon.item.Item.dataFlag.base;
        
        sess.loadLibrary("resourceReports");
        sess.updateDataFlags(
            [
                {type: "type", data: "avl_resource", flags: res_flags, mode: 0},
                {type: "type", data: "avl_unit_group", flags: group_flags, mode: 0}
            ],
            function (code) {
                if (code) { 
                    msg("Error al actualizar banderas de datos: " + wialon.core.Errors.getErrorText(code)); 
                    return; 
                }

                var groups = sess.getItems("avl_unit_group");
                if (!groups || !groups.length){ 
                    msg("No se encontraron grupos de unidades"); 
                    return; 
                }
                var $groupSelect = $("#unitGroupSelect");
                groups.forEach(function(group) {
                    $groupSelect.append($("<option>").val(group.getId()).text(group.getName()));
                });

                var res = sess.getItem(RESOURCE_ID);
                if (res) {
                    msg("Recurso encontrado: " + res.getName());
                } else {
                    msg("No se pudo encontrar el recurso con ID " + RESOURCE_ID);
                }
            }
        );
    } catch (error) {
        console.error("Error al inicializar Wialon:", error);
        msg("Error al inicializar Wialon: " + error.message);
    }
}

function executeReport(action) {
    var id_group = $("#unitGroupSelect").val(),
        startDate = flatpickr.parseDate($("#startDateTime").val(), "d/m/Y H:i"),
        endDate = flatpickr.parseDate($("#endDateTime").val(), "d/m/Y H:i");
    
    if(!id_group){ msg("Seleccione un grupo de unidades"); return; }

    var sess = getWialonSession();
    var res = sess.getItem(RESOURCE_ID);
    if (!res) {
        msg("No se pudo encontrar el recurso con ID " + RESOURCE_ID);
        return;
    }

    var from = Math.floor(startDate.getTime() / 1000);
    var to = Math.floor(endDate.getTime() / 1000);

    var interval = { "from": from, "to": to, "flags": wialon.item.MReport.intervalFlag.absolute };
    var template = res.getReport(TEMPLATE_ID);
    if (!template) {
        msg("No se pudo encontrar la plantilla con ID " + TEMPLATE_ID);
        return;
    }

    $("#executeReportBtn, #graphicsBtn").prop("disabled", true);
    msg("Ejecutando informe...");

    res.execReport(template, id_group, 0 , interval,
    function(code, data) {
        $("#executeReportBtn, #graphicsBtn").prop("disabled", false);
        if(code){ msg("Error al ejecutar el informe: " + wialon.core.Errors.getErrorText(code)); return; }
        if(!data.getTables().length){
            msg("<b>No se generaron datos</b>");
            return;
        }
        else {
            if (action === 'tablas') {
                showReportResult(data);
            } else if (action === 'graficas') {
                sendDataToBackend(data);
            }
        }
    });
}

function showReportResult(result) {
    var tables = result.getTables();
    if (!tables) return;
    $("#log").empty();
    for(var i=0; i < tables.length; i++){
        var html = "<b>" + tables[i].label + "</b><div class='wrap'><table class='styled-table'>";
        
        var headers = tables[i].header;
        html += "<thead><tr>";
        for (var j=0; j<headers.length; j++)
            html += "<th>" + headers[j] + "</th>";
        html += "</tr></thead><tbody>";
        
        result.getTableRows(i, 0, tables[i].rows,
            function(html, code, rows) {
                if (code) {msg("Error al obtener filas de la tabla: " + wialon.core.Errors.getErrorText(code)); return;}
                for(var j in rows) {
                    if (typeof rows[j].c == "undefined") continue;
                    html += "<tr>";
                    for (var k = 0; k < rows[j].c.length; k++)
                        html += "<td>" + getTableValue(rows[j].c[k]) + "</td>";
                    html += "</tr>";
                }
                html += "</tbody></table></div>";
                $("#log").append(html);
            }.bind(this, html)
        );
    }
}

function getTableValue(data) {
    if (typeof data == "object")
        if (typeof data.t == "string") return data.t; else return "";
    else return data;
}

function sendDataToBackend(reportData) {
    var tables = reportData.getTables();
    var processedData = [];

    for (var i = 0; i < tables.length; i++) {
        var tableData = {
            label: tables[i].label,
            headers: tables[i].header,
            rows: []
        };

        reportData.getTableRows(i, 0, tables[i].rows,
            function (tableData, code, rows) {
                if (code) {
                    msg("Error al obtener filas de la tabla: " + wialon.core.Errors.getErrorText(code));
                    return;
                }
                for (var j in rows) {
                    if (typeof rows[j].c == "undefined") continue;
                    var row = rows[j].c.map(getTableValue);
                    tableData.rows.push(row);
                }
                processedData.push(tableData);
                
                if (processedData.length === tables.length) {
                    $.ajax({
                        url: '/analisis_temperatura',
                        type: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            action: 'graficas',
                            reportData: processedData,
                            sensorElegido: $("#sensorSelect").val()
                        }),
                        success: function (response) {
                            console.log("Respuesta completa del servidor:", response);
                            $("#resultContainer").empty();
                            $("#log").empty();
                            if (response.grafica_pequeña && response.grafica_grande) {
                                // Mostrar la gráfica pequeña en la página
                                var imgSmall = $('<img>').attr('src', 'data:image/png;base64,' + response.grafica_pequeña);
                                $("#resultContainer").append(imgSmall);
                                
                                // Configurar el botón de descarga para la gráfica grande
                                $("#downloadBtn").show().off('click').on('click', function () {
                                    downloadImage(response.grafica_grande, 'grafica_sensores.png');
                                });
                            } else {
                                $("#resultContainer").html('<p>No se pudo generar la gráfica</p>');
                            }
                        },
                        error: function (xhr, status, error) {
                            console.error("Error al enviar datos al backend:", error);
                            $("#resultContainer").html('<p>Error al procesar la solicitud</p>');
                        }
                    });
                }
            }.bind(this, tableData)
        );
    }
}

function downloadImage(base64Data, filename) {
    var link = document.createElement('a');
    link.href = 'data:image/png;base64,' + base64Data;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

$(document).ready(function () {
    $("#executeReportBtn").on('click', function(e) {
        executeReport('tablas');
    });
    $("#graphicsBtn").on('click', function(e) {
        executeReport('graficas');
    });

    flatpickr.localize(flatpickr.l10ns.es);
    flatpickr("#startDateTime", {
        enableTime: true,
        dateFormat: "d/m/Y H:i",
        time_24hr: true
    });
    flatpickr("#endDateTime", {
        enableTime: true,
        dateFormat: "d/m/Y H:i",
        time_24hr: true
    });

    init();
});