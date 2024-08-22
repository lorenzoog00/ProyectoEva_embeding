import { initWialon, getWialonSession } from './loginWialon.js';

let datosGeneralesGlobal = null;
    const RESOURCE_ID = 400730713;  // ID fijo del recurso
    const TEMPLATE_ID = 27;  // ID fijo de la plantilla

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
    function msg(text) { 
        $("#log").prepend(text + "<br/>"); 
    }

    function listAvailableResources() {
        var sess = getWialonSession();
        var resources = sess.getItems("avl_resource");
        msg("Recursos disponibles:");
        resources.forEach(function(resource) {
            msg("ID: " + resource.getId() + ", Nombre: " + resource.getName());
        });
    }

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
    
                    msg("Recurso preseleccionado con ID: " + RESOURCE_ID + " (Tipo: " + typeof RESOURCE_ID + ")");
                    msg("Plantilla preseleccionada con ID: " + TEMPLATE_ID + " (Tipo: " + typeof TEMPLATE_ID + ")");
    
                    listAvailableResources();
    
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
    
    function setLocaleTimeZone(callback) {
        var sess = getWialonSession();
        sess.execute("render/set_locale", { "tzOffset": -21600000 }, function(code) {
            if (code) {
                msg("Error al establecer la zona horaria: " + wialon.core.Errors.getErrorText(code));
            } else {
                msg("Zona horaria establecida correctamente");
                if (callback) {
                    callback();
                }
            }
        });
    }
    function setLocale() {
        var sess = getWialonSession();
        if (!sess || typeof sess.execute !== 'function') {
            console.error("Sesión de Wialon no inicializada correctamente");
            return;
        }
    
        var params = {
            "tzOffset": -134173792,  // Valor para Ciudad de México con horario de verano
            "language": "es",  // Código de idioma de dos letras
            "flags": 256,  // Flags: 0 - sistema métrico, 1 - sistema US, 2 - sistema imperial
            "formatDate": "%d-%b-%Y %H:%M:%S"  // Formato de fecha y hora
        };
    
        sess.execute('render/set_locale', params, function(code, result) {
            if (code) {
                console.error("Error al establecer la configuración local:", wialon.core.Errors.getErrorText(code));
            } else {
                console.log("Configuración local establecida correctamente");
            }
        });
    }
    
    function executeReport(action) {
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

    let statsGlobal = null;
let datosIndividualesGlobal = null;
//Muestra botones
function showButtons() {
    $("#downloadBtn").show();
    $("#descargarValoresPDFBtn").show();
    $("#mostrarDatosGeneralesBtn").show();
}
//Mostrar los datos de todos
function mostrarDatosGenerales(datosGenerales) {
    console.log("Mostrando datos generales:", datosGenerales);
    if (!datosGenerales || Object.keys(datosGenerales).length === 0) {
        $("#modalDatosGeneralesContent").html('<p>No hay datos generales disponibles</p>');
        return;
    }

    let html = '';
    let index = 0;
    for (let agrupacion in datosGenerales) {
        html += `<div class="sensor-data" data-index="${index}">`;
        html += `<h3>${agrupacion}</h3>`;
        html += '<ul>';
        for (let key in datosGenerales[agrupacion]) {
            html += `<li><strong>${key}:</strong> ${datosGenerales[agrupacion][key]}</li>`;
        }
        html += '</ul></div>';
        index++;
    }

    $("#modalDatosGeneralesContent").html(html);
    totalSensors = index;
    currentSensorIndex = 0;
    actualizarVisualizacionSensor();
    $("#modalDatosGenerales").show();
}

function actualizarVisualizacionSensor() {
    $(".sensor-data").removeClass("active");
    $(`.sensor-data[data-index="${currentSensorIndex}"]`).addClass("active");
    $("#sensorCounter").text(`Sensor ${currentSensorIndex + 1} de ${totalSensors}`);
    $("#prevSensor").prop("disabled", currentSensorIndex === 0);
    $("#nextSensor").prop("disabled", currentSensorIndex === totalSensors - 1);
}

function nextSensor() {
    if (currentSensorIndex < totalSensors - 1) {
        currentSensorIndex++;
        actualizarVisualizacionSensor();
    }
}

function prevSensor() {
    if (currentSensorIndex > 0) {
        currentSensorIndex--;
        actualizarVisualizacionSensor();
    }
}

function descargarValoresExcel() {
    fetch('/descargar_valores_individuales', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            datos_individuales: datosIndividualesGlobal,
            estadisticas: statsGlobal
        })
    })
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'valores_individuales.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    })
    .catch(error => console.error('Error:', error));
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
                            $("#log").empty();  // Limpiar el cuadro de texto
                            if (response.grafica) {
                                var resultContainer = $('<div>').addClass('result-container');

                                // Contenedor de la gráfica
                                var graphContainer = $('<div>').addClass('graph-container');
                                var img = $('<img>').attr('src', 'data:image/png;base64,' + response.grafica);
                                graphContainer.append(img);
                                resultContainer.append(graphContainer);

                                // Contenedor de la simbología
                                const simbologiaContainer = $('<div>').addClass('simbologia-container');
                                const simbologiaTable = $('<table>').addClass('simbologia-table');
                                simbologiaTable.append('<tr><th>Sensor</th><th>Color</th></tr>');
                                response.simbologia.forEach(item => {
                                    const row = $('<tr>');
                                    row.append($('<td>').text(item.Sensor));
                                    row.append($('<td>').html('<div class="color-box" style="background-color: ' + item.Color + ';"></div>' + item.Color));
                                    simbologiaTable.append(row);
                                });
                                simbologiaContainer.append(simbologiaTable);
                                resultContainer.append(simbologiaContainer);

                                $("#resultContainer").append(resultContainer);
                                // Mostrar los botones
                                showButtons();
                                // Guardar los datos generales en la variable global de los datos generales de cada sensor
                                datosGeneralesGlobal = response.datos_generales;
                                console.log("Datos generales recibidos:", datosGeneralesGlobal);
                                // Mostrar el botón de datos generales
                                $("#mostrarDatosGeneralesBtn").show().off('click').on('click', function() {
                                    mostrarDatosGenerales(datosGeneralesGlobal);
                                });
                                // Guardar los datos individuales en una variable global para usarlos en descargarExcel
                                statsGlobal = response.estadisticas;
                                datosIndividualesGlobal = response.datos_individuales;
                                $("#downloadBtn").show().off('click').on('click', function () {
                                    downloadImage(response.grafica, 'grafica_sensores.png');
                                });
                                $("#descargarValoresPDFBtn").show().off('click').on('click', function () {
                                    descargarValoresExcel();
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


async function onLoginSuccess() {
    try {
        await init();
        setLocale();
    } catch (error) {
        console.error("Error en onLoginSuccess:", error);
        msg("Error al inicializar Wialon: " + error.message);
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
        $("#reportForm").submit(executeReport);
        
        $("#mostrarDatosGeneralesBtn").on('click', function() {
            console.log("Botón clickeado, datosGeneralesGlobal:", datosGeneralesGlobal);
            mostrarDatosGenerales(datosGeneralesGlobal);
        });
        $(".close").on('click', function() {
            $("#modalDatosGenerales").hide();
        });
    
        $(window).on('click', function(event) {
            if (event.target == $("#modalDatosGenerales")[0]) {
                $("#modalDatosGenerales").hide();
            }
        });
        $("#nextSensor").on('click', nextSensor);
        $("#prevSensor").on('click', prevSensor);
    
        $(document).on('keydown', function(e) {
            if ($("#modalDatosGenerales").is(":visible")) {
                if (e.which === 37) { // Flecha izquierda
                    prevSensor();
                } else if (e.which === 39) { // Flecha derecha
                    nextSensor();
                }
            }
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
    
    onLoginSuccess();
});
    
    const sensorElegido = $("#sensorSelect").val();