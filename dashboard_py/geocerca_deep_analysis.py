from flask import request, jsonify
from datetime import datetime, timedelta
from collections import defaultdict

def geocerca_deep_analysis():
    data = request.json
    report_data = data['reportData'][0]['rows']
    
    # Inicializar estructuras de datos
    unit_exits = defaultdict(int)
    unit_current_location = {}
    start_date = datetime(2024, 8, 1)  # Primer día del mes
    end_date = datetime.now()
    days_diff = (end_date - start_date).days + 1

    # Procesar los datos
    for row in report_data:
        unit = row[0]  # 'Grouping' column
        geocerca = row[1]  # 'Geocerca' column
        exit_time = row[3]  # 'Hora de salida' column

        if exit_time != 'Unknown':
            unit_exits[unit] += 1
        else:
            unit_current_location[unit] = geocerca

    # Preparar el resumen
    summary = []
    for unit in set(unit_exits.keys()) | set(unit_current_location.keys()):
        exits = unit_exits[unit]
        avg_exits_per_day = exits / days_diff
        current_location = unit_current_location.get(unit, "No")
        if current_location != "No":
            current_location = f"Sí, {current_location}"
        
        summary.append({
            "Unidad": unit,
            "Salidas este mes": exits,
            "Dentro de geocerca": current_location,
            "Promedio salidas/día": f"{avg_exits_per_day:.2f}"
        })

    # Ordenar el resumen por nombre de unidad
    summary.sort(key=lambda x: x["Unidad"])

    # Imprimir el resumen en el backend
    print("\nResumen del análisis de geocercas:")
    print(f"{'Unidad':<15} {'Salidas este mes':<20} {'Dentro de geocerca':<25} {'Promedio salidas/día':<20}")
    print("-" * 80)
    for row in summary:
        print(f"{row['Unidad']:<15} {row['Salidas este mes']:<20} {row['Dentro de geocerca']:<25} {row['Promedio salidas/día']:<20}")

    return jsonify({
        "message": "Análisis profundo completado",
        "summary": summary
    })