# Esta función recibe una consulta del usuario, la procesa utilizando un modelo de lenguaje, 
# filtra un DataFrame basado en vectores preprocesados, formatea la respuesta y la guarda en la sesión.

from flask import request, session, render_template
import pandas as pd
import query_py.funciones_consulta as funciones_consulta
from login_py.login import format_steps_in_bold
from config import GPT_MODEL  # Importar configuración desde config.py

def process_user_query():
    user_query = request.form['query']
    filtered_df = pd.read_csv("filtered_vectores.csv")
    filtered_df["embedding"] = filtered_df["embedding"].apply(eval)
    response = funciones_consulta.ask(user_query, filtered_df, model=GPT_MODEL, print_message=False, threshold=0.76)
    formatted_response = format_steps_in_bold(response)
    if 'queries' not in session:
        session['queries'] = []
    session['queries'].append({'query': user_query, 'response': formatted_response})
    return render_template('response.html', query=user_query, response=formatted_response, files=session['selected_files'])
