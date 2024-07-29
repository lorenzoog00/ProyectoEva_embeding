import pandas as pd
import re
from flask import request, redirect, url_for, session, send_file

# Ruta del archivo Excel
excel_file = 'usuarios.xlsx'

# Crear el archivo Excel si no existe
def init_excel():
    try:
        df = pd.read_excel(excel_file)
    except FileNotFoundError:
        df = pd.DataFrame(columns=['nombre_usuario', 'contrasena', 'tipo_plan'])
        df.to_excel(excel_file, index=False)
    except PermissionError as e:
        print(f"PermissionError: {e}")
        raise

# Iniciar sesión
def authenticate_user(nombre_usuario, contrasena):
    try:
        df = pd.read_excel(excel_file, dtype={'nombre_usuario': str, 'contrasena': str, 'tipo_plan': str})
        user = df[df['nombre_usuario'] == nombre_usuario]
        
        if not user.empty:
            stored_password = user.iloc[0]['contrasena']
            if stored_password == contrasena:
                return True, 'Inicio de sesión exitoso'
        return False, 'Nombre de usuario o contraseña incorrectos'
    except PermissionError as e:
        print(f"PermissionError: {e}")
        raise

def format_steps_in_bold(text):
    pattern = r'(\d+\.\s)(.*?)(:)'
    formatted_text = re.sub(pattern, lambda match: f"{match.group(1)}<b>{match.group(2)}</b>{match.group(3)}", text)
    return formatted_text

# Decorador para verificar si el usuario está autenticado
def login_required(f):
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login_route'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function
# Inicializar el archivo Excel al importar el módulo
init_excel()
