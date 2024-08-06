# Definir los archivos permitidos por cada plan
FILES_BY_PLAN = {
    'Bronce': [
        'Conductores.txt',
        'Dashboard.txt',
        'EVA.txt',
        'Geocercas.txt'
    ],
    'Plata': [
        'Conductores y remolques.txt',
        'Dashboard.txt',
        'Geocercas.txt',
        'Herramientas.txt',
        'Recorridos.txt',
        'EVA.txt',
        'Remolques.txt',
        'Informes.txt',
        'Introducción a la plataforma.txt'
    ],
    'Oro': None  # Todos los archivos disponibles
}

# Definir el orden deseado de los archivos
ORDERED_FILES = [
    'Dashboard.txt',
    'Seguimiento.txt',
    'Recorridos.txt',
    'Mensajes.txt',
    'Informes.txt',
    'Geocercas.txt',
    'Rutas.txt',
    'Conductores.txt',
    'Remolques.txt',
    'Tareas.txt',
    'Notificaciones.txt',
    'Usuarios.txt',
    'Unidades.txt',
    'EVA.txt',
    'Herramientas.txt',
    'Introducción a la plataforma.txt'
]

# Definir la información adicional para cada archivo
TOOLTIPS = {
    'Dashboard.txt': 'Información sobre el Dashboard.',
    'Seguimiento.txt': 'Información sobre Seguimiento.',
    'Recorridos.txt': 'Información sobre Recorridos.',
    'Mensajes.txt': 'Información sobre Mensajes.',
    'Informes.txt': 'Información sobre Informes.',
    'Geocercas.txt': 'Información sobre Geocercas.',
    'Rutas.txt': 'Información sobre Rutas.',
    'Conductores.txt': 'Información sobre Conductores.',
    'Remolques.txt': 'Información sobre Remolques.',
    'Tareas.txt': 'Información sobre Tareas.',
    'Notificaciones.txt': 'Información sobre Notificaciones.',
    'Usuarios.txt': 'Información sobre Usuarios.',
    'Unidades.txt': 'Información sobre Unidades.',
    'Herramientas.txt': 'Información sobre Herramientas.',
    'Introducción a la plataforma.txt': 'Información sobre Introducción a la plataforma.',
    'EVA.txt': 'Guía detallada sobre cómo usar EVA, tu asistente personal con IA.'
}