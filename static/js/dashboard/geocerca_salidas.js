import { globalSelectedGroupId } from './dashboard.js';

const RESOURCE_ID = 400730713;
const TEMPLATE_ID = 36;

let wialonSessionReady = false;
let pendingExecution = false;

export function initGeocercaGraph(graphElement, wialonSession) {
    graphElement.innerHTML = `
        <div class="geocerca-container">
            <h2 class="geocerca-title">Salidas de geocerca por unidad (Último mes)</h2>
            <div id="geocercaContent" class="geocerca-content">
                <div class="geocerca-stat">
                    <h3>Unidades con más salidas</h3>
                    <span id="max-exits" class="geocerca-value">-</span>
                </div>
                <div class="geocerca-stat">
                    <h3>Unidades con menos salidas</h3>
                    <span id="min-exits" class="geocerca-value">-</span>
                </div>
                <div class="geocerca-stat">
                    <h3>Promedio de salidas</h3>
                    <span id="avg-exits" class="geocerca-value">-</span>
                </div>
            </div>
            <a href="/geocercas_deep_analysis" id="moreInfoLink" class="geocerca-link">Para más información, haga clic aquí</a>
        </div>
    `;

    initializeWialonSession(wialonSession);
}

function initializeWialonSession(wialonSession) {
    wialonSession.updateDataFlags(
        [{type: "type", data: "avl_resource", flags: wialon.item.Item.dataFlag.base | wialon.item.Resource.dataFlag.reports, mode: 0}],
        function (code) {
            if (code) {
                console.error("Error al actualizar banderas de datos: " + wialon.core.Errors.getErrorText(code));
                return;
            }
            console.log("Sesión de Wialon inicializada para geocerca_salidas");
            wialonSessionReady = true;
            if (pendingExecution) {
                executeGeocercaReport(wialonSession, globalSelectedGroupId);
            }
        }
    );

    document.addEventListener('groupSelected', () => {
        console.log("Evento groupSelected detectado en geocerca_salidas");
        if (wialonSessionReady) {
            executeGeocercaReport(wialonSession, globalSelectedGroupId);
        } else {
            console.log("Sesión de Wialon no está lista. Marcando para ejecución pendiente.");
            pendingExecution = true;
        }
    });
}

function executeGeocercaReport(wialonSession, groupId) {
    if (!groupId) {
        console.log("No hay grupo seleccionado para geocerca_salidas.");
        return;
    }

    console.log("Ejecutando reporte de geocerca para el grupo:", groupId);

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

    var now = new Date();
    var to = Math.floor(now.getTime() / 1000);
    var from = new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000;

    var interval = { "from": from, "to": to, "flags": wialon.item.MReport.intervalFlag.absolute };

    console.log("Ejecutando reporte de geocerca con intervalo:", new Date(from * 1000), "a", new Date(to * 1000));
    console.log("Parámetros del reporte - Resource ID:", RESOURCE_ID, "Template ID:", TEMPLATE_ID, "Group ID:", groupId);

    res.execReport(template, groupId, groupId, interval, function(code, data) {
        if (code) { 
            console.error("Error al ejecutar el informe de geocerca:", wialon.core.Errors.getErrorText(code)); 
            return; 
        }
        if (!data.getTables().length) {
            console.log("No se generaron datos en el reporte de geocerca");
            return;
        }
        console.log("Reporte de geocerca ejecutado exitosamente. Procesando datos...");
        processGeocercaData(data, wialonSession);
    });
}

function processGeocercaData(reportData, wialonSession) {
    var tables = reportData.getTables();
    var processedData = [];

    if (!tables || tables.length === 0) {
        console.warn("No se encontraron tablas en el reporte de geocerca.");
        return;
    }

    console.log("Número de tablas a procesar en geocerca:", tables.length);

    tables.forEach(function(table, index) {
        console.log("Procesando tabla de geocerca " + (index + 1) + " de " + tables.length);

        reportData.getTableRows(index, 0, table.rows, function(code, rows) {
            if (code) {
                console.error("Error al obtener filas de la tabla de geocerca:", wialon.core.Errors.getErrorText(code));
                return;
            }

            if (!rows || rows.length === 0) {
                console.warn("No se encontraron filas en la tabla de geocerca " + (index + 1));
                return;
            }

            console.log("Número de filas obtenidas en geocerca:", rows.length);
            
            rows.forEach(function(row, rowIndex) {
                if (typeof row.c === "undefined") return;
                console.log("Procesando fila de geocerca " + (rowIndex + 1) + " de " + rows.length);
                processedData.push(row.c);
            });
            
            sendDataToBackend({ headers: table.header, rows: processedData }, wialonSession);
        });
    });
}

function sendDataToBackend(data, wialonSession) {
    console.log("Enviando datos de geocerca al backend...");
    const url = '/geocerca_analysis';
    console.log("URL de destino para geocerca:", url);
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'graficas',
            reportData: [data],
            templateId: TEMPLATE_ID,
            resourceId: RESOURCE_ID
        }),
    })
    .then(response => {
        console.log("Respuesta de geocerca recibida de:", response.url);
        return response.json();
    })
    .then(responseData => {
        console.log("Datos de geocerca recibidos del backend:", responseData);
        updateGeocercaInfo(responseData);
    })
    .catch((error) => {
        console.error('Error al enviar datos de geocerca al backend:', error);
    });
}

function updateGeocercaInfo(data) {
    document.getElementById('max-exits').textContent = `${data.units_with_max_exits.join(', ')} (${data.max_exits})`;
    document.getElementById('min-exits').textContent = `${data.units_with_min_exits.join(', ')} (${data.min_exits})`;
    document.getElementById('avg-exits').textContent = data.avg_exits.toFixed(2);
}