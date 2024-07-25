from flask import render_template, request, jsonify
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import json
import sys

def get_color(value):
    if value >= 90:
        return '#00FF00'  # Verde brillante
    elif 60 <= value < 90:
        return '#32CD32'  # Verde lima
    elif 40 <= value < 60:
        return '#FFA500'  # Naranja
    elif 20 <= value < 40:
        return '#FF4500'  # Rojo-Naranja
    else:
        return '#FF0000'  # Rojo

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
            df = pd.DataFrame(report_data[0]['rows'], columns=report_data[0]['headers'])
            df['Batería'] = pd.to_numeric(df['Batería'], errors='coerce')
            
            # Calcular el promedio de batería por unidad
            bateria_promedio = df.groupby('Grouping')['Batería'].mean()

            print("DataFrame creado:", file=sys.stderr)
            print(df.head(), file=sys.stderr)

            if action == 'graficas':
                print("Procesando acción: graficas", file=sys.stderr)
                
                # Configurar el estilo de seaborn
                sns.set_style("whitegrid")

                # Crear el gráfico
                plt.figure(figsize=(4, 4))
                bars = plt.bar(bateria_promedio.index, bateria_promedio.values, 
                               color=[get_color(value) for value in bateria_promedio.values])

                # Personalizar el gráfico
                plt.title('Nivel de batería por unidad', fontsize=10, fontweight='bold', color='#3F3F3E')
                plt.xlabel('Unidades', fontsize=8, fontweight='bold', color='#3F3F3E')
                plt.ylabel('Nivel de Batería (%)', fontsize=8, fontweight='bold', color='#3F3F3E')
                plt.xticks(rotation=45, ha='right', fontsize=6, color='#3F3F3E')
                plt.yticks(fontsize=6, color='#3F3F3E')

                # Cambiar el color de fondo
                plt.gca().set_facecolor('#F8F8F8')
                plt.gcf().set_facecolor('#FFFFFF')

                # Añadir etiquetas de valor encima de cada barra
                for bar in bars:
                    height = bar.get_height()
                    plt.text(bar.get_x() + bar.get_width()/2., height,
                             f'{height:.1f}%',
                             ha='center', va='bottom', fontweight='bold', color='#3F3F3E', fontsize=6)

                # Ajustar el layout
                plt.tight_layout()

                # Convertir la gráfica a una imagen base64
                buffer = io.BytesIO()
                plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
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