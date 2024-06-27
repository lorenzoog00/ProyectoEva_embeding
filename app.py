from flask import Flask, render_template, request, redirect, url_for, session
import pandas as pd
import openai
import funciones_consulta
import login

app = Flask(__name__)
app.secret_key = 'tu_clave_secreta_aqui'  # Cambia esto por una clave secreta segura

# Configuración del modelo y directorios
EMBEDDING_MODEL = 'text-embedding-ada-002'
GPT_MODEL = 'gpt-3.5-turbo'
DATA_DIR = 'data'
openai.api_key = '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'

# Inicializar el archivo Excel
login.init_excel()

# Definir los archivos permitidos por cada plan
FILES_BY_PLAN = {
    'Bronce': [
        'Conductores y remolques.txt',
        'DAshboard.txt',
        'Geocercas.txt'
    ],
    'Plata': [
        'Conductores y remolques.txt',
        'DAshboard.txt',
        'Geocercas.txt',
        'Herramientas Parte 1.txt',
        'Herramientas Parte 2.txt',
        'Herramientas.txt',
        'iDriveSafe.txt',
        'Informes.txt',
        'Introducción a la plataforma.txt'
    ],
    'Oro': None  # Todos los archivos disponibles
}

# Ruta para el login
@app.route('/login', methods=['GET', 'POST'])
def login_route():
    if request.method == 'POST':
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
    tipo_plan = session.get('tipo_plan', 'oro')  # Valor por defecto 'oro' si no está en la sesión
    all_files = funciones_consulta.list_files(DATA_DIR)
    
    if tipo_plan in FILES_BY_PLAN and FILES_BY_PLAN[tipo_plan] is not None:
        allowed_files = FILES_BY_PLAN[tipo_plan]
        files = [file for file in all_files if file in allowed_files]
    else:
        files = all_files

    return render_template('index.html', files=files, nombre_usuario=nombre_usuario)

# Ruta para procesar los archivos seleccionados y generar el DataFrame filtrado
@app.route('/submit', methods=['POST'])
@login_required
def submit():
    selected_files = request.form.getlist('files')
    df = pd.read_csv("vectores.csv")
    df["embedding"] = df["embedding"].apply(eval)  # Convertir las cadenas de texto en listas
    filtered_df = funciones_consulta.filter_dataframe_by_filenames(df, selected_files)
    filtered_df.to_csv("filtered_vectores.csv", index=False)
    return render_template('query.html', files=selected_files)

@app.route('/query', methods=['POST'])
@login_required
def query():
    user_query = request.form['query']
    filtered_df = pd.read_csv("filtered_vectores.csv")
    filtered_df["embedding"] = filtered_df["embedding"].apply(eval)  # Convertir las cadenas de texto en listas
    response = funciones_consulta.ask(user_query, filtered_df, model=GPT_MODEL, print_message=False, threshold=0.76)
    return render_template('response.html', query=user_query, response=response)

if __name__ == '__main__':
    app.run(debug=True)
