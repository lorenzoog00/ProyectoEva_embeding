from flask import render_template, request, jsonify
import pandas as pd
import io
import base64
import json
import matplotlib.pyplot as plt
import sys

def procesar_analisis_baterias():
    print("Función procesar_analisis_baterias llamada", file=sys.stderr)
    if request.method == 'POST':
        try:
            data = request.json
            action = data.get('action')
            report_data = data.get('reportData')
            print(f"Acción recibida: {action}", file=sys.stderr)
            print("Datos recibidos:", file=sys.stderr)
            print(json.dumps(data, indent=2), file=sys.stderr)

            if not report_data:
                print("No se recibieron datos del informe", file=sys.stderr)
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

            print("DataFrame creado:", file=sys.stderr)
            print(df.head(), file=sys.stderr)

            if action == 'tablas':
                print("Procesando acción: tablas", file=sys.stderr)
                # Renderizar la plantilla con los datos de la tabla
                return render_template('analisis_de_datos/bateria_grupo.html', 
                                       data=df.to_dict('records'))
            
            elif action == 'graficas':
                print("Procesando acción: graficas", file=sys.stderr)
                # Generar gráfica
                plt.figure(figsize=(10, 6))
                plt.bar(df['nombre'], df['nivel_bateria'])
                plt.title('Nivel de Batería por Dispositivo')
                plt.xlabel('Dispositivo')
                plt.ylabel('Nivel de Batería')
                plt.xticks(rotation=45, ha='right')
                plt.tight_layout()

                # Convertir la gráfica a una imagen base64
                buffer = io.BytesIO()
                plt.savefig(buffer, format='png')
                buffer.seek(0)
                image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
                plt.close()

                print("Gráfica generada y convertida a base64", file=sys.stderr)
                return jsonify({
                    "grafica1": image_base64
                })

        except Exception as e:
            print(f"Error inesperado: {str(e)}", file=sys.stderr)
            return jsonify({"error": str(e)}), 400

    # Si es una solicitud GET, solo renderiza el formulario
    print("Solicitud GET recibida, renderizando formulario", file=sys.stderr)
    return render_template('analisis_de_datos/bateria_grupo.html')