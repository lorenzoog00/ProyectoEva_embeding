import { globalSelectedGroupId } from './dashboard.js';

const RESOURCE_ID = 400730713;
const TEMPLATE_ID = 28;

export function initConexionGraph(graphElement, wialonSession) {
    graphElement.innerHTML = `
        <div class="conexion-container">
            <h2 class="conexion-title">Análisis de Conexión por Unidad (Últimas 24 horas)</h2>
            <div id="conexionContent" class="conexion-content">
                <div class="conexion-stat">
                    <h3>Sin conexión ahora mismo</h3>
                    <span id="sin-conexion" class="conexion-value">-</span>
                </div>
                <div class="conexion-stat">
                    <h3>Recientemente desconectado</h3>
                    <span id="recientemente-desconectado" class="conexion-value">-</span>
                </div>
                <div class="conexion-stat">
                    <h3>Promedio de tiempo sin conexión</h3>
                    <span id="avg-conexion" class="conexion-value">-</span>
                </div>
            <a href="/conexion_deep_analysis" id="moreInfoLink" class="conexion-link">Para más información, haga clic aquí</a>
        </div>
    `;

    if (globalSelectedGroupId) {
        executeConexionReport(wialonSession, globalSelectedGroupId);
    } else {
        console.log("Esperando a que se seleccione un grupo...");
        document.addEventListener('groupSelected', () => {
            executeConexionReport(wialonSession, globalSelectedGroupId);
        });
    }
}

function executeConexionReport(wialonSession, groupId) {
    console.log("Ejecutando reporte de conexión para el grupo:", groupId);

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
    var to = Math.floor(now.getTime() / 1000); // Un minuto atrás
    var from = to - 24 * 60 * 60; // 24 horas antes de 'to'

    var interval = { "from": from, "to": to, "flags": wialon.item.MReport.intervalFlag.absolute };

    console.log("Ejecutando reporte con intervalo: " + new Date(from * 1000) + " a " + new Date(to * 1000));
    console.log("Ejecutando reporte de conexion con los siguientes parámetros:");
    console.log("Resource ID:", RESOURCE_ID);
    console.log("Template ID:", TEMPLATE_ID);
    console.log("Group ID:", groupId);
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
        processConexionData(data, wialonSession);
    });
}

function processConexionData(reportData, wialonSession) {
    var tables = reportData.getTables();
    var processedData = [];

    if (!tables || tables.length === 0) {
        console.warn("No se encontraron tablas en el reporte.");
        return;
    }

    console.log("Número de tablas a procesar: " + tables.length);

    tables.forEach(function(table, index) {
        console.log("Procesando tabla " + (index + 1) + " de " + tables.length);

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
            
            // Procesar cada fila
            rows.forEach(function(row, rowIndex) {
                if (typeof row.c === "undefined") return;
                console.log("Procesando fila " + (rowIndex + 1) + " de " + rows.length);
                processedData.push(row.c);  // Almacenar los datos procesados
            });
            
            // Enviar los datos al backend una vez que todo esté procesado
            sendDataToBackend({ headers: table.header, rows: processedData }, wialonSession);
        });
    });
}

function sendDataToBackend(data) {
    console.log("Enviando datos de conexión al backend...");
    const url = '/conexion_analysis';
    console.log("URL de destino para conexión:", url);
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'graficas',
            reportData: [data],
            templateId: TEMPLATE_ID, // Asegúrate de que TEMPLATE_ID está definido para conexión
            resourceId: RESOURCE_ID  // Asegúrate de que RESOURCE_ID está definido para conexión
        }),
    })
    .then(response => {
        console.log("Respuesta de conexión recibida de:", response.url);
        return response.json();
    })
    .then(responseData => {
        console.log("Datos de conexión recibidos del backend:", responseData);
        updateConexionInfo(responseData);
    })
    .catch((error) => {
        console.error('Error al enviar datos de conexión al backend:', error);
    });
}

function updateConexionInfo(data) {
    document.getElementById('sin-conexion').textContent = data.sin_conexion.join(', ');
    document.getElementById('recientemente-desconectado').textContent = data.recientemente_conectado.join(', ');
    document.getElementById('avg-conexion').textContent = data.promedio_duracion;
}
