import logging
from flask import jsonify
from datetime import datetime
from collections import defaultdict

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def process_conexion_data(data):
    logging.info("Iniciando procesamiento de datos de conexión")
    detailed_data = []
    device_summary = defaultdict(lambda: {"connected": False, "appearances": 0, "last_state": None})

    for item in data['reportData']:
        for row in item['rows']:
            device = row[0]
            start = row[1]
            end = row[2]
            duration = row[3]
            location = row[4]

            # Convertir start, end y location a strings si son diccionarios
            start_str = start['t'] if isinstance(start, dict) else start
            end_str = end['t'] if isinstance(end, dict) else end
            location_str = location['t'] if isinstance(location, dict) else location

            is_connected = bool(location_str.strip())

            # Actualizar resumen del dispositivo
            device_summary[device]["connected"] = is_connected
            device_summary[device]["appearances"] += 1
            device_summary[device]["last_state"] = "Conectado" if is_connected else "Desconectado"

            # Añadir a datos detallados
            detailed_data.append({
                "Unidad": device,
                "Comienzo": start_str,
                "Fin": end_str,
                "Duración": duration,
                "Ubicación": location_str,
                "Estado": "Conectado" if is_connected else "Desconectado",
                "Clase": "conectado" if is_connected else "desconectado"
            })

    summary_data = [{"Unidad": k, 
                     "Estado": v["last_state"], 
                     "Apariciones": v["appearances"], 
                     "Clase": "conectado" if v["last_state"] == "Conectado" else "desconectado"} 
                    for k, v in device_summary.items()]

    logging.info(f"Procesamiento completado. Dispositivos: {len(device_summary)}, Eventos: {len(detailed_data)}")
    return summary_data, detailed_data

def conexion_deep_analysis(data):
    logging.info("Generando análisis profundo de conexión")
    summary_data, detailed_data = process_conexion_data(data)
    
    context = {
        'summary_data': summary_data,
        'detailed_data': detailed_data,
        'total_devices': len(summary_data),
        'connected_devices': sum(1 for item in summary_data if item['Estado'] == 'Conectado'),
        'report_time': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    logging.info("Preparando respuesta JSON")
    return jsonify(context)