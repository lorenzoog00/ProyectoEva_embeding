from flask import Flask, request, jsonify
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.dates import DateFormatter
from matplotlib.lines import Line2D
from matplotlib.offsetbox import OffsetImage, AnnotationBbox
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

        # Configurar el estilo de seaborn
        sns.set_style("whitegrid")
        
        # Crear el gráfico
        fig, ax = plt.subplots(figsize=(20, 10))
        
        # Obtener una lista de agrupaciones únicas
        agrupaciones = df['Grouping'].unique()
        
        # Crear una paleta de colores personalizada
        colors = ['#FF5100', '#3F3F3E', '#898A8D', '#F39149']
        palette = colors + sns.color_palette("husl", n_colors=max(0, len(agrupaciones)-len(colors)))
        
        # Crear una línea para cada agrupación
        for agrupacion, color in zip(agrupaciones, palette):
            datos_agrupacion = df[df['Grouping'] == agrupacion]
            sns.lineplot(x='Tiempo', y='Valor', data=datos_agrupacion, label=agrupacion, linewidth=2, color=color, ax=ax)
        
        # Personalizar el gráfico
        fecha_inicio = df['Tiempo'].min()
        fecha_fin = df['Tiempo'].max()
        titulo = f'Desempeño de {sensor_elegido} por Sensor\nDel {fecha_inicio.strftime("%d/%m/%Y")} al {fecha_fin.strftime("%d/%m/%Y")}'
        ax.set_title(titulo, fontsize=20, fontweight='bold', color='#3F3F3E')
        ax.set_xlabel('Tiempo', fontsize=14, fontweight='bold', color='#3F3F3E')
        ax.set_ylabel(f'Valor de {sensor_elegido}', fontsize=14, fontweight='bold', color='#3F3F3E')
        
        # Cambiar el color de fondo
        ax.set_facecolor('#F8F8F8')
        fig.patch.set_facecolor('#FFFFFF')
        
        # Formatear el eje x para mostrar fechas de manera más legible
        ax.xaxis.set_major_formatter(DateFormatter("%d/%m/%Y"))
        fig.autofmt_xdate()  # Rotar y alinear las etiquetas de fecha
        
        # Crear una leyenda personalizada
        legend_elements = [Line2D([0], [0], color=color, lw=2, label=agrupacion) 
                           for agrupacion, color in zip(agrupaciones, palette)]
        
        # Añadir la leyenda personalizada
        ax.legend(handles=legend_elements, title='Sensores', bbox_to_anchor=(1.05, 1), 
                  loc='upper left', title_fontsize='13', fontsize='11')
        
        # Ajustar el diseño para que quepa la leyenda
        plt.tight_layout()
        
        # Guardar la gráfica en un buffer
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=300, bbox_inches='tight')
        buf.seek(0)
        
        # Codificar la imagen en base64
        img_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
        
        return jsonify({
            "grafica": img_base64,
            "simbologia": [{"Sensor": agrupacion, "Color": color} for agrupacion, color in zip(agrupaciones, palette)]
        })
    
    return jsonify({"mensaje": "Acción no reconocida"})