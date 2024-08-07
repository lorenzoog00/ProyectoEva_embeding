import pandas as pd
import re

def check_thinkpower_compatibility(username):
    try:
        df = pd.read_excel('usuarios.xlsx', sheet_name='Sensores')
        user_row = df[df['nombre_usuario'] == username]
        
        if user_row.empty:
            return False
        
        # Buscar columnas que contengan 'ThinkPower' seguido de cualquier cosa
        thinkpower_columns = [col for col in df.columns if re.search(r'ThinkPower', col)]
        
        if not thinkpower_columns:
            return False
        
        # Verificar si alguna de las columnas ThinkPower tiene un valor 1
        for col in thinkpower_columns:
            if user_row[col].values[0] == 1:
                return True
        
        return False
    except Exception as e:
        print(f"Error al verificar compatibilidad ThinkPower: {str(e)}")
        return False
