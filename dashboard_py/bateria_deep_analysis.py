from flask import Flask, request, jsonify
import pandas as pd
from datetime import datetime
#def get_battery_data():

def get_battery_data():
    data = request.json.get('reportData', [])
    summary = []

    for table in data:
        rows = table.get('rows', [])
        if not rows:
            continue

        # Convertir datos a DataFrame sin nombres de columna, solo índices
        df = pd.DataFrame(rows)
        
        # Extraer el tiempo del diccionario dentro del campo 'Time' (suponiendo que está en la tercera columna)
        df[2] = df[2].apply(lambda x: x['t'] if isinstance(x, dict) else x)
        
        # Convertir el tiempo a formato datetime
        df[2] = pd.to_datetime(df[2], format='%d.%m.%Y %H:%M:%S')
        df[1] = df[1].astype(float)  # Asegurar que el nivel de batería sea un float
        
        # Procesar cada dispositivo individualmente
        for unit in df[0].unique():
            unit_df = df[df[0] == unit].sort_values(2)
            
            consumption_data = []
            for i in range(1, len(unit_df)):
                prev_row = unit_df.iloc[i - 1]
                curr_row = unit_df.iloc[i]
                
                # Calcular la diferencia de tiempo en horas
                time_diff = (curr_row[2] - prev_row[2]).total_seconds() / 3600.0
                battery_diff = prev_row[1] - curr_row[1]
                
                # Solo considerar los periodos donde la batería disminuye
                if battery_diff > 0:
                    rate_per_hour = battery_diff / time_diff if time_diff > 0 else 0
                    consumption_data.append(rate_per_hour)
            
            if consumption_data:
                avg_consumption_per_hour = sum(consumption_data) / len(consumption_data)
                current_battery = unit_df.iloc[-1][1]
                
                # Estimar el tiempo hasta el agotamiento
                if avg_consumption_per_hour > 0:
                    time_to_depletion = current_battery / avg_consumption_per_hour
                else:
                    time_to_depletion = float('inf')
                
                summary.append({
                    'Unidad': unit,
                    'Batería Actual': round(current_battery, 2),
                    'Desgaste por hora': round(avg_consumption_per_hour, 2),
                    'Tiempo de Vida Restante': time_to_depletion
                })
    
    # Ordenar por Tiempo de Vida Restante (de menor a mayor)
    sorted_summary = sorted(summary, key=lambda x: x['Tiempo de Vida Restante'])
    
    # Convertir el tiempo de vida restante a string con formato antes de enviarlo
    for item in sorted_summary:
        item['Tiempo de Vida Restante'] = f"{item['Tiempo de Vida Restante']:.2f} horas"
    
    return jsonify({'summary': sorted_summary})