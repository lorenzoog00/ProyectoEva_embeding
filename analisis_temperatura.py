from flask import Flask, request, jsonify, send_file, render_template
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.dates import DateFormatter, HourLocator, DayLocator
from matplotlib.lines import Line2D
import matplotlib
matplotlib.use('Agg')
import io
import base64
from datetime import datetime, timedelta

def analisisDeTodos():
    data = request.json
    if data['action'] == 'graficas':
        report_data = data['reportData']
        sensor_elegido = data['sensorElegido']
        # Convertir los datos recibidos en un DataFrame
        df = pd.DataFrame(report_data[0]['rows'], columns=report_data[0]['headers'])
        # Renombrar la columna 'Agrupación' a 'Grouping' para mantener consistencia con el resto del código
        df = df.rename(columns={'Agrupación': 'Grouping'})
        
        # Convertir la columna 'Tiempo' a datetime
        df['Tiempo'] = pd.to_datetime(df['Tiempo'], format='%d.%m.%Y %H:%M:%S')
        
        # Filtrar el DataFrame por el sensor elegido
        df = df[df['Sensor'] == sensor_elegido]
        
        # Convertir la columna 'Valor' a numérico, manejando errores
        df['Valor'] = pd.to_numeric(df['Valor'], errors='coerce')
        
        # Eliminar filas con valores no numéricos
        df = df.dropna(subset=['Valor'])
        
        # Ordenar el DataFrame por el valor del sensor (eje Y)
        df = df.sort_values('Valor')

        # Configurar el estilo de seaborn
        sns.set_style("whitegrid")
        
        # Crear el gráfico con tamaño reducido
        fig, ax = plt.subplots(figsize=(5, 2))
        
        # Obtener una lista de agrupaciones únicas
        agrupaciones = df['Grouping'].unique()
        
        # Crear una paleta de colores personalizada
        colors = ['#FF5100', '#3F3F3E', '#898A8D', '#F39149']
        palette = colors + sns.color_palette("husl", n_colors=max(0, len(agrupaciones)-len(colors)))
        
        # Crear una línea para cada agrupación
        for agrupacion, color in zip(agrupaciones, palette):
            datos_agrupacion = df[df['Grouping'] == agrupacion]
            sns.lineplot(x='Tiempo', y='Valor', data=datos_agrupacion, label=agrupacion, linewidth=1, color=color, ax=ax)
        
        # Calcular el valor medio total
        valor_medio_total = float(df['Valor'].mean())
        
        # Personalizar el gráfico con fuente muy reducida
        fecha_inicio = df['Tiempo'].min()
        fecha_fin = df['Tiempo'].max()
        duracion_total = fecha_fin - fecha_inicio
        titulo = f'Desempeño de {sensor_elegido} (Valor medio: {valor_medio_total:.2f})\n{fecha_inicio.strftime("%d/%m/%Y")} - {fecha_fin.strftime("%d/%m/%Y")}'
        ax.set_title(titulo, fontsize=8, fontweight='bold', color='#3F3F3E')
        ax.set_xlabel('Tiempo', fontsize=6, fontweight='bold', color='#3F3F3E')
        
        # Ajustar el eje Y según el tipo de sensor
        if sensor_elegido == 'Temperatura':
            ax.set_ylabel('Temperatura (°C)', fontsize=6, fontweight='bold', color='#3F3F3E')
        elif sensor_elegido == 'Bateria':
            ax.set_ylabel('Batería (%)', fontsize=6, fontweight='bold', color='#3F3F3E')
            ax.set_ylim(0, 100)  # Limitar el rango de 0 a 100%
        elif sensor_elegido == 'Luz':
            ax.set_ylabel('Luz (cd)', fontsize=6, fontweight='bold', color='#3F3F3E')
        else:
            ax.set_ylabel(f'Valor de {sensor_elegido}', fontsize=6, fontweight='bold', color='#3F3F3E')
        
        # Configurar las divisiones del eje x según la duración total
        if duracion_total <= timedelta(hours=48):
            ax.xaxis.set_major_locator(HourLocator(interval=2))
            ax.xaxis.set_major_formatter(DateFormatter('%H:%M'))
        elif duracion_total <= timedelta(days=7):
            ax.xaxis.set_major_locator(HourLocator(interval=12))
            ax.xaxis.set_major_formatter(DateFormatter('%d/%m %H:%M'))
        elif duracion_total <= timedelta(days=30):
            ax.xaxis.set_major_locator(DayLocator(interval=2))
            ax.xaxis.set_major_formatter(DateFormatter('%d/%m'))
        else:
            ax.xaxis.set_major_locator(DayLocator(interval=7))
            ax.xaxis.set_major_formatter(DateFormatter('%d/%m'))

        # Rotar y alinear las etiquetas de fecha
        fig.autofmt_xdate(rotation=45, ha='right')
        
        # Cambiar el color de fondo
        ax.set_facecolor('#F8F8F8')
        fig.patch.set_facecolor('#FFFFFF')
        
        # Reducir el tamaño de las etiquetas de los ejes
        ax.tick_params(axis='both', which='major', labelsize=5)
        
        # Crear una leyenda personalizada
        legend_elements = [Line2D([0], [0], color=color, lw=1, label=agrupacion) 
                           for agrupacion, color in zip(agrupaciones, palette)]
        
        # Añadir la leyenda personalizada con tamaño reducido
        ax.legend(handles=legend_elements, title='Sensores', bbox_to_anchor=(1.05, 1), 
                   loc='upper left', title_fontsize='6', fontsize='4')
        
        # Ajustar el diseño
        plt.tight_layout()
        
        # Guardar la gráfica en un buffer
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=300, bbox_inches='tight')
        buf.seek(0)
        
        # Codificar la imagen en base64
        img_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
        
        # Calcular estadísticas adicionales
        stats = {}
        for agrupacion in agrupaciones:
            datos_agrupacion = df[df['Grouping'] == agrupacion]
            promedio = float(datos_agrupacion['Valor'].mean())
            horas_ejecucion = float((datos_agrupacion['Tiempo'].max() - datos_agrupacion['Tiempo'].min()).total_seconds() / 3600)
            valor_maximo = float(datos_agrupacion['Valor'].max())
            valor_minimo = float(datos_agrupacion['Valor'].min())
            stats[agrupacion] = {
                "promedio": round(promedio, 2) if not np.isnan(promedio) else "N/A",
                "horas_ejecucion": round(horas_ejecucion, 2),
                "valor_maximo": round(valor_maximo, 2) if not np.isnan(valor_maximo) else "N/A",
                "valor_minimo": round(valor_minimo, 2) if not np.isnan(valor_minimo) else "N/A"
            }
        
        # Preparar datos para descarga individual
        datos_individuales = df.to_dict(orient='records')
        
        return jsonify({
            "grafica": img_base64,
            "simbologia": [{"Sensor": str(agrupacion), "Color": color} for agrupacion, color in zip(agrupaciones, palette)],
            "estadisticas": stats,
            "valor_medio_total": round(valor_medio_total, 2),
            "datos_individuales": datos_individuales
        })

    return jsonify({"mensaje": "Acción no reconocida"})

def descargar_valores_individuales():
    data = request.get_json()
    if 'datos_individuales' not in data:
        return "No datos_individuales data found", 400
    
    datos_individuales = data['datos_individuales']
    
    # Convertir los datos a un DataFrame de pandas
    df = pd.DataFrame(datos_individuales)
    
    # Crear un archivo Excel en un buffer
    excel_buffer = io.BytesIO()
    with pd.ExcelWriter(excel_buffer, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Datos Individuales')
        writer.close()  # Asegurar que los datos se escriben en el buffer
    
    excel_buffer.seek(0)
    
    return send_file(excel_buffer, download_name='valores_individuales.xlsx', as_attachment=True, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')