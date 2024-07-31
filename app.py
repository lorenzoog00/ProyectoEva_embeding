from flask import Flask, render_template, request, redirect, url_for, session, send_file, jsonify
from datetime import timedelta
from query_py.submit import filter_and_prepare_query
from analisis_py.analisis_temperatura import descargar_valores_individuales
from query_py.download_pdf_consulta import generate_and_download_pdf
from login_py.login import login_required, init_excel, handle_login, active_graphs_handler
from query_py.query import process_user_query
from query_py.query_aditional import process_additional_user_query
from login_py.index import index_handler
from reportlab.lib.pagesizes import letter
from analisis_py.bateria_master import procesar_analisis_baterias
from analisis_py.analisis_temperatura import analisisDeTodos
import login_py.planes as planes
from config import DATA_DIR  # Importar configuración desde config.py

app = Flask(__name__)
app.secret_key = 'tu_clave_secreta_aqui'  # Cambia esto por una clave secreta segura
app.permanent_session_lifetime = timedelta(minutes=5)  # Establece la duración de la sesión a 5 minutos


# Inicializar el archivo Excel
init_excel()

@app.route('/login', methods=['GET', 'POST'])
def login_route():
    return handle_login(request)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login_route'))

@app.route('/')
@app.route('/home')
@login_required
def home():
    nombre_usuario = session.get('nombre_usuario', 'Usuario')
    return render_template('home.html', nombre_usuario=nombre_usuario)

@app.route('/api/active-graphs')
@login_required
def active_graphs():
    return active_graphs_handler()

@app.route('/index')
@login_required
def index():
    return index_handler(DATA_DIR, planes)

@app.route('/submit', methods=['POST'])
@login_required
def submit():
    return filter_and_prepare_query()

@app.route('/query', methods=['POST'], endpoint='query')
@login_required
def process_user_query_route():
    return process_user_query()


@app.route('/query_additional', methods=['POST'], endpoint='query_additional')
@login_required
def process_additional_user_query_route():
    return process_additional_user_query()

@app.route('/query_page', endpoint='query_page')
@login_required
def query_page():
    selected_files = session.get('selected_files', [])
    return render_template('query.html', files=selected_files)

@app.route('/download_pdf', endpoint='download_pdf' )
@login_required
def download_pdf_route():
    return generate_and_download_pdf()


@app.route('/analisis_datos')
@login_required
def analisis_datos():
    return render_template('analisis_de_datos/menu_analisis.html')

@app.route('/analisis_baterias', methods=['GET', 'POST'])
@login_required
def analisis_baterias():
    if request.method == 'POST':
        return procesar_analisis_baterias()
    return render_template('analisis_de_datos/bateria_grupo.html')

@app.route('/analisis_temperatura', methods=['GET', 'POST'])
@login_required
def analisis_temperatura():
    if request.method == 'POST':
        return analisisDeTodos()
    return render_template('analisis_de_datos/analisis_temperatura.html')

@app.route('/descargar_valores_individuales', methods=['POST'])
def ruta_descargar_valores_individuales():
    data = request.json
    return descargar_valores_individuales()

@app.route('/analisis_oscuridad')
@login_required
def analisis_oscuridad():
    # Aquí irá la lógica para el análisis de oscuridad
    return render_template('analisis_de_datos/grupo_general.html')

@app.route('/individual')
@login_required
def individual():
    return render_template('analisis_de_datos/individual.html')

if __name__ == '__main__':
    app.run(debug=True)