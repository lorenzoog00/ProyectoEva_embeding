import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.offsetbox import OffsetImage, AnnotationBbox

def generar_grafico_bateria(df):
    # Calcular el promedio de batería por agrupación
    bateria_promedio = df.groupby('Agrupación')['Batería'].mean().sort_values(ascending=False)

    # Configurar el estilo de seaborn
    sns.set_style("whitegrid")
    
    # Crear el gráfico
    plt.figure(figsize=(16, 10))
    bars = plt.bar(bateria_promedio.index, bateria_promedio.values, color=sns.color_palette("RdYlGn_r", n_colors=len(bateria_promedio)))

    # Personalizar el gráfico
    plt.title('Nivel de batería por unidad', fontsize=24, fontweight='bold', color='#3F3F3E')
    plt.xlabel('Unidades', fontsize=16, fontweight='bold', color='#3F3F3E')
    plt.ylabel('Nivel de Batería (%)', fontsize=16, fontweight='bold', color='#3F3F3E')
    plt.xticks(rotation=45, ha='right', fontsize=12, color='#3F3F3E')
    plt.yticks(fontsize=12, color='#3F3F3E')

    # Cambiar el color de fondo
    plt.gca().set_facecolor('#F8F8F8')
    plt.gcf().set_facecolor('#FFFFFF')

    # Añadir etiquetas de valor encima de cada barra
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height,
                 f'{height:.1f}%',
                 ha='center', va='bottom', fontweight='bold', color='#3F3F3E')

    # Añadir el logo
    logo = plt.imread('logo.png')
    imagebox = OffsetImage(logo, zoom=0.15)
    ab = AnnotationBbox(imagebox, (0.95, 0.95), xycoords='axes fraction', frameon=False)
    plt.gca().add_artist(ab)

    # Ajustar el layout
    plt.tight_layout()
    
    # Guardar el gráfico como una imagen
    plt.savefig('static/grafico_bateria.png')
    plt.close()

# Si necesitas ejecutar el código directamente (para pruebas)
if __name__ == "__main__":
    import pandas as pd
    
    # Cargar datos de prueba (reemplaza esto con tus datos reales)
    df = pd.DataFrame({
        'Agrupación': ['Unidad1', 'Unidad2', 'Unidad3', 'Unidad4'],
        'Batería': [80, 65, 90, 75]
    })
    
    generar_grafico_bateria(df)
    print("Gráfico generado y guardado como 'grafico_bateria.png' en la carpeta 'static'")