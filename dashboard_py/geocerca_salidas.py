from flask import jsonify, request
import pandas as pd
from datetime import datetime, timedelta

def geocerca_analysis():
    data = request.json
    
    if not data:
        return jsonify({'error': 'No se recibieron datos'}), 400
    
    df = pd.DataFrame(data['rows'], columns=data['headers'])
    
    # Filtrar las salidas (donde la hora de salida no es "Desconocido")
    df_salidas = df[df['Hora de salida'] != 'Desconocido']
    
    # Contar las salidas por unidad
    salidas_por_unidad = df_salidas['Unidad'].value_counts()
    
    # Obtener la unidad que más salió
    unidad_mas_salidas = salidas_por_unidad.index[0] if not salidas_por_unidad.empty else "N/A"
    valor_mas_salidas = salidas_por_unidad.iloc[0] if not salidas_por_unidad.empty else 0
    
    # Obtener la unidad que menos salió
    unidad_menos_salidas = salidas_por_unidad.index[-1] if len(salidas_por_unidad) > 1 else "N/A"
    valor_menos_salidas = salidas_por_unidad.iloc[-1] if len(salidas_por_unidad) > 1 else 0
    
    # Calcular el promedio de salidas
    promedio_salidas = salidas_por_unidad.mean() if not salidas_por_unidad.empty else 0
    
    # Generar el HTML de la tabla
    table_html = f"""
    <table class="geocerca-table">
        <tr>
            <th>Estadística</th>
            <th>Unidad</th>
            <th>Valor</th>
        </tr>
        <tr>
            <td>Unidad con más salidas</td>
            <td>{unidad_mas_salidas}</td>
            <td>{valor_mas_salidas}</td>
        </tr>
        <tr>
            <td>Unidad con menos salidas</td>
            <td>{unidad_menos_salidas}</td>
            <td>{valor_menos_salidas}</td>
        </tr>
        <tr>
            <td>Promedio de salidas</td>
            <td>Todas las unidades</td>
            <td>{promedio_salidas:.2f}</td>
        </tr>
    </table>
    <p>Para mayor información, <a href="#" id="moreInfoLink">haz clic aquí</a></p>
    """
    
    # Obtener el primer día del mes actual y la fecha actual
    today = datetime.now()
    first_day_of_month = today.replace(day=1)
    
    response = {
        'table_html': table_html,
        'date_range': f"Del {first_day_of_month.strftime('%d/%m/%Y')} al {today.strftime('%d/%m/%Y')}"
    }
    
    return jsonify(response)