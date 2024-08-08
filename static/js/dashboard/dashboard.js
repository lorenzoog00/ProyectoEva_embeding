document.addEventListener('DOMContentLoaded', async function() {
    console.log("DOMContentLoaded event fired");

    let wialonSession = null;
    const RESOURCE_ID = 400730713;
    const TEMPLATE_ID = 36;

    try {
        const { initSensorGraph } = await import('./sensores.js');
        const { initGeocercaGraph } = await import('./geocerca_salidas.js');
        console.log("Módulos importados correctamente");

        function initWialon() {
            return new Promise((resolve, reject) => {
                try {
                    wialon.core.Session.getInstance().initSession("https://hst-api.wialon.com");
                    wialon.core.Session.getInstance().loginToken("41454459d97f26fb5c2f8815b477a7540BCA916D521D71CFC64825C2F2C3132535C4FAA0", "", function (code) {
                        if (code) {
                            console.error("Error de Wialon:", wialon.core.Errors.getErrorText(code));
                            reject(new Error(wialon.core.Errors.getErrorText(code)));
                        } else {
                            console.log("Logged successfully to Wialon");
                            wialonSession = wialon.core.Session.getInstance();
                            resolve(wialonSession);
                        }
                    });
                } catch (error) {
                    console.error("Error al inicializar Wialon:", error);
                    reject(error);
                }
            });
        }
        
        // Uso de initWialon
        async function initializeAndLoadGraphs() {
            try {
                await initWialon();
                console.log("Wialon initialized successfully");
                getActiveGraphs();
            } catch (error) {
                console.error("Error initializing Wialon:", error);
            }
        }
        
        // En el evento DOMContentLoaded
        document.addEventListener('DOMContentLoaded', async function() {
            console.log("DOMContentLoaded event fired");
        
            try {
                const { initSensorGraph } = await import('./sensores.js');
                const { initGeocercaGraph } = await import('./geocerca_salidas.js');
                console.log("Módulos importados correctamente");
        
                // Llamar a la función de inicialización
                initializeAndLoadGraphs();
            } catch (error) {
                console.error("Error during module import or initialization:", error);
            }
        });

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
                    initSensorGraph(graphElement, wialonSession);
                } else if (graph === "Geocercas") {
                    initGeocercaGraph(graphElement, wialonSession);
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
            initWialon()
            .then(() => {
                console.log("Wialon initialized successfully");
                getActiveGraphs();
            })
            .catch(error => {
                console.error("Error initializing Wialon:", error);
            });
    } catch (error) {
        console.error("Error during module import or initialization:", error);
    }
});