from flask import render_template, request, jsonify
import pandas as pd
import json

def procesar_analisis_baterias():
    if request.method == 'POST':
        try:
            data = request.json
            action = data.get('action')
            report_data = data.get('reportData')

            print("Datos recibidos:")
            print(json.dumps(data, indent=2))

            if not report_data:
                return jsonify({"error": "No se recibieron datos del informe"}), 400

            # Procesar los datos
            dfs = []
            for table in report_data:
                df = pd.DataFrame(table['rows'], columns=table['headers'])
                dfs.append(df)

            # Combinar todos los DataFrames (si hay más de uno)
            if len(dfs) > 1:
                df = pd.concat(dfs, ignore_index=True)
            else:
                df = dfs[0]

            if action == 'tablas':
                # Renderizar la plantilla con los datos de la tabla
                return render_template('analisis_de_datos/bateria_grupo.html', 
                                       data=df.to_dict('records'))
            elif action == 'graficas':
                # Aquí iría el código para generar las gráficas
                # Por ahora, solo devolvemos un mensaje de éxito
                return jsonify({
                    "message": "Datos recibidos para gráficas",
                    "grafica1": "base64_de_la_grafica1",
                    "grafica2": "base64_de_la_grafica2"
                })
        
        except Exception as e:
            print(f"Error inesperado: {str(e)}")
            return jsonify({"error": str(e)}), 400

    # Si es una solicitud GET, solo renderiza el formulario
    return render_template('analisis_de_datos/bateria_grupo.html')