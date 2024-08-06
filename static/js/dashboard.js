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
                // Manejar el error aquí, por ejemplo, mostrar un mensaje al usuario
            });
    }

    function updateDashboard(activeGraphs) {
        const dashboardGrid = document.querySelector('.dashboard-grid');
        
        document.querySelectorAll('.dashboard-item.dynamic').forEach(el => {
            el.style.display = 'none';
        });
    
        activeGraphs.forEach((graph) => {
            const graphElement = document.getElementById(`graph-${graph.toLowerCase().replace(/\s+/g, '-')}`);
            if (graphElement) {
                graphElement.style.display = 'block';
                if (graph === "Consulta de sensor") {
                    loadUnitsForGraph();
                } else {
                    graphElement.innerHTML = `
                        <h2>${graph}</h2>
                        <p class="placeholder-text">Gráfica activa: ${graph}</p>
                    `;
                }
            }
        });

        // Asegurar que siempre haya 6 elementos visibles en total (3x2 grid)
        const visibleItems = document.querySelectorAll('.dashboard-item:not([style*="display: none"])');
        const totalItems = visibleItems.length;
        for (let i = totalItems; i < 6; i++) {
            const emptyElement = document.createElement('div');
            emptyElement.className = 'dashboard-item empty';
            dashboardGrid.appendChild(emptyElement);
        }
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
            unitSelect.innerHTML = "<option value=''>Selecciona una unidad</option>";
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
        if (result == -348201.3876) result = "N/A";
        document.getElementById("sensor-value").innerHTML = `${result} ${sensor.m}`;
        // Eliminamos cualquier código relacionado con la actualización de un gráfico
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