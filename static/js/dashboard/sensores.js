export function initSensorGraph(graphElement, wialonSession) {
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
    loadUnitsForGraph(wialonSession);
}

function loadUnitsForGraph(wialonSession) {
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
        unitSelect.addEventListener('change', function() {
            loadSensorsForGraph(wialonSession);
        });
    });
}

function loadSensorsForGraph(wialonSession) {
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
    sensorSelect.addEventListener('change', function() {
        updateSensorValue(wialonSession);
    });
}

function updateSensorValue(wialonSession) {
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