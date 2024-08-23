import { initWialon, getWialonSession } from '../loginWialon.js';

document.addEventListener('DOMContentLoaded', async function() {
    console.log("DOMContentLoaded event fired");

    try {
        const { initSensorGraph } = await import('./sensores.js');
        const { initGeocercaGraph } = await import('./geocerca_salidas.js');
        const { initBateriaPieGraph } = await import('./bateriaPie.js');
        console.log("Módulos importados correctamente");

        async function initializeAndLoadGraphs() {
            try {
                await initWialon();
                console.log("Wialon initialized successfully");
                getActiveGraphs();
            } catch (error) {
                console.error("Error initializing Wialon:", error);
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
            const dynamicPositions = ['dynamic-1-3', 'dynamic-2-1', 'dynamic-2-2', 'dynamic-2-3'];
            
            dynamicPositions.forEach(position => {
                document.getElementById(position).style.display = 'none';
            });

            activeGraphs.forEach((graph, index) => {
                if (index < dynamicPositions.length) {
                    const positionId = dynamicPositions[index];
                    const graphElement = document.getElementById(positionId);
                    graphElement.style.display = 'block';
                    graphElement.innerHTML = '';

                    if (graph === "Consulta de sensor") {
                        initSensorGraph(graphElement, getWialonSession());
                    } else if (graph === "Geocercas") {
                        initGeocercaGraph(graphElement, getWialonSession());
                    } else if (graph === "Batería") {
                        initBateriaPieGraph(graphElement, getWialonSession());
                    } else {
                        graphElement.innerHTML = `
                            <h2>${graph}</h2>
                            <p class="placeholder-text">Gráfica activa: ${graph}</p>
                        `;
                    }
                }
            });
        }

        // Inicializar Wialon y luego cargar las gráficas activas
        initializeAndLoadGraphs();

    } catch (error) {
        console.error("Error during module import or initialization:", error);
    }
});