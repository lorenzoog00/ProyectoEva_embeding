const RESOURCE_ID = 400730713;
const TEMPLATE_ID = 36;

export function initGeocercaGraph(graphElement, wialonSession) {
    graphElement.innerHTML = `
        <h2>Salidas de geocerca por unidad</h2>
        <select id="unitGroupSelect">
            <option value="">Seleccione un grupo</option>
        </select>
        <div id="geocercaTableContainer">Cargando datos de geocercas...</div>
    `;
    loadUnitGroups(wialonSession);
}

function loadUnitGroups(wialonSession) {
    var flags = wialon.item.Item.dataFlag.base;
    
    wialonSession.loadLibrary("resourceReports");
    wialonSession.updateDataFlags(
        [{type: "type", data: "avl_unit_group", flags: flags, mode: 0}],
        function (code) {
            if (code) { console.error(wialon.core.Errors.getErrorText(code)); return; }

            var groups = wialonSession.getItems("avl_unit_group");
            if (!groups || !groups.length){ console.error("No se encontraron grupos de unidades"); return; }
            console.log("Grupos de unidades encontrados: " + groups.length);
            var $groupSelect = $("#unitGroupSelect");
            $groupSelect.empty().append("<option value=''>Seleccione un grupo</option>");
            groups.forEach(function(group) {
                $groupSelect.append($("<option>").val(group.getId()).text(group.getName()));
            });

            $groupSelect.on('change', function() {
                if (this.value) {
                    console.log("Grupo seleccionado: " + this.value);
                    executeGeocercaReport(this.value, wialonSession);
                }
            });

            // Ejecutar automáticamente para el primer grupo
            if (groups.length > 0) {
                console.log("Ejecutando para el primer grupo: " + groups[0].getId());
                executeGeocercaReport(groups[0].getId(), wialonSession);
            }
        }
    );
}

function executeGeocercaReport(groupId, wialonSession) {
    console.log("Ejecutando reporte de geocerca para el grupo: " + groupId);
    var res = wialonSession.getItem(RESOURCE_ID);
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

    console.log("Ejecutando reporte con intervalo: " + new Date(from*1000) + " a " + new Date(to*1000));
    res.execReport(template, groupId, 0, interval, function(code, data) {
        if(code){ 
            console.error("Error al ejecutar el informe: " + wialon.core.Errors.getErrorText(code)); 
            return; 
        }
        if(!data.getTables().length){
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

    tables.forEach(function(table, index) {
        console.log("Procesando tabla " + (index + 1) + " de " + tables.length);
        reportData.getTableRows(table.index, 0, table.rows, function(code, rows) {
            if (code) { console.error("Error al obtener filas de la tabla: " + wialon.core.Errors.getErrorText(code)); return; }
            
            console.log("Filas obtenidas: " + rows.length);
            rows.forEach(function(row) {
                processedData.push(row.c);
            });

            // Enviar datos al backend cuando se hayan procesado todas las tablas
            if (processedData.length === reportData.getTableTotalRows()) {
                console.log("Todas las filas procesadas. Enviando datos al backend...");
                sendDataToBackend({headers: table.header, rows: processedData}, wialonSession);
            }
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
        console.log("Datos enviados exitosamente al backend");
        if (responseData.table_html) {
            updateGeocercaTable(responseData.table_html, wialonSession);
        } else {
            console.error('No se recibió el HTML de la tabla del backend');
        }
    })
    .catch((error) => {
        console.error('Error al enviar datos al backend:', error);
    });
}

function updateGeocercaTable(tableHtml, wialonSession) {
    const tableContainer = document.getElementById('geocercaTableContainer');
    if (tableContainer) {
        tableContainer.innerHTML = tableHtml;
        console.log("Tabla de geocercas actualizada");
    } else {
        console.error("Error: No se encontró el contenedor de la tabla de geocercas");
    }
}