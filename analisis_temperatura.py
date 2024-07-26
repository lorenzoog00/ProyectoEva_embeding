from flask import Flask, request, jsonify
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.dates import DateFormatter
from matplotlib.lines import Line2D
import io
import numpy as np
import base64
from datetime import datetime

def analisisDeTodos():
    data = request.json
    if data['action'] == 'graficas':
        report_data = data['reportData']
        sensor_elegido = data['sensorElegido']
        
        # Convertir los datos recibidos en un DataFrame
        df = pd.DataFrame(report_data[0]['rows'], columns=report_data[0]['headers'])
        
        # Convertir la columna 'Tiempo' a datetime
        df['Tiempo'] = pd.to_datetime(df['Tiempo'], format='%d.%m.%Y %H:%M:%S')
        
        # Filtrar el DataFrame por el sensor elegido
        df = df[df['Sensor'] == sensor_elegido]
        
        # Ordenar el DataFrame por tiempo
        df = df.sort_values('Tiempo')

        # Usar 'agg.backend_inline' para evitar problemas con hilos
        import matplotlib
        matplotlib.use('agg')
        
        # Crear el gráfico
        fig, ax = plt.subplots(figsize=(3, 3))
        
        # Obtener una lista de agrupaciones únicas
        agrupaciones = df['Grouping'].unique()
        
        # Crear una paleta de colores para todas las agrupaciones
        palette = plt.cm.get_cmap('tab20')(np.linspace(0, 1, len(agrupaciones)))
        
        # Crear una línea para cada agrupación
        for agrupacion, color in zip(agrupaciones, palette):
            datos_agrupacion = df[df['Grouping'] == agrupacion]
            ax.plot(datos_agrupacion['Tiempo'], datos_agrupacion['Valor'], label=agrupacion, linewidth=1, color=color)
        
        # Personalizar el gráfico
        fecha_inicio = df['Tiempo'].min()
        fecha_fin = df['Tiempo'].max()
        titulo = f'Desempeño de {sensor_elegido}\n{fecha_inicio.strftime("%d/%m/%Y")} - {fecha_fin.strftime("%d/%m/%Y")}'
        ax.set_title(titulo, fontsize=6, fontweight='bold', color='#3F3F3E')
        ax.set_xlabel('Tiempo', fontsize=5, fontweight='bold', color='#3F3F3E')
        ax.set_ylabel(f'Valor', fontsize=5, fontweight='bold', color='#3F3F3E')
        
        # Cambiar el color de fondo
        ax.set_facecolor('#F8F8F8')
        fig.patch.set_facecolor('#FFFFFF')
        
        # Formatear el eje x para mostrar fechas de manera más legible
        ax.xaxis.set_major_formatter(DateFormatter("%d/%m"))
        fig.autofmt_xdate()  # Rotar y alinear las etiquetas de fecha
        
        # Ajustar el tamaño de las etiquetas de los ejes
        ax.tick_params(axis='both', which='major', labelsize=4)
        
        # Ajustar el rango del eje y para que comience desde 0
        ax.set_ylim(bottom=0)
        
        # Ajustar el diseño para que quepa todo
        plt.tight_layout()
        
        # Crear una tabla con la simbología
        simbologia = pd.DataFrame({
            'Sensor': agrupaciones,
            'Color': [matplotlib.colors.rgb2hex(color) for color in palette]
        })
        
        # Ordenar la simbología alfabéticamente
        simbologia = simbologia.sort_values('Sensor')
        
        # Guardar la gráfica en un buffer
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=300, bbox_inches='tight')
        buf.seek(0)
        
        # Codificar la imagen en base64
        img_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
        
        return jsonify({
            "grafica": img_base64,
            "simbologia": simbologia.to_dict(orient='records')
        })
    
    return jsonify({"mensaje": "Acción no reconocida"})