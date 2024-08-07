const RESOURCE_ID = 400730713;
const TEMPLATE_ID = 36;

function initGeocercaAnalysis() {
    loadUnitGroups();
}

function loadUnitGroups() {
    var sess = wialon.core.Session.getInstance();
    var flags = wialon.item.Item.dataFlag.base;
    
    sess.updateDataFlags(
        [{type: "type", data: "avl_unit_group", flags: flags, mode: 0}],
        function (code) {
            if (code) { console.error(wialon.core.Errors.getErrorText(code)); return; }

            var groups = sess.getItems("avl_unit_group");
            if (!groups || !groups.length){ console.error("No se encontraron grupos de unidades"); return; }
            var $groupSelect = $("#unitGroupSelect");
            $groupSelect.empty().append("<option value=''>Seleccione un grupo</option>");
            groups.forEach(function(group) {
                $groupSelect.append($("<option>").val(group.getId()).text(group.getName()));
            });

            $groupSelect.on('change', function() {
                if (this.value) {
                    executeGeocercaReport(this.value);
                }
            });

            // Ejecutar automáticamente para el primer grupo
            if (groups.length > 0) {
                executeGeocercaReport(groups[0].getId());
            }
        }
    );
}

function executeGeocercaReport(groupId) {
    var sess = wialon.core.Session.getInstance();
    var res = sess.getItem(RESOURCE_ID);
    if (!res) {
        console.error("No se pudo encontrar el recurso con ID " + RESOURCE_ID);
        return;
    }

    var now = new Date();
    var firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    var from = Math.floor(firstDayOfMonth.getTime() / 1000);
    var to = Math.floor(now.getTime() / 1000);

    var interval = { "from": from, "to": to, "flags": wialon.item.MReport.intervalFlag.absolute };
    var template = res.getReport(TEMPLATE_ID);
    if (!template) {
        console.error("No se pudo encontrar la plantilla con ID " + TEMPLATE_ID);
        return;
    }

    res.execReport(template, groupId, 0, interval, function(code, data) {
        if(code){ console.error("Error al ejecutar el informe: " + wialon.core.Errors.getErrorText(code)); return; }
        if(!data.getTables().length){
            console.log("No se generaron datos");
            return;
        }
        processGeocercaData(data);
    });
}

function processGeocercaData(reportData) {
    var tables = reportData.getTables();
    var processedData = [];

    tables.forEach(function(table) {
        reportData.getTableRows(table.index, 0, table.rows, function(code, rows) {
            if (code) { console.error(wialon.core.Errors.getErrorText(code)); return; }
            
            rows.forEach(function(row) {
                processedData.push(row.c);
            });

            // Enviar datos al backend cuando se hayan procesado todas las tablas
            if (processedData.length === reportData.getTableTotalRows()) {
                sendDataToBackend({headers: table.header, rows: processedData});
            }
        });
    });
}

function sendDataToBackend(data) {
    fetch('/geocerca_analysis', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(data => {
        if (data.chart_image) {
            updateGeocercaChart(data.chart_image, data.date_range);
        } else {
            console.error('No se recibió la imagen del gráfico');
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

function updateGeocercaChart(chartImage, dateRange) {
    const chartContainer = document.getElementById('geocercaChartContainer');
    chartContainer.innerHTML = `
        <img src="data:image/png;base64,${chartImage}" alt="Gráfico de salidas de geocerca">
        <p>${dateRange}</p>
    `;
}

// Ejecutar el análisis de geocercas cada 5 minutos
setInterval(function() {
    var selectedGroupId = $("#unitGroupSelect").val();
    if (selectedGroupId) {
        executeGeocercaReport(selectedGroupId);
    }
}, 300000);  // 300000 ms = 5 minutos