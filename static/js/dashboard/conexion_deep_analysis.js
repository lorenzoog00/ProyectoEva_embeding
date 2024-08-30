import { initWialon, getWialonSession } from '../loginWialon.js';

const RESOURCE_ID = 400730713;
const TEMPLATE_ID = 40;  // Asegúrate de que este es el ID correcto para el reporte de conexión

console.log("conexion_deep_analysis.js cargado");

export async function initConexionDeepAnalysis() {
    console.log("Iniciando análisis profundo de conexión");
    try {
        await initWialon();
        const wialonSession = getWialonSession();
        if (!wialonSession) {
            throw new Error("No se pudo obtener la sesión de Wialon");
        }
        console.log("Sesión de Wialon inicializada exitosamente");
        loadResources(wialonSession);
        initializeFlatpickr();
    } catch (error) {
        console.error("Error al inicializar Wialon:", error);
    }
}
function initializeFlatpickr() {
    const config = {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        locale: "es",
        time_24hr: true,
        maxDate: "today"
    };

    flatpickr("#startDateTime", config);
    flatpickr("#endDateTime", config);
}
function loadResources(wialonSession) {
    console.log("Cargando recursos...");
    const res_flags = wialon.item.Item.dataFlag.base | wialon.item.Resource.dataFlag.reports;
    const group_flags = wialon.item.Item.dataFlag.base;
    
    wialonSession.loadLibrary("resourceReports");
    wialonSession.updateDataFlags(
        [
            {type: "type", data: "avl_resource", flags: res_flags, mode: 0},
            {type: "type", data: "avl_unit_group", flags: group_flags, mode: 0}
        ],
        function (code) {
            if (code) { 
                console.error("Error al actualizar banderas de datos: " + wialon.core.Errors.getErrorText(code)); 
                return; 
            }

            const groups = wialonSession.getItems("avl_unit_group");
            if (!groups || !groups.length){ 
                console.error("No se encontraron grupos de unidades"); 
                return; 
            }
            
            console.log(`Se encontraron ${groups.length} grupos de unidades`);
            const groupSelect = document.getElementById('unitGroupSelect');
            groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.getId();
                option.text = group.getName();
                groupSelect.appendChild(option);
            });

            document.getElementById('analyzeBtn').addEventListener('click', () => {
                const selectedGroupId = document.getElementById('unitGroupSelect').value;
                const startDate = document.getElementById('startDateTime').value;
                const endDate = document.getElementById('endDateTime').value;
                if (selectedGroupId && startDate && endDate) {
                    executeConexionReport(selectedGroupId, startDate, endDate, wialonSession);
                } else {
                    alert("Por favor, seleccione un grupo de unidades y especifique las fechas para analizar.");
                }
            });
        }
    );
}

function executeConexionReport(groupId, startDate, endDate, wialonSession) {
    console.log("Ejecutando reporte de conexión para el grupo: " + groupId);

    const res = wialonSession.getItem(RESOURCE_ID);
    if (!res) {
        console.error("No se pudo encontrar el recurso con ID " + RESOURCE_ID);
        return;
    }

    const template = res.getReport(TEMPLATE_ID);
    if (!template) {
        console.error("No se pudo encontrar la plantilla con ID " + TEMPLATE_ID);
        return;
    }

    const from = Math.floor(new Date(startDate).getTime() / 1000);
    const to = Math.floor(new Date(endDate).getTime() / 1000);

    const interval = { "from": from, "to": to, "flags": wialon.item.MReport.intervalFlag.absolute };

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
        processConexionData(data, wialonSession, groupId, from, to);
    });
}

function processConexionData(reportData, wialonSession, groupId, from, to) {
    const tables = reportData.getTables();
    const processedData = [];

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
            
            const tableData = {
                groupId: groupId,
                tableName: table.label,
                headers: table.header,
                rows: rows.map(row => row.c)
            };
            
            processedData.push(tableData);
            
            // Si es la última tabla, enviar todos los datos al backend
            if (index === tables.length - 1) {
                sendDataToBackend(processedData, from, to);
            }
        });
    });
}

function sendDataToBackend(data, from, to) {
    console.log("Enviando datos al backend para análisis profundo...");
    fetch('/conexion_deep_analysis', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'deep_analysis',
            reportData: data,
            timeInterval: { from, to }
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(responseData => {
        console.log("Respuesta del backend (análisis profundo):", responseData);
        renderSummaryTable(responseData.summary_data);
        renderDetailedTable(responseData.detailed_data);
    })
    .catch((error) => {
        console.error('Error al enviar datos al backend para análisis profundo:', error);
    });
}

function renderSummaryTable(summaryData) {
    const table = createTable(['Unidad', 'Estado', 'Número de desconexiones']);
    const tbody = table.querySelector('tbody');
    summaryData.forEach(item => {
        const row = tbody.insertRow();
        row.classList.add(item.Clase);
        row.insertCell().textContent = item.Unidad;
        const estadoCell = row.insertCell();
        estadoCell.textContent = item.Estado;
        estadoCell.classList.add(item.Clase);
        row.insertCell().textContent = item.Apariciones;
    });
    const summaryDiv = document.getElementById('conexion-summary-results');
    summaryDiv.innerHTML = '<h2>Resumen de Conexiones</h2>';
    summaryDiv.appendChild(table);
}

function renderDetailedTable(detailedData) {
    const table = createTable(['Unidad', 'Comienzo', 'Fin', 'Duración', 'Ubicación', 'Estado']);
    const tbody = table.querySelector('tbody');
    detailedData.forEach(item => {
        const row = tbody.insertRow();
        row.insertCell().textContent = item.Unidad;
        row.insertCell().textContent = item.Comienzo;
        row.insertCell().textContent = item.Fin;
        row.insertCell().textContent = item.Duración;
        row.insertCell().textContent = item.Ubicación;
        const estadoCell = row.insertCell();
        estadoCell.textContent = item.Estado;
        estadoCell.classList.add(item.Clase);
    });
    const detailedDiv = document.getElementById('conexion-detailed-results');
    detailedDiv.innerHTML = '<h2>Detalles de Conexiones</h2>';
    detailedDiv.appendChild(table);
}

function createTable(headers) {
    const table = document.createElement('table');
    table.className = 'conexion-table';
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    table.createTBody();
    return table;
}

initConexionDeepAnalysis();