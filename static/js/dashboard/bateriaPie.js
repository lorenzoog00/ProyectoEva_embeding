import { globalSelectedGroupId } from './dashboard.js';

const RESOURCE_ID = 400730713;
const TEMPLATE_ID = 30;  // Asegúrate de que este es el ID correcto para el reporte de batería

export function initBateriaPieGraph(graphElement, wialonSession) {
    console.log("Iniciando gráfico de batería");
    graphElement.innerHTML = `
        <div class="bateria-container">
            <h2 class="bateria-title">Estado de Batería por Unidad</h2>
            <div id="bateriaPieChartContainer">
                <canvas id="bateriaPieChart" width="150" height="150"></canvas>
            </div>
            <div id="bateriaSummary" class="bateria-summary"></div>
            <div id="bateriaCritica" class="bateria-critica"></div>
            <a href="/bateria_deep_analysis" class="bateria-link">Para más información, haga clic aquí</a>
        </div>
    `;

    if (globalSelectedGroupId) {
        executeBateriaReport(wialonSession, globalSelectedGroupId);
    } else {
        console.log("Esperando a que se seleccione un grupo...");
        document.addEventListener('groupSelected', () => {
            executeBateriaReport(wialonSession, globalSelectedGroupId);
        });
    }
}

function executeBateriaReport(wialonSession, groupId) {
    console.log("Ejecutando reporte de batería para el grupo:", groupId);

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
    var from = to - 24 * 60 * 60; // 24 horas antes de 'to'

    var interval = { "from": from, "to": to, "flags": wialon.item.MReport.intervalFlag.absolute };

    console.log("Ejecutando reporte de batería con intervalo:", new Date(from * 1000), "a", new Date(to * 1000));

    res.execReport(template, groupId, groupId, interval, function(code, data) {
        if (code) { 
            console.error("Error al ejecutar el informe de batería:", wialon.core.Errors.getErrorText(code));
            return; 
        }
        if (!data || !data.getTables || !data.getTables().length) {
            console.log("No se generaron datos en el reporte de batería");
            return;
        }
        console.log("Reporte de batería ejecutado exitosamente. Procesando datos...");
        processBateriaData(data);
    });
}

function processBateriaData(reportData) {
    console.log("Procesando datos de batería");
    var tables = reportData.getTables();
    var processedData = [];

    if (!tables || tables.length === 0) {
        console.warn("No se encontraron tablas en el reporte de batería.");
        return;
    }

    tables.forEach(function(table, index) {
        reportData.getTableRows(index, 0, table.rows, function(code, rows) {
            if (code) {
                console.error("Error al obtener filas de la tabla de batería:", wialon.core.Errors.getErrorText(code));
                return;
            }

            if (!rows || rows.length === 0) {
                console.warn("No se encontraron filas en la tabla de batería " + (index + 1));
                return;
            }
            
            rows.forEach(function(row) {
                if (typeof row.c === "undefined") return;
                processedData.push(row.c);
            });
            
            sendDataToBackend({ headers: table.header, rows: processedData });
        });
    });
}

function sendDataToBackend(data) {
    const url = '/bateria_analysis';
    console.log("Enviando datos de batería al backend. URL:", url);
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'graficas',
            reportData: [data]
        }),
    })
    .then(response => {
        console.log("Respuesta recibida de batería:", response.url);
        return response.json();
    })
    .then(responseData => {
        console.log("Datos de batería recibidos del backend:", responseData);
        renderBateriaPieChart(responseData);
    })
    .catch((error) => {
        console.error('Error al enviar datos de batería al backend:', error);
    });
}

function renderBateriaPieChart(data) {
    const ctx = document.getElementById('bateriaPieChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['80-100%', '60-80%', '40-60%', '20-40%', '0-20%'],
            datasets: [{
                data: [
                    data.ranges['80-100'],
                    data.ranges['60-80'],
                    data.ranges['40-60'],
                    data.ranges['20-40'],
                    data.ranges['0-20']
                ],
                backgroundColor: [
                    '#00FF00', // Verde brillante
                    '#32CD32', // Verde lima
                    '#FFA500', // Naranja
                    '#FF4500', // Rojo-Naranja
                    '#FF0000'  // Rojo
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'right',
                }
            }
        }
    });

    const totalUnits = Object.values(data.ranges).reduce((a, b) => a + b, 0);
    
    document.getElementById('bateriaSummary').innerHTML = `
        <p>Total de unidades: ${totalUnits}</p>
        <p>Unidades con batería crítica: ${data.unidades_criticas.length}</p>
    `;
}
