document.addEventListener('DOMContentLoaded', function() {
    let wialonSession = null;

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
                        <div id="geocercaChartContainer"></div>
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

    // Inicializar Wialon y luego cargar las gráficas activas
    initWialon()
        .then(() => {
            getActiveGraphs();
        })
        .catch(error => {
            console.error("Error initializing Wialon:", error);
        });
});