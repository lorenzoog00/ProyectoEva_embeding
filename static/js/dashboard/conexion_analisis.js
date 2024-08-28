const RESOURCE_ID = 400730713;
const TEMPLATE_ID = 28;

export function initConexionGraph(graphElement, wialonSession) {
    graphElement.innerHTML = `
        <div class="conexion-container">
            <h2 class="conexion-title">Análisis de Conexión por Unidad (Últimas 24 horas)</h2>
            <div id="conexionContent" class="conexion-content">
                <div class="conexion-stat">
                    <h3>Sin conexión ahora mismo</h3>
                    <span id="sin-conexion" class="conexion-value">-</span>
                </div>
                <div class="conexion-stat">
                    <h3>Recientemente desconectado</h3>
                    <span id="recientemente-desconectado" class="conexion-value">-</span>
                </div>
                <div class="conexion-stat">
                    <h3>Promedio de tiempo sin conexión</h3>
                    <span id="avg-conexion" class="conexion-value">-</span>
                </div>
            </div>
            <a href="/conexion_deep_analysis" id="moreInfoLink" class="conexion-link">Para más información, haga clic aquí</a>
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
            executeConexionReport(sess, selectedGroupId);
        }
    });
}

function executeConexionReport(wialonSession, groupId) {
    console.log("Ejecutando reporte de conexión para el grupo:", groupId);

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
    var to = Math.floor(now.getTime() / 1000) - 60; // Un minuto atrás
    var from = to - 24 * 60 * 60; // 24 horas antes de 'to'

    var interval = { "from": from, "to": to, "flags": wialon.item.MReport.intervalFlag.absolute };

    console.log("Ejecutando reporte con intervalo: " + new Date(from * 1000) + " a " + new Date(to * 1000));
    res.execReport(template, groupId, 0, interval, function(code, data) {
        if (code) { 
            console.error("Error al ejecutar el informe: " + wialon.core.Errors.getErrorText(code)); 
            return; 
        }
        if (!data.getTables().length) {
            console.log("No se generaron datos en el reporte");
            return;
        }
        console.log("Reporte ejecutado exitosamente. Procesando datos...");
        processConexionData(data, wialonSession);
    });
}

function processConexionData(reportData, wialonSession) {
    var tables = reportData.getTables();
    var processedData = [];

    if (!tables || tables.length === 0) {
        console.warn("No se encontraron tablas en el reporte.");
        return;
    }

    console.log("Número de tablas a procesar: " + tables.length);

    tables.forEach(function(table, index) {
        console.log("Procesando tabla " + (index + 1) + " de " + tables.length);

        reportData.getTableRows(index, 0, table.rows, function(code, rows) {
            if (code) {
                console.error("Error al obtener filas de la tabla: " + wialon.core.Errors.getErrorText(code));
                return;
            }

            if (!rows || rows.length === 0) {
                console.warn("No se encontraron filas en la tabla " + (index + 1));
                return;
            }

            console.log("Número de filas obtenidas: " + rows.length);
            
            // Procesar cada fila
            rows.forEach(function(row, rowIndex) {
                if (typeof row.c === "undefined") return;
                console.log("Procesando fila " + (rowIndex + 1) + " de " + rows.length);
                processedData.push(row.c);  // Almacenar los datos procesados
            });
            
            // Enviar los datos al backend una vez que todo esté procesado
            sendDataToBackend({ headers: table.header, rows: processedData }, wialonSession);
        });
    });
}

function sendDataToBackend(data, wialonSession) {
    console.log("Enviando datos al backend...");
    fetch('/conexion_analysis', {
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
        console.log("Datos recibidos del backend:", responseData);
        updateConexionInfo(responseData);
    })
    .catch((error) => {
        console.error('Error al enviar datos al backend:', error);
    });
}

function updateConexionInfo(data) {
    document.getElementById('sin-conexion').textContent = data.sin_conexion.join(', ');
    document.getElementById('recientemente-desconectado').textContent = data.recientemente_desconectado.join(', ');
    document.getElementById('avg-conexion').textContent = data.promedio_duracion;
}