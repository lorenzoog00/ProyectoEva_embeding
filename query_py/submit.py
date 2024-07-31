# Esta función recibe los archivos seleccionados por el usuario, filtra un DataFrame basado en esos archivos,
# guarda los datos filtrados en un archivo CSV y luego renderiza una página de consultas con los archivos seleccionados.

from flask import request, session, render_template
import pandas as pd
import query_py.funciones_consulta as funciones_consulta

def filter_and_prepare_query():
    selected_files = request.form.getlist('files')
    df = pd.read_csv("vectores.csv")
    df["embedding"] = df["embedding"].apply(eval)
    filtered_df = funciones_consulta.filter_dataframe_by_filenames(df, selected_files)
    filtered_df.to_csv("filtered_vectores.csv", index=False)
    selected_files_display = [file.replace('.txt', '') for file in selected_files]
    session['selected_files'] = selected_files_display
    session['queries'] = []
    return render_template('query.html', files=selected_files_display)
