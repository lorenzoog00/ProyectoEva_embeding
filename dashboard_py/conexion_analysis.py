from flask import jsonify
from datetime import timedelta

def parse_duration(duracion_str):
    if isinstance(duracion_str, dict):
        return timedelta()  # Retorna una duración de cero si es un diccionario
    if 'days' in duracion_str:
        days, time = duracion_str.split(' days ')
        hours, minutes, seconds = map(int, time.split(':'))
        return timedelta(days=int(days), hours=hours, minutes=minutes, seconds=seconds)
    else:
        hours, minutes, seconds = map(int, duracion_str.split(':'))
        return timedelta(hours=hours, minutes=minutes, seconds=seconds)

def process_conexion_data(data):
    rows = data['reportData'][0]['rows']
    
    print("\n--- Depuración: Contenido de todas las filas ---")
    for i, row in enumerate(rows):
        print(f"\nFila {i + 1}:")
        for j, value in enumerate(row):
            print(f"  Columna {j}: {value}")
    print("--- Fin de la depuración ---\n")
    
    sin_conexion = []
    recientemente_conectado = []
    total_duracion = timedelta()
    count_duracion = 0

    for row in rows:
        nombre = row[0]
        duracion_str = row[3]
        ubicacion = row[4] if len(row) > 4 else ""

        duracion = parse_duration(duracion_str)
        total_duracion += duracion
        count_duracion += 1

        # Clasificar las unidades
        if ubicacion and (isinstance(ubicacion, dict) or (isinstance(ubicacion, str) and ubicacion.strip())):
            recientemente_conectado.append(nombre)
        else:
            sin_conexion.append(nombre)

    # Limitar a 5 nombres y agregar "y más..." si es necesario
    if len(sin_conexion) > 5:
        sin_conexion = sin_conexion[:5] + ["y más..."]
    if len(recientemente_conectado) > 5:
        recientemente_conectado = recientemente_conectado[:5] + ["y más..."]

    # Calcular promedio de duración
    avg_duracion = total_duracion / count_duracion if count_duracion > 0 else timedelta()
    avg_duracion_str = f"{avg_duracion.seconds // 3600:02d}:{(avg_duracion.seconds // 60) % 60:02d}:{avg_duracion.seconds % 60:02d}"

    return {
        'sin_conexion': sin_conexion,
        'recientemente_conectado': recientemente_conectado,
        'promedio_duracion': avg_duracion_str
    }

def conexion_analysis(data):
    processed_data = process_conexion_data(data)
    return jsonify(processed_data)