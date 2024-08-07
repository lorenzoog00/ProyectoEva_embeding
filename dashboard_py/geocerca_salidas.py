from flask import jsonify, request
import pandas as pd
import matplotlib.pyplot as plt
import io
import base64
from datetime import datetime, timedelta

def process_geocerca_data(data):
    df = pd.DataFrame(data['rows'], columns=data['headers'])
    
    # Filtrar las salidas (donde la hora de salida no es "Desconocido")
    df_salidas = df[df['Hora de salida'] != 'Desconocido']
    
    # Contar las salidas por unidad
    salidas_por_unidad = df_salidas['Unidad'].value_counts()
    
    return salidas_por_unidad

def generate_geocerca_chart(salidas_por_unidad):
    plt.figure(figsize=(10, 6))
    salidas_por_unidad.plot(kind='bar')
    plt.title('Salidas de geocerca por unidad')
    plt.xlabel('Unidades')
    plt.ylabel('Número de salidas')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    
    # Convertir el gráfico a una imagen base64
    img_buffer = io.BytesIO()
    plt.savefig(img_buffer, format='png')
    img_buffer.seek(0)
    img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
    plt.close()
    
    return img_base64

def geocerca_analysis():
    data = request.json
    
    if not data:
        return jsonify({'error': 'No se recibieron datos'}), 400
    
    salidas_por_unidad = process_geocerca_data(data)
    chart_image = generate_geocerca_chart(salidas_por_unidad)
    
    # Obtener el primer día del mes actual y la fecha actual
    today = datetime.now()
    first_day_of_month = today.replace(day=1)
    
    response = {
        'chart_image': chart_image,
        'date_range': f"Del {first_day_of_month.strftime('%d/%m/%Y')} al {today.strftime('%d/%m/%Y')}"
    }
    
    return jsonify(response)