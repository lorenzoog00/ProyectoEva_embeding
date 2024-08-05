function initSensores() {
    // Función para imprimir mensajes en el log
    function msg(text) { 
        console.log(text);
        // Puedes agregar aquí lógica para mostrar mensajes en la interfaz si lo deseas
    }

    function init() {
        var sess = wialon.core.Session.getInstance();
        var flags = wialon.item.Item.dataFlag.base |
                    wialon.item.Unit.dataFlag.sensors | 
                    wialon.item.Unit.dataFlag.lastMessage;
        
        sess.loadLibrary("unitSensors");
        sess.updateDataFlags(
            [{type: "type", data: "avl_unit", flags: flags, mode: 0}],
            function (code) {
                if (code) { msg(wialon.core.Errors.getErrorText(code)); return; }
                
                var units = sess.getItems("avl_unit");
                if (!units || !units.length){ msg("No units found"); return; }
                
                var unitsSelect = document.getElementById("units");
                units.forEach(function(unit) {
                    unitsSelect.innerHTML += "<option value='"+ unit.getId() +"'>"+ unit.getName() +"</option>";
                });
        
                getSensors();
                
                document.getElementById("units").addEventListener("change", getSensors);
                document.getElementById("sensors").addEventListener("change", getSensorInfo);
            }
        );
    }

    function getSensors(){
        var unitId = document.getElementById("units").value;
        if(!unitId){ msg("Select unit"); return;}
        
        var sensorsSelect = document.getElementById("sensors");
        sensorsSelect.innerHTML = "<option></option>";
        
        var sess = wialon.core.Session.getInstance();
        var unit = sess.getItem(unitId);
        var sensors = unit.getSensors();
        
        for(var i in sensors)
            sensorsSelect.innerHTML += "<option value='" + sensors[i].id + "'>" + sensors[i].n + "</option>";
    }

    function getSensorInfo(){
        var unitId = document.getElementById("units").value;
        var sensorId = document.getElementById("sensors").value;
        if(!unitId){ msg("Select unit"); return;}
        if(!sensorId) return;
        
        var sess = wialon.core.Session.getInstance();
        var unit = sess.getItem(unitId);
        var sensor = unit.getSensor(sensorId);
        
        var result = unit.calculateSensorValue(sensor, unit.getLastMessage());
        if(result == -348201.3876) result = "N/A";
        
        var sensorValueDiv = document.getElementById("sensor-value");
        sensorValueDiv.innerHTML = "Valor de " + unit.getName() + " <b>'" + sensor.n + "'</b> sensor (" + sensor.t + "): " + result + " (" + sensor.m + ")";
        
        // Aquí puedes agregar lógica para actualizar la gráfica si lo deseas
    }

    msg("Iniciando sesión");
    wialon.core.Session.getInstance().initSession("https://hst-api.wialon.com");
    wialon.core.Session.getInstance().loginToken("41454459d97f26fb5c2f8815b477a7540BCA916D521D71CFC64825C2F2C3132535C4FAA0", "", 
    function (code) {
        if (code){ msg(wialon.core.Errors.getErrorText(code)); return; }
        msg("Sesión iniciada correctamente");
        init();
    });
}

// Esta función se llamará cuando se cargue el contenido de sensores
if (document.readyState === "complete" || document.readyState === "interactive") {
    initSensores();
} else {
    document.addEventListener("DOMContentLoaded", initSensores);
}