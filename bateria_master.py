from flask import render_template, request, jsonify
import matplotlib.pyplot as plt
import pandas as pd
import io
import base64
import json

def procesar_analisis_baterias():
    if request.method == 'POST':
        try:
            data = request.json
            action = data.get('action')
            report_data = data.get('reportData')
            print("DENTRO")
            print(action)

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
                # En lugar de generar una gráfica, vamos a imprimir y devolver algunos datos
                print("Datos del DataFrame:")
                print(df.head())  # Imprime las primeras 5 filas
                
                # Calculamos algunas estadísticas básicas
                stats = {
                    "num_registros": len(df),
                    "promedio_bateria": df['nivel_bateria'].mean() if 'nivel_bateria' in df.columns else "N/A",
                    "max_bateria": df['nivel_bateria'].max() if 'nivel_bateria' in df.columns else "N/A",
                    "min_bateria": df['nivel_bateria'].min() if 'nivel_bateria' in df.columns else "N/A",
                }
                
                print("Estadísticas calculadas:")
                print(json.dumps(stats, indent=2))
                
                return jsonify({
                    "message": "Datos procesados con éxito",
                    "stats": stats,
                    "sample_data": df.head().to_dict('records')
                })
        except Exception as e:
            print(f"Error inesperado: {str(e)}")
            return jsonify({"error": str(e)}), 400
        
        except Exception as e:
            print(f"Error inesperado: {str(e)}")
            return jsonify({"error": str(e)}), 400

    # Si es una solicitud GET, solo renderiza el formulario
    return render_template('analisis_de_datos/bateria_grupo.html')

