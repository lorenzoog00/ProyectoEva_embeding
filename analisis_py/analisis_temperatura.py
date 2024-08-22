from flask import Flask, request, jsonify, send_file, render_template
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.dates import DateFormatter, HourLocator, DayLocator
import io
import base64
from datetime import datetime, timedelta

def create_graph(df, sensor_elegido, size):
    plt.figure(figsize=size)
    
    agrupaciones = df['Grouping'].unique()
    colors = ['#FF5100', '#3F3F3E', '#898A8D', '#F39149']
    palette = colors + sns.color_palette("husl", n_colors=max(0, len(agrupaciones)-len(colors)))
    
    for agrupacion, color in zip(agrupaciones, palette):
        datos_agrupacion = df[df['Grouping'] == agrupacion]
        sns.lineplot(x='Tiempo', y='Valor', data=datos_agrupacion, label=agrupacion, linewidth=1.5, color=color)
    
    valor_medio_total = df['Valor'].mean()
    
    plt.title(f'Desempeño de {sensor_elegido}\nValor medio: {valor_medio_total:.2f}', fontsize=12*size[0]/8, fontweight='bold')
    plt.xlabel('Tiempo', fontsize=10*size[0]/8, fontweight='bold')
    plt.ylabel(f'Valor de {sensor_elegido}', fontsize=10*size[0]/8, fontweight='bold')
    
    plt.legend(title='Sensores', title_fontsize=8*size[0]/8, fontsize=6*size[0]/8, loc='upper left', bbox_to_anchor=(1, 1))
    
    plt.gca().xaxis.set_major_formatter(DateFormatter('%d/%m %H:%M'))
    plt.gcf().autofmt_xdate()
    
    plt.tick_params(axis='both', which='major', labelsize=8*size[0]/8)
    
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=300, bbox_inches='tight')
    buf.seek(0)
    
    img_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    
    plt.close()
    
    return img_base64

def analisisDeTodos():
    try:
        print("Iniciando analisisDeTodos()")
        data = request.json
        print("Datos recibidos:", data)
        
        if data['action'] == 'graficas':
            report_data = data['reportData']
            sensor_elegido = data['sensorElegido']
            print(f"Sensor elegido: {sensor_elegido}")
            
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
            
            # Crear gráfica grande para descargar
            img_base64_large = create_graph(df, sensor_elegido, (11, 6))
            
            # Crear gráfica pequeña para mostrar
            img_base64_small = create_graph(df, sensor_elegido, (5.33, 2.67))
            
            response_data = {
                "grafica_grande": img_base64_large,
                "grafica_pequeña": img_base64_small
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