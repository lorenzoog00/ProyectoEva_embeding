import pandas as pd
import re
from flask import request, redirect, url_for, session, render_template, jsonify
from functools import wraps
from dashboard_reconocimiento import get_active_columns_for_user


# Ruta del archivo Excel
excel_file = 'usuarios.xlsx'

# Crear el archivo Excel si no existe
def init_excel():
    try:
        df = pd.read_excel(excel_file)
    except FileNotFoundError:
        df = pd.DataFrame(columns=['nombre_usuario', 'contrasena', 'tipo_plan', 'wialon_token'])
        df.to_excel(excel_file, index=False)
    except PermissionError as e:
        print(f"PermissionError: {e}")
        raise

# Verificar si el usuario existe
def user_exists(nombre_usuario):
    df = pd.read_excel(excel_file)
    return not df[df['nombre_usuario'] == nombre_usuario].empty

# Iniciar sesión
def authenticate_user(nombre_usuario, wialon_token):
    try:
        df = pd.read_excel(excel_file)
        user = df[df['nombre_usuario'] == nombre_usuario]
        
        if not user.empty:
            # Actualizar el token de Wialon
            df.loc[df['nombre_usuario'] == nombre_usuario, 'wialon_token'] = wialon_token
            df.to_excel(excel_file, index=False)
            return True, 'Inicio de sesión exitoso'
        return False, 'Usuario no encontrado'
    except PermissionError as e:
        print(f"PermissionError: {e}")
        raise


# Manejar el inicio de sesión
def handle_login(request):
    if request.method == 'POST':
        nombre_usuario = request.form['nombre_usuario']
        wialon_token = request.form['wialon_token']
        
        if user_exists(nombre_usuario):
            success, message = authenticate_user(nombre_usuario, wialon_token)
            if success:
                session['logged_in'] = True
                session['nombre_usuario'] = nombre_usuario
                df = pd.read_excel(excel_file)
                user = df[df['nombre_usuario'] == nombre_usuario].iloc[0]
                session['tipo_plan'] = user['tipo_plan']
                return jsonify({"success": True, "redirect": url_for('home')})
            else:
                return jsonify({"success": False, "error": message})
        else:
            return jsonify({"success": False, "error": "Usuario no encontrado"})
    return render_template('login.html')

def active_graphs_handler():
    nombre_usuario = session.get('nombre_usuario', 'Usuario')
    excel_path = 'usuarios.xlsx'  # Reemplaza con la ruta real de tu archivo Excel
    active_columns = get_active_columns_for_user(excel_path, nombre_usuario)
    return jsonify(active_columns)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login_route'))
        return f(*args, **kwargs)
    return decorated_function

def format_steps_in_bold(text):
    pattern = r'(\d+\.\s)(.*?)(:)'
    formatted_text = re.sub(pattern, lambda match: f"{match.group(1)}<b>{match.group(2)}</b>{match.group(3)}", text)
    return formatted_text