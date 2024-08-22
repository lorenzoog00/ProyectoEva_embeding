from flask import Flask, request, jsonify, send_file, render_template
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.dates import DateFormatter, HourLocator, DayLocator
import io
import base64
from datetime import datetime, timedelta

def analisisDeTodos():
    try:
        print("Iniciando analisisDeTodos()")
        data = request.json
        print("Datos recibidos:", data)
        
        if data['action'] == 'graficas':
            report_data = data['reportData']
            sensor_elegido = data['sensorElegido']
            print(f"Sensor elegido: {sensor_elegido}")
            
            # Convertir los datos recibidos en un DataFrame
            df = pd.DataFrame(report_data[0]['rows'], columns=report_data[0]['headers'])
            df = df.rename(columns={'Agrupación': 'Grouping'})
            df['Tiempo'] = pd.to_datetime(df['Tiempo'], format='%d.%m.%Y %H:%M:%S', errors='coerce')
            df = df[df['Sensor'] == sensor_elegido]
            df['Valor'] = pd.to_numeric(df['Valor'], errors='coerce')
            df = df.dropna(subset=['Valor', 'Tiempo'])
            
            if df.empty:
                print("DataFrame está vacío después de la limpieza")
                return jsonify({"error": "No hay datos válidos para graficar después de la limpieza"}), 400
            
            df = df.sort_values('Tiempo')
            
            # Configurar el estilo de seaborn
            sns.set_style("whitegrid")
            
            # Crear el gráfico
            plt.figure(figsize=(10, 6))
            
            # Obtener una lista de agrupaciones únicas
            agrupaciones = df['Grouping'].unique().tolist()  # Convertir a lista Python nativa
            print(f"Agrupaciones únicas: {agrupaciones}")
            
            # Crear una paleta de colores personalizada
            colors = ['#FF5100', '#3F3F3E', '#898A8D', '#F39149']
            palette = colors + sns.color_palette("husl", n_colors=max(0, len(agrupaciones)-len(colors)))
            
            # Crear una línea para cada agrupación
            for agrupacion, color in zip(agrupaciones, palette):
                datos_agrupacion = df[df['Grouping'] == agrupacion]
                sns.lineplot(x='Tiempo', y='Valor', data=datos_agrupacion, label=agrupacion, linewidth=2, color=color)
            
            # Calcular el valor medio total
            valor_medio_total = float(df['Valor'].mean())  # Convertir a float nativo de Python
            
            # Personalizar el gráfico
            plt.title(f'Desempeño de {sensor_elegido} (Valor medio: {valor_medio_total:.2f})', fontsize=16, fontweight='bold')
            plt.xlabel('Tiempo', fontsize=12, fontweight='bold')
            plt.ylabel(f'Valor de {sensor_elegido}', fontsize=12, fontweight='bold')
            plt.legend(title='Sensores', title_fontsize=10, fontsize=8)
            
            # Configurar el formato de las fechas en el eje x
            plt.gca().xaxis.set_major_formatter(DateFormatter('%d/%m %H:%M'))
            plt.gcf().autofmt_xdate()  # Rotar y alinear las etiquetas de fecha
            
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
                stats[agrupacion] = {
                    "promedio": float(datos_agrupacion['Valor'].mean()),
                    "maximo": float(datos_agrupacion['Valor'].max()),
                    "minimo": float(datos_agrupacion['Valor'].min()),
                    "ultima_lectura": float(datos_agrupacion['Valor'].iloc[-1]) if not datos_agrupacion.empty else None
                }
            
            response_data = {
                "grafica": img_base64,
                "estadisticas": stats,
                "valor_medio_total": valor_medio_total,
                "simbologia": [{"Sensor": str(agrupacion), "Color": color} for agrupacion, color in zip(agrupaciones, palette)]
            }
            
            print("Respuesta preparada con éxito")
            return jsonify(response_data)
        else:
            print("Acción no reconocida")
            return jsonify({"error": "Acción no reconocida"}), 400
    except Exception as e:
        print(f"Error en analisisDeTodos: {str(e)}")
        return jsonify({"error": str(e)}), 500


def descargar_valores_individuales():
    try:
        data = request.get_json()
        if 'datos_individuales' not in data:
            return "No se encontraron datos individuales", 400
        
        datos_individuales = data['datos_individuales']
        
        # Convertir los datos a un DataFrame de pandas
        df = pd.DataFrame(datos_individuales)
        
        # Crear un archivo Excel en un buffer
        excel_buffer = io.BytesIO()
        with pd.ExcelWriter(excel_buffer, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='Datos Individuales')
            
            # Obtener el objeto workbook y worksheet
            workbook = writer.book
            worksheet = writer.sheets['Datos Individuales']
            
            # Ajustar el ancho de las columnas
            for i, col in enumerate(df.columns):
                column_len = max(df[col].astype(str).str.len().max(), len(col))
                worksheet.set_column(i, i, column_len + 2)
        
        excel_buffer.seek(0)
        
        return send_file(
            excel_buffer, 
            download_name='valores_individuales.xlsx',
            as_attachment=True,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except Exception as e:
        print(f"Error en descargar_valores_individuales: {str(e)}")
        return jsonify({"error": str(e)}), 500