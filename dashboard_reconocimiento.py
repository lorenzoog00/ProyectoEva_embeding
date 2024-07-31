import pandas as pd

def get_active_columns_for_user(excel_path, current_user):
    # Leer el archivo Excel
    df = pd.read_excel(excel_path)
    
    # Verificar si el usuario existe en el DataFrame
    if current_user not in df['nombre_usuario'].values:
        return []  # Retorna una lista vacía si el usuario no se encuentra
    
    # Filtrar el DataFrame para obtener solo la fila del usuario actual
    user_row = df[df['nombre_usuario'] == current_user].iloc[0]
    
    # Obtener los nombres de las columnas que tienen un valor de 1 para este usuario
    active_columns = [column for column in df.columns if user_row[column] == 1]
    
    # Eliminar 'Usuario' de la lista si está presente
    if 'nombre_usuario' in active_columns:
        active_columns.remove('nombre_usuario')
    
    return active_columns

# Ejemplo de uso:
active_columns = get_active_columns_for_user('usuarios.xlsx', 'peach')
print(active_columns)