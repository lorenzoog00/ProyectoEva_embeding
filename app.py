import os
from flask import Flask, render_template, request, redirect, url_for, session, send_file
from datetime import timedelta
import pandas as pd
import openai
import funciones_consulta
import login
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit
import planes
import re

app = Flask(__name__)
app.secret_key = 'tu_clave_secreta_aqui'  # Cambia esto por una clave secreta segura
app.permanent_session_lifetime = timedelta(minutes=5)  # Establece la duración de la sesión a 5 minutos

# Configuración del modelo y directorios
EMBEDDING_MODEL = 'text-embedding-ada-002'
GPT_MODEL = 'gpt-3.5-turbo'
DATA_DIR = 'data'
openai.api_key = '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'

# Inicializar el archivo Excel
login.init_excel()

def format_steps_in_bold(text):
    pattern = r'(\d+\.\s)(.*?)(:)'
    formatted_text = re.sub(pattern, lambda match: f"{match.group(1)}<b>{match.group(2)}</b>{match.group(3)}", text)
    return formatted_text

# Ruta para el login
@app.route('/login', methods=['GET', 'POST'])
def login_route():
    if request.method == 'POST':
        session.permanent = True  # Hacer la sesión permanente
        nombre_usuario = request.form['nombre_usuario']
        contrasena = request.form['contrasena']
        success, message = login.authenticate_user(nombre_usuario, contrasena)
        if success:
            session['logged_in'] = True
            session['nombre_usuario'] = nombre_usuario
            # Obtener el tipo de plan del usuario
            df = pd.read_excel(login.excel_file)
            user = df[df['nombre_usuario'] == nombre_usuario].iloc[0]
            session['tipo_plan'] = user['tipo_plan']
            return redirect(url_for('index'))
        else:
            return render_template('login.html', error=message)
    return render_template('login.html')

# Ruta para el logout
@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    session.pop('nombre_usuario', None)
    session.pop('tipo_plan', None)
    return redirect(url_for('login_route'))

# Decorador para verificar si el usuario está autenticado
def login_required(f):
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login_route'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

# Ruta principal para seleccionar archivos
@app.route('/')
@login_required
def index():
    nombre_usuario = session.get('nombre_usuario', 'Usuario')
    tipo_plan = session.get('tipo_plan', 'Oro')  # Valor por defecto 'Oro' si no está en la sesión
    all_files = funciones_consulta.list_files(DATA_DIR)
    
    if tipo_plan in planes.FILES_BY_PLAN and planes.FILES_BY_PLAN[tipo_plan] is not None:
        allowed_files = planes.FILES_BY_PLAN[tipo_plan]
        files = [file for file in all_files if file in allowed_files]
    else:
        files = all_files

    # Ordenar los archivos según el orden deseado
    files = sorted(files, key=lambda x: planes.ORDERED_FILES.index(x) if x in planes.ORDERED_FILES else len(planes.ORDERED_FILES))

    # Quitar la extensión .txt para mostrar y obtener nombres de imágenes en minúsculas
    display_files = [file.replace('.txt', '') for file in files]
    image_files = [file.lower().replace('.txt', '') + '.png' for file in files]

    # Obtener tooltips para los archivos
    tooltips = [planes.TOOLTIPS[file] for file in files]

    return render_template('index.html', files=files, display_files=display_files, image_files=image_files, tooltips=tooltips, nombre_usuario=nombre_usuario, zip=zip)

# Ruta para procesar los archivos seleccionados y generar el DataFrame filtrado
@app.route('/submit', methods=['POST'])
@login_required
def submit():
    selected_files = request.form.getlist('files')
    df = pd.read_csv("vectores.csv")
    df["embedding"] = df["embedding"].apply(eval)  # Convertir las cadenas de texto en listas
    filtered_df = funciones_consulta.filter_dataframe_by_filenames(df, selected_files)
    filtered_df.to_csv("filtered_vectores.csv", index=False)
    selected_files_display = [file.replace('.txt', '') for file in selected_files]  # Quitar la extensión .txt para mostrar
    session['selected_files'] = selected_files_display  # Almacenar los archivos seleccionados en la sesión
    session['queries'] = []  # Inicializar la lista de consultas
    return render_template('query.html', files=selected_files_display)

@app.route('/query', methods=['POST'])
@login_required
def query():
    user_query = request.form['query']
    filtered_df = pd.read_csv("filtered_vectores.csv")
    filtered_df["embedding"] = filtered_df["embedding"].apply(eval)  # Convertir las cadenas de texto en listas
    response = funciones_consulta.ask(user_query, filtered_df, model=GPT_MODEL, print_message=False, threshold=0.76)
    formatted_response = format_steps_in_bold(response)
    if 'queries' not in session:
        session['queries'] = []
    session['queries'].append({'query': user_query, 'response': formatted_response})
    return render_template('response.html', query=user_query, response=formatted_response, files=session['selected_files'])

@app.route('/query_additional', methods=['POST'])
@login_required
def query_additional():
    user_query = request.form['query']
    filtered_df = pd.read_csv("filtered_vectores.csv")
    filtered_df["embedding"] = filtered_df["embedding"].apply(eval)  # Convertir las cadenas de texto en listas
    response = funciones_consulta.ask(user_query, filtered_df, model=GPT_MODEL, print_message=False, threshold=0.76)
    formatted_response = format_steps_in_bold(response)
    session['queries'].append({'query': user_query, 'response': formatted_response})
    return f"""
    <div class="response-container">
        <h2>Respuesta a la Nueva Consulta</h2>
        <p><strong>Consulta:</strong> {user_query}</p>
        <pre style="white-space: pre-wrap;"><strong>Respuesta:</strong> {formatted_response}</pre>
    </div>
    """

@app.route('/query_page')
@login_required
def query_page():
    selected_files = session.get('selected_files', [])
    return render_template('query.html', files=selected_files)

@app.route('/download_pdf')
@login_required
def download_pdf():
    selected_files = session.get('selected_files', [])
    queries = session.get('queries', [])

    pdf_path = os.path.join("static", "consultas.pdf")
    c = canvas.Canvas(pdf_path, pagesize=letter)
    width, height = letter

    c.drawString(100, height - 50, f"Consulta sobre {', '.join(selected_files)}")

    y = height - 80
    line_height = 12
    max_width = width - 200  # Margen de 100 a cada lado

    def draw_wrapped_text(text, x, y):
        lines = simpleSplit(text, c._fontname, c._fontsize, max_width)
        for line in lines:
            c.drawString(x, y, line)
            y -= line_height
        return y

    for query in queries:
        y = draw_wrapped_text(f"Consulta: {query['query']}", 100, y)
        y -= line_height
        y = draw_wrapped_text(f"Respuesta: {query['response']}", 100, y)
        y -= 2 * line_height  # Espacio extra entre consultas

        if y < 50:  # Nueva página si el espacio es insuficiente
            c.showPage()
            y = height - 50

    c.save()
    return send_file(pdf_path, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)
