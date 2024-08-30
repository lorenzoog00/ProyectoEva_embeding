import { initWialon, getWialonSession } from '../loginWialon.js';

// Variable global para el ID del grupo seleccionado
export let globalSelectedGroupId = null;

// Variables para almacenar las funciones de inicialización de los gráficos
let initSensorGraph, initGeocercaGraph, initBateriaPieGraph, initConexionGraph;

document.addEventListener('DOMContentLoaded', async function() {
    console.log("DOMContentLoaded event fired");

    try {
        // Importar las funciones de inicialización
        const sensorModule = await import('./sensores.js');
        const conexionModule = await import('./conexion_analisis.js');
        const geocercaModule = await import('./geocerca_salidas.js');
        const bateriaModule = await import('./bateriaPie.js');

        // Asignar las funciones importadas a las variables
        initSensorGraph = sensorModule.initSensorGraph;
        initConexionGraph = conexionModule.initConexionGraph;
        initGeocercaGraph = geocercaModule.initGeocercaGraph;
        initBateriaPieGraph = bateriaModule.initBateriaPieGraph;

        console.log("Módulos importados correctamente");

        await initializeAndLoadGraphs();
    } catch (error) {
        console.error("Error during module import or initialization:", error);
    }
});

async function initializeAndLoadGraphs() {
    try {
        await initWialon();
        console.log("Wialon initialized successfully");
        const sess = getWialonSession();
        if (!sess) {
            throw new Error("No se pudo obtener la sesión de Wialon");
        }
        sess.loadLibrary("resourceReports");
        await initializeGlobalGroupSelector();
        getActiveGraphs();
    } catch (error) {
        console.error("Error initializing Wialon:", error);
    }
}

async function initializeGlobalGroupSelector() {
    console.log("Iniciando inicialización del selector de grupos global");
    const sess = getWialonSession();
    if (!sess) {
        console.error("No se pudo obtener la sesión de Wialon");
        return;
    }
    console.log("Sesión de Wialon obtenida");

    try {
        await new Promise((resolve, reject) => {
            sess.updateDataFlags(
                [{type: "type", data: "avl_unit_group", flags: wialon.item.Item.dataFlag.base, mode: 0}],
                function (error) {
                    if (error) {
                        console.error("Error al actualizar flags de datos:", error);
                        reject(error);
                    } else {
                        resolve();
                    }
                }
            );
        });

        const groups = sess.getItems("avl_unit_group");
        console.log("Grupos obtenidos:", groups);

        const groupSelect = document.getElementById('globalUnitGroupSelect');
        if (!groupSelect) {
            console.error("No se encontró el elemento #globalUnitGroupSelect");
            return;
        }

        // Limpiar opciones existentes
        groupSelect.innerHTML = '<option value="">Seleccione un grupo</option>';

        groups.forEach(function(group) {
            const option = document.createElement('option');
            option.value = group.getId();
            option.textContent = group.getName();
            groupSelect.appendChild(option);
        });
        console.log("Opciones de grupo añadidas al selector");

        groupSelect.addEventListener('change', function() {
            globalSelectedGroupId = this.value;
            console.log("Nuevo grupo seleccionado:", globalSelectedGroupId);
            getActiveGraphs(); // Actualizar gráficos cuando cambie la selección
        });
        console.log("Event listener para cambio de grupo añadido");

    } catch (error) {
        console.error("Error al inicializar el selector de grupos:", error);
    }
}

function getActiveGraphs() {
    console.log("getActiveGraphs called");
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
    const sess = getWialonSession();
    if (!sess) {
        console.error("No se pudo obtener la sesión de Wialon en updateDashboard");
        return;
    }

    const dynamicPositions = ['dynamic-1-2', 'dynamic-1-3', 'dynamic-2-1', 'dynamic-2-2', 'dynamic-2-3'];
    
    dynamicPositions.forEach(position => {
        const element = document.getElementById(position);
        if (element) {
            element.style.display = 'none';
        }
    });

    activeGraphs.forEach((graph, index) => {
        if (index < dynamicPositions.length) {
            const positionId = dynamicPositions[index];
            const graphElement = document.getElementById(positionId);
            if (graphElement) {
                graphElement.style.display = 'block';
                graphElement.innerHTML = '';

                switch(graph) {
                    case "Consulta de sensor":
                        initSensorGraph(graphElement, sess, globalSelectedGroupId);
                        break;
                    case "Geocercas":
                        initGeocercaGraph(graphElement, sess, globalSelectedGroupId);
                        break;
                    case "Conexion":
                        initConexionGraph(graphElement, sess, globalSelectedGroupId);
                        break;
                    case "Batería":
                        initBateriaPieGraph(graphElement, sess, globalSelectedGroupId);
                        break;
                    default:
                        graphElement.innerHTML = `
                            <h2>${graph}</h2>
                            <p class="placeholder-text">Gráfica activa: ${graph}</p>
                        `;
                }
            }
        }
    });
}