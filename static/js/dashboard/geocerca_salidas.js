const RESOURCE_ID = 400730713;
const TEMPLATE_ID = 36;

export function initGeocercaGraph(graphElement, wialonSession) {
    graphElement.innerHTML = `
        <h2>Salidas de geocerca por unidad</h2>
        <select id="unitGroupSelect">
            <option value="">Seleccione un grupo</notoption>
        </select>
<div id="geocercaContent">
            <p>Unidades con más salidas: <span id="max-exits">-</span></p>
            <p>Unidades con menos salidas: <span id="min-exits">-</span></p>
            <p>Promedio de salidas: <span id="avg-exits">-</span></p>
        </div>
            `;
    init(wialonSession);
}

function init(wialonSession) {
    var res_flags = wialon.item.Item.dataFlag.base | wialon.item.Resource.dataFlag.reports;
    var group_flags = wialon.item.Item.dataFlag.base;
    
    var sess = wialonSession;
    sess.loadLibrary("resourceReports");
    sess.updateDataFlags(
        [
            {type: "type", data: "avl_resource", flags: res_flags, mode: 0},
            {type: "type", data: "avl_unit_group", flags: group_flags, mode: 0}
        ],
        function (code) {
            if (code) { 
                console.error("Error al actualizar banderas de datos: " + wialon.core.Errors.getErrorText(code)); 
                return; 
            }

            var groups = sess.getItems("avl_unit_group");
            if (!groups || !groups.length){ 
                console.error("No se encontraron grupos de unidades"); 
                return; 
            }
            var $groupSelect = $("#unitGroupSelect");
            groups.forEach(function(group) {
                $groupSelect.append($("<option>").val(group.getId()).text(group.getName()));
            });

            console.log("Recurso preseleccionado con ID: " + RESOURCE_ID + " (Tipo: " + typeof RESOURCE_ID + ")");
            console.log("Plantilla preseleccionada con ID: " + TEMPLATE_ID + " (Tipo: " + typeof TEMPLATE_ID + ")");

            listAvailableResources(sess);

            var res = sess.getItem(RESOURCE_ID);
            if (res) {
                console.log("Recurso encontrado: " + res.getName());
                executeGeocercaReport(groups[0].getId(), sess);  // Ejecutar el reporte para el primer grupo
            } else {
                console.error("No se pudo encontrar el recurso con ID " + RESOURCE_ID);
            }
        }
    );
}

function listAvailableResources(sess) {
    var resources = sess.getItems("avl_resource");
    console.log("Recursos disponibles:");
    resources.forEach(function(resource) {
        console.log("ID: " + resource.getId() + ", Nombre: " + resource.getName());
    });
}

function executeGeocercaReport(groupId, wialonSession) {
    console.log("Ejecutando reporte de geocerca para el grupo: " + groupId);

    var res = wialonSession.getItem(RESOURCE_ID);
    if (!res) {
        console.error("No se pudo encontrar el recurso con ID " + RESOURCE_ID);
        return;
    }

    var template = res.getReport(TEMPLATE_ID);
    if (!template) {
        console.error("No se pudo encontrar la plantilla con ID " + TEMPLATE_ID);
        return;
    }

    // Configuración de la fecha: desde el primer día del mes hasta la fecha y hora actuales
    var now = new Date();
    var firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    var from = Math.floor(firstDayOfMonth.getTime() / 1000);
    var to = Math.floor(now.getTime() / 1000);

    var interval = { "from": from, "to": to, "flags": wialon.item.MReport.intervalFlag.absolute };

    console.log("Ejecutando reporte con intervalo: " + new Date(from * 1000) + " a " + new Date(to * 1000));
    res.execReport(template, groupId, 0, interval, function(code, data) {
        if (code) { 
            console.error("Error al ejecutar el informe: " + wialon.core.Errors.getErrorText(code)); 
            return; 
        }
        if (!data.getTables().length) {
            console.log("No se generaron datos en el reporte");
            return;
        }
        console.log("Reporte ejecutado exitosamente. Procesando datos...");
        processGeocercaData(data, wialonSession);
    });
}

function processGeocercaData(reportData, wialonSession) {
    var tables = reportData.getTables();
    var processedData = [];

    if (!tables || tables.length === 0) {
        console.warn("No se encontraron tablas en el reporte.");
        return;
    }

    console.log("Número de tablas a procesar: " + tables.length);

    tables.forEach(function(table, index) {
        console.log("Procesando tabla " + (index + 1) + " de " + tables.length);

        // Obtener filas de la tabla actual
        reportData.getTableRows(index, 0, table.rows, function(code, rows) {
            if (code) {
                console.error("Error al obtener filas de la tabla: " + wialon.core.Errors.getErrorText(code));
                return;
            }

            if (!rows || rows.length === 0) {
                console.warn("No se encontraron filas en la tabla " + (index + 1));
                return;
            }

            console.log("Número de filas obtenidas: " + rows.length);

            var html = "<b>" + table.label + "</b><div class='wrap'><table class='styled-table'>";
            var headers = table.header;

            html += "<thead><tr>";
            headers.forEach(function(header) {
                html += "<th>" + header + "</th>";
            });
            html += "</tr></thead><tbody>";
            
            // Procesar cada fila
            rows.forEach(function(row, rowIndex) {
                if (typeof row.c === "undefined") return;
                console.log("Procesando fila " + (rowIndex + 1) + " de " + rows.length);
                html += "<tr>";
                row.c.forEach(function(cell) {
                    html += "<td>" + getTableValue(cell) + "</td>";
                });
                html += "</tr>";
                processedData.push(row.c);  // Almacenar los datos procesados
            });
            html += "</tbody></table></div>";
            
            // Agregar los datos procesados al log de la interfaz
            $("#log").append(html);
            console.log("Tabla procesada y añadida al log.");
            
            // Enviar los datos al backend una vez que todo esté procesado
            sendDataToBackend({ headers: table.header, rows: processedData }, wialonSession);
        });
    });
}

function sendDataToBackend(data, wialonSession) {
    console.log("Enviando datos al backend...");
    fetch('/geocerca_analysis', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'graficas',
            reportData: [data]
        }),
    })
    .then(response => response.json())
    .then(responseData => {
        console.log("Datos recibidos del backend:", responseData);
        updateGeocercaInfo(responseData);
    })
    .catch((error) => {
        console.error('Error al enviar datos al backend:', error);
    });
}

function updateGeocercaInfo(data) {
    document.getElementById('max-exits').textContent = `${data.units_with_max_exits.join(', ')} (${data.max_exits})`;
    document.getElementById('min-exits').textContent = `${data.units_with_min_exits.join(', ')} (${data.min_exits})`;
    document.getElementById('avg-exits').textContent = data.avg_exits.toFixed(2);
}

function getTableValue(data) {
    if (typeof data === "object") {
        return typeof data.t === "string" ? data.t : "";
    } else {
        return data;
    }
}
