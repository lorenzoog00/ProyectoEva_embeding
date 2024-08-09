from flask import jsonify, request

def geocerca_analysis():
    data = request.json
    report_data = data.get('reportData', [])

    if not report_data:
        print("No se recibieron datos en el reporte.")
        return jsonify({"status": "error", "message": "No se recibieron datos en el reporte"}), 400

    unit_exit_counts = {}

    # Recorrer cada fila y contar las salidas
    for report in report_data:
        rows = report.get('rows', [])
        for row in rows:
            unit = row[0]  # "Grouping" es la primera columna
            if unit not in unit_exit_counts:
                unit_exit_counts[unit] = 0
            unit_exit_counts[unit] += 1

    if not unit_exit_counts:
        print("No se encontraron datos de salidas de unidades.")
        return jsonify({"status": "error", "message": "No se encontraron datos de salidas de unidades"}), 400

    # Determinar la(s) unidad(es) con más salidas, menos salidas y el promedio
    max_exits = max(unit_exit_counts.values())
    min_exits = min(unit_exit_counts.values())
    avg_exits = sum(unit_exit_counts.values()) / len(unit_exit_counts)

    units_with_max_exits = [unit for unit, count in unit_exit_counts.items() if count == max_exits]
    units_with_min_exits = [unit for unit, count in unit_exit_counts.items() if count == min_exits]

    print(f"Unidades con más salidas ({max_exits}): {', '.join(units_with_max_exits)}")
    print(f"Unidades con menos salidas ({min_exits}): {', '.join(units_with_min_exits)}")
    print(f"Promedio de salidas: {avg_exits:.2f}")

    return jsonify({
        "status": "success",
        "units_with_max_exits": units_with_max_exits,
        "max_exits": max_exits,
        "units_with_min_exits": units_with_min_exits,
        "min_exits": min_exits,
        "avg_exits": avg_exits
    }), 200