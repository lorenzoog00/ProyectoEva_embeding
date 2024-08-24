const RESOURCE_ID = 400730713;
const TEMPLATE_ID = 30;

export function initBateriaPieGraph(graphElement, wialonSession) {
    graphElement.innerHTML = `
        <div class="bateria-container">
            <h2 class="bateria-title">Estado de Batería por Unidad</h2>
            <div class="bateria-select-container">
                <select id="unitGroupSelect" class="bateria-select">
                    <option value="">Seleccione un grupo</option>
                </select>
            </div>
            <div id="bateriaPieChartContainer">
                <canvas id="bateriaPieChart" width="150" height="150"></canvas>
            </div>
            <div id="bateriaSummary" class="bateria-summary"></div>
            <div id="bateriaCritica" class="bateria-critica"></div>
            <a href="/bateria_deep_analysis" class="bateria-link">Para más información, haga clic aquí</a>
        </div>
    `;
    initializeGroupSelector(wialonSession);
}

function initializeGroupSelector(wialonSession) {
    var sess = wialonSession;
    sess.loadLibrary("resourceReports");
    
    var groups = sess.getItems("avl_unit_group");
    var $groupSelect = $("#unitGroupSelect");
    groups.forEach(function(group) {
        $groupSelect.append($("<option>").val(group.getId()).text(group.getName()));
    });

    $groupSelect.on('change', function() {
        var selectedGroupId = $(this).val();
        if (selectedGroupId) {
            executeBateriaReport(sess, selectedGroupId);
        }
    });
}

function executeBateriaReport(wialonSession, groupId) {
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
    var oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    var from = Math.floor(oneDayAgo.getTime() / 1000);
    var to = Math.floor(now.getTime() / 1000);

    var interval = { "from": from, "to": to, "flags": wialon.item.MReport.intervalFlag.absolute };

    console.log("Ejecutando reporte desde", new Date(from * 1000), "hasta", new Date(to * 1000));

    res.execReport(template, groupId, 0, interval, function(code, data) {
        if (code) { 
            console.error("Error al ejecutar el informe: " + wialon.core.Errors.getErrorText(code));
            return; 
        }
        if (!data.getTables().length) {
            console.log("No se generaron datos en el reporte");
            return;
        }
        processBateriaData(data);
    });
}

function processBateriaData(reportData) {
    var tables = reportData.getTables();
    var processedData = [];

    if (!tables || tables.length === 0) {
        console.warn("No se encontraron tablas en el reporte.");
        return;
    }

    tables.forEach(function(table, index) {
        reportData.getTableRows(index, 0, table.rows, function(code, rows) {
            if (code) {
                console.error("Error al obtener filas de la tabla: " + wialon.core.Errors.getErrorText(code));
                return;
            }

            if (!rows || rows.length === 0) {
                console.warn("No se encontraron filas en la tabla " + (index + 1));
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
    fetch('/bateria_analysis', {
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
        renderBateriaPieChart(responseData);
    })
    .catch((error) => {
        console.error('Error al enviar datos al backend:', error);
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
    document.getElementById('bateriaCritica').innerHTML = `
    <p>Unidades críticas (0% - 20%): ${data.unidades_criticas.join(', ')}</p>
`;

}