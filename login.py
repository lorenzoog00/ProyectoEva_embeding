import pandas as pd

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

# Inicializar el archivo Excel al importar el módulo
init_excel()
