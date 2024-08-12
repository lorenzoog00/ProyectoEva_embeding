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
            const groupSelect = document.getElementById('unitGroupSelect');
            groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.getId();
                option.text = group.getName();
                groupSelect.appendChild(option);
            });

            document.getElementById('analyzeBtn').addEventListener('click', () => {
                const selectedGroupId = groupSelect.value;
                if (selectedGroupId) {
                    executeGeocercaReport(selectedGroupId, wialonSession);
                } else {
                    alert("Por favor, seleccione un grupo de unidades para analizar.");
                }
            });
        }
    );
}
function updateDateRangeTitle(startDate, endDate) {
    const dateRangeTitle = document.getElementById('date-range-title');
    const options = { year: 'numeric', month: 'long', day: 'numeric' };

    const formattedStartDate = startDate.toLocaleDateString('es-ES', options);
    const formattedEndDate = endDate.toLocaleDateString('es-ES', options);

    dateRangeTitle.innerHTML = `<h3>De ${formattedStartDate} hasta ${formattedEndDate}</h3>`;
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
        renderJSONResults(responseData.summary);  // Renderiza los resultados en el frontend
    })
    .catch((error) => {
        console.error('Error al enviar datos al backend para análisis profundo:', error);
    });
}

function renderJSONResults(summary) {
    const resultsDiv = document.getElementById('geocerca-deep-results');
    
    // Limpia cualquier contenido previo
    resultsDiv.innerHTML = '';

    // Verifica si el resumen tiene datos
    if (summary.length === 0) {
        resultsDiv.innerHTML = '<p>No hay datos para mostrar.</p>';
        return;
    }

    // Crea la tabla HTML
    let htmlContent = '<table><thead><tr><th>Unidad</th><th>Salidas este mes</th><th>Dentro de geocerca</th><th>Promedio salidas/día</th></tr></thead><tbody>';
    
    // Itera sobre los elementos del resumen para crear las filas de la tabla
    summary.forEach(item => {
        htmlContent += `<tr>
                            <td>${item.Unidad}</td>
                            <td>${item['Salidas este mes']}</td>
                            <td>${item['Dentro de geocerca']}</td>
                            <td>${item['Promedio salidas/día']}</td>
                        </tr>`;
    });

    htmlContent += '</tbody></table>';

    // Inserta la tabla en el div
    resultsDiv.innerHTML = htmlContent;
}

initGeocercaDeepAnalysis();
