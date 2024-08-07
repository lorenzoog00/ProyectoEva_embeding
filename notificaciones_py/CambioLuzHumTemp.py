import pandas as pd

def check_sensor_compatibility(username):
    try:
        df = pd.read_excel('usuarios.xlsx', sheet_name='Sensores')
        user_row = df[df['nombre_usuario'] == username]
        
        if user_row.empty:
            return False, "Usuario no encontrado"
        
        has_compatible_device = user_row['AOVX GM100'].values[0] == 1
        
        if has_compatible_device:
            message = "Tiene dispositivos que SI son compatibles con esta notificación."
            color = "green"
        else:
            message = "No tiene dispositivos compatibles para esta notificación. De estar interesado mandar correo a l.orozco@quamtumservices.com"
            color = "red"
        
        return has_compatible_device, message, color
    except Exception as e:
        print(f"Error al verificar compatibilidad: {str(e)}")
        return False, "Error al verificar compatibilidad", "red"