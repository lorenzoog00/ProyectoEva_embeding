document.addEventListener('DOMContentLoaded', function() {
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
        
        // Eliminar gráficas dinámicas existentes
        document.querySelectorAll('.dashboard-item:not(#consulta-button):not(#analisis-button)').forEach(el => el.remove());

        // Añadir las gráficas activas
        activeGraphs.forEach((graph, index) => {
            const graphElement = document.createElement('div');
            graphElement.className = 'dashboard-item';
            graphElement.innerHTML = `
                <h2>${graph}</h2>
                <p>Gráfica de ${graph} se renderizará aquí</p>
            `;
            dashboardGrid.appendChild(graphElement);
        });

        // Asegurar que siempre haya 6 elementos en total (3x2 grid)
        const totalItems = dashboardGrid.children.length;
        for (let i = totalItems; i < 6; i++) {
            const emptyElement = document.createElement('div');
            emptyElement.className = 'dashboard-item empty';
            dashboardGrid.appendChild(emptyElement);
        }
    }

    // Llamar a getActiveGraphs cuando se carga la página
    getActiveGraphs();
});