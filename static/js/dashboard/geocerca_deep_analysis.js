import { initWialon, getWialonSession } from '../loginWialon.js';

const RESOURCE_ID = 400730713;
const TEMPLATE_ID = 38;

console.log("geocerca_deep_analysis.js cargado");

export async function initGeocercaDeepAnalysis() {
    console.log("Iniciando análisis profundo de geocercas");
    try {
        await initWialon();
        const wialonSession = getWialonSession();
        if (!wialonSession) {
            throw new Error("No se pudo obtener la sesión de Wialon");
        }
        console.log("Sesión de Wialon inicializada exitosamente");
        loadResources(wialonSession);
    } catch (error) {
        console.error("Error al inicializar Wialon:", error);
    }
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
            // Ejecutar el análisis para todos los grupos
            groups.forEach(group => executeGeocercaReport(group.getId(), wialonSession));
        }
    );
}

function executeGeocercaReport(groupId, wialonSession) {
    console.log("Ejecutando reporte de geocerca para el grupo: " + groupId);

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

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const from = Math.floor(firstDayOfMonth.getTime() / 1000);
    const to = Math.floor(now.getTime() / 1000);

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
        processGeocercaData(data, wialonSession, groupId);
    });
}

function processGeocercaData(reportData, wialonSession, groupId) {
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
                sendDataToBackend(processedData);
            }
        });
    });
}

function sendDataToBackend(data) {
    console.log("Enviando datos al backend para análisis profundo...");
    fetch('/geocercas_deep_analysis', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'deep_analysis',
            reportData: data
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
        // Aquí puedes procesar la respuesta, actualizar la UI, etc.
    })
    .catch((error) => {
        console.error('Error al enviar datos al backend para análisis profundo:', error);
    });
}

initGeocercaDeepAnalysis();