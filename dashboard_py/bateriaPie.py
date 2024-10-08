from flask import jsonify, request

def bateria_analysis(data):
    report_data = data.get('reportData', [])
    if not report_data:
        return jsonify({"status": "error", "message": "No se recibieron datos en el reporte"}), 400

    battery_levels = {}
    battery_ranges = {
        '80-100': 0,
        '60-80': 0,
        '40-60': 0,
        '20-40': 0,
        '0-20': 0
    }

    for report in report_data:
        rows = report.get('rows', [])
        for row in rows:
            unit = row[1]  # Asumiendo que la segunda columna es la unidad
            battery_data = row[2]  # Esto puede ser un diccionario o un valor numérico
            
            # Extraer el valor numérico de la batería
            if isinstance(battery_data, dict):
                battery = float(battery_data.get('v', 0))  # Asumiendo que 'v' es la clave para el valor
            elif isinstance(battery_data, (int, float)):
                battery = float(battery_data)
            elif isinstance(battery_data, str):
                try:
                    battery = float(battery_data)
                except ValueError:
                    print(f"No se pudo convertir el valor de batería a float para la unidad {unit}: {battery_data}")
                    continue
            else:
                print(f"Dato de batería inesperado para la unidad {unit}: {battery_data}")
                continue  # Saltamos esta unidad si no podemos procesar los datos

            battery_levels[unit] = battery
            if battery >= 80:
                battery_ranges['80-100'] += 1
            elif 60 <= battery < 80:
                battery_ranges['60-80'] += 1
            elif 40 <= battery < 60:
                battery_ranges['40-60'] += 1
            elif 20 <= battery < 40:
                battery_ranges['20-40'] += 1
            else:
                battery_ranges['0-20'] += 1

    unidades_criticas = [unit for unit, level in battery_levels.items() if level < 20]

    return jsonify({
        "status": "success",
        "ranges": battery_ranges,
        "unidades_criticas": unidades_criticas
    }), 200