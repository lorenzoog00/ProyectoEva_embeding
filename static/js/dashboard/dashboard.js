document.addEventListener('DOMContentLoaded', function() {
    let wialonSession = null;
    const RESOURCE_ID = 400730710;  // Nuevo ID de recurso
    const TEMPLATE_ID = 1;  // Nuevo ID de template

    function initWialon() {
        return new Promise((resolve, reject) => {
            wialon.core.Session.getInstance().initSession("https://hst-api.wialon.com");
            wialon.core.Session.getInstance().loginToken("41454459d97f26fb5c2f8815b477a7540BCA916D521D71CFC64825C2F2C3132535C4FAA0", "", function (code) {
                if (code) {
                    console.error(wialon.core.Errors.getErrorText(code));
                    reject(new Error(wialon.core.Errors.getErrorText(code)));
                } else {
                    console.log("Logged successfully to Wialon");
                    wialonSession = wialon.core.Session.getInstance();
                    resolve(wialonSession);
                }
            });
        });
    }

    function getActiveGraphs() {
        fetch('/api/active-graphs')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(activeGraphs => {
                console.log('Gráficas activas:', activeGraphs);
                updateDashboard(activeGraphs);
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }

    function updateDashboard(activeGraphs) {
        const dynamicPositions = ['dynamic-1-3', 'dynamic-2-1', 'dynamic-2-2', 'dynamic-2-3'];
        
        // Ocultar todos los elementos dinámicos
        dynamicPositions.forEach(position => {
            document.getElementById(position).style.display = 'none';
        });

        // Mostrar y actualizar solo las gráficas activas
        activeGraphs.forEach((graph, index) => {
            if (index < dynamicPositions.length) {
                const positionId = dynamicPositions[index];
                const graphElement = document.getElementById(positionId);
                graphElement.style.display = 'block';
                graphElement.innerHTML = ''; // Limpiar contenido previo

                if (graph === "Consulta de sensor") {
                    graphElement.innerHTML = `
                        <h2>Consulta de sensor</h2>
                        <div id="sensor-controls">
                            <select id="units">
                                <option value="">Selecciona una unidad</option>
                            </select>
                            <select id="sensors">
                                <option value="">Selecciona un sensor</option>
                            </select>
                        </div>
                        <div id="sensor-value">
                            <span class="placeholder">Selecciona una unidad y un sensor</span>
                        </div>
                    `;
                    loadUnitsForGraph();
                } else if (graph === "Geocercas") {
                    graphElement.innerHTML = `
                        <h2>Salidas de geocerca por unidad</h2>
                        <select id="unitGroupSelect">
                            <option value="">Seleccione un grupo</option>
                        </select>
                        <div id="geocercaTableContainer">Cargando datos de geocercas...</div>
                    `;
                    initGeocercaAnalysis();
                } else {
                    graphElement.innerHTML = `
                        <h2>${graph}</h2>
                        <p class="placeholder-text">Gráfica activa: ${graph}</p>
                    `;
                }
            }
        });
    }

    function loadUnitsForGraph() {
        var flags = wialon.item.Item.dataFlag.base | wialon.item.Unit.dataFlag.sensors | wialon.item.Unit.dataFlag.lastMessage;
        wialonSession.loadLibrary("unitSensors");
        wialonSession.updateDataFlags([{type: "type", data: "avl_unit", flags: flags, mode: 0}], function (code) {
            if (code) {
                console.error(wialon.core.Errors.getErrorText(code));
                return;
            }
            var units = wialonSession.getItems("avl_unit");
            if (!units || !units.length) {
                console.error("No units found");
                return;
            }
            var unitSelect = document.getElementById("units");
            units.forEach(unit => {
                unitSelect.innerHTML += `<option value="${unit.getId()}">${unit.getName()}</option>`;
            });
            unitSelect.addEventListener('change', loadSensorsForGraph);
        });
    }

    function loadSensorsForGraph() {
        var unitId = document.getElementById("units").value;
        if (!unitId) {
            console.error("No unit selected");
            return;
        }
        var unit = wialonSession.getItem(unitId);
        var sensors = unit.getSensors();
        var sensorSelect = document.getElementById("sensors");
        sensorSelect.innerHTML = "<option value=''>Selecciona un sensor</option>";
        for (var i in sensors) {
            sensorSelect.innerHTML += `<option value="${sensors[i].id}">${sensors[i].n}</option>`;
        }
        sensorSelect.addEventListener('change', updateSensorValue);
    }

    function updateSensorValue() {
        var unitId = document.getElementById("units").value;
        var sensorId = document.getElementById("sensors").value;
        if (!unitId || !sensorId) return;
        var unit = wialonSession.getItem(unitId);
        var sensor = unit.getSensor(sensorId);
        var result = unit.calculateSensorValue(sensor, unit.getLastMessage());
        var sensorValueElement = document.getElementById("sensor-value");
        if (result == -348201.3876) {
            sensorValueElement.innerHTML = `<span class="no-data">Sin datos</span>`;
        } else {
            sensorValueElement.innerHTML = `
                <span class="value">${result}</span>
                <span class="unit">${sensor.m}</span>
            `;
        }
    }

    // Funciones para el análisis de geocercas
    function initGeocercaAnalysis() {
        loadUnitGroups();
    }

    function loadUnitGroups() {
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
                        executeGeocercaReport(this.value);
                    }
                });

                // Ejecutar automáticamente para el primer grupo
                if (groups.length > 0) {
                    console.log("Ejecutando para el primer grupo: " + groups[0].getId());
                    executeGeocercaReport(groups[0].getId());
                }
            }
        );
    }

    function executeGeocercaReport(groupId) {
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
            if(code){ console.error("Error al ejecutar el informe: " + wialon.core.Errors.getErrorText(code)); return; }
            if(!data.getTables().length){
                console.log("No se generaron datos en el reporte");
                return;
            }
            console.log("Reporte ejecutado exitosamente. Procesando datos...");
            processGeocercaData(data);
        });
    }

    function processGeocercaData(reportData) {
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
                    sendDataToBackend({headers: table.header, rows: processedData});
                }
            });
        });
    }

    function sendDataToBackend(data) {
        console.log("Enviando datos al backend...");
        fetch('/geocerca_analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => response.json())
        .then(data => {
            if (data.table_html) {
                console.log("Datos recibidos del backend. Actualizando tabla...");
                updateGeocercaTable(data.table_html);
            } else {
                console.error('No se recibió el HTML de la tabla del backend');
            }
        })
        .catch((error) => {
            console.error('Error al enviar datos al backend: ' + error);
        });
    }

    function updateGeocercaTable(tableHtml) {
        const tableContainer = document.getElementById('geocercaTableContainer');
        if (tableContainer) {
            tableContainer.innerHTML = tableHtml;
            console.log("Tabla de geocercas actualizada");
        } else {
            console.error("Error: No se encontró el contenedor de la tabla de geocercas");
        }
    }

    // Inicializar Wialon y luego cargar las gráficas activas
    initWialon()
        .then(() => {
            getActiveGraphs();
        })
        .catch(error => {
            console.error("Error initializing Wialon:", error);
        });

    // Ejecutar el análisis de geocercas cada 5 minutos
    setInterval(function() {
        var selectedGroupId = $("#unitGroupSelect").val();
        if (selectedGroupId) {
            console.log("Actualizando datos de geocercas...");
            executeGeocercaReport(selectedGroupId);
        }
    }, 300000);  // 300000 ms = 5 minutos
});