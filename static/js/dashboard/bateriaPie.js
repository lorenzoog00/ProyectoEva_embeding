import { globalSelectedGroupId } from './dashboard.js';

const RESOURCE_ID = 400730713;
const TEMPLATE_ID = 30;

// Variable para almacenar la instancia del gráfico
let currentChart = null;

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

    // Destruir el gráfico existente si hay uno
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }

    if (globalSelectedGroupId) {
        console.log("ESPERA DE coso");
    } else {
        console.log("Esperando a que se seleccione un grupo...");
        document.addEventListener('groupSelected', () => {
            executeBateriaReport(wialonSession, globalSelectedGroupId);
        });
    }

    // Añadir un listener para el evento de cambio de grupo
    document.addEventListener('groupSelected', () => {
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }
        console.log("EVENTlistener para el evento de cambio de grupo");

    });
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
                if (typeof row.c !== "undefined") {
                    processedData.push(row.c);
                }
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
            reportData: [data],
            templateId: TEMPLATE_ID,
            resourceId: RESOURCE_ID
        }),
    })
    .then(response => {
        console.log("Respuesta recibida de batería:", response.url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(responseData => {
        console.log("Datos de batería recibidos del backend:", JSON.stringify(responseData, null, 2));
        if (responseData && typeof responseData === 'object') {
            renderBateriaPieChart(responseData);
        } else {
            console.error("Los datos recibidos no tienen el formato esperado:", responseData);
            throw new Error('Formato de datos incorrecto');
        }
    })
    .catch((error) => {
        console.error('Error al enviar datos de batería al backend:', error);
    });
}

function renderBateriaPieChart(data) {
    console.log("Renderizando el gráfico de batería con los datos:", JSON.stringify(data, null, 2));

    if (!data || !data.ranges) {
        console.error("Los datos no contienen la propiedad 'ranges':", data);
        document.getElementById('bateriaSummary').innerHTML = '<p>Error: No se pudieron cargar los datos de batería.</p>';
        return;
    }

    const ranges = data.ranges;
    const rangeValues = ['80-100', '60-80', '40-60', '20-40', '0-20'];

    // Verificar si todas las propiedades esperadas están presentes
    const missingRanges = rangeValues.filter(range => !(range in ranges));
    if (missingRanges.length > 0) {
        console.error("Faltan los siguientes rangos en los datos:", missingRanges);
        document.getElementById('bateriaSummary').innerHTML = '<p>Error: Datos de batería incompletos.</p>';
        return;
    }

    const ctx = document.getElementById('bateriaPieChart');
    if (!ctx) {
        console.error("No se pudo encontrar el elemento canvas para el gráfico de batería");
        return;
    }

    // Destruir el gráfico existente si hay uno
    if (currentChart) {
        currentChart.destroy();
    }

    // Crear el nuevo gráfico
    currentChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: rangeValues,
            datasets: [{
                data: rangeValues.map(range => ranges[range]),
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

    const totalUnits = Object.values(ranges).reduce((a, b) => a + b, 0);
    
    document.getElementById('bateriaSummary').innerHTML = `
        <p>Total de unidades: ${totalUnits}</p>
        <p>Unidades con batería crítica: ${data.unidades_criticas ? data.unidades_criticas.length : 'N/A'}</p>
    `;
}