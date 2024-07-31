from flask import session, render_template
import query_py.funciones_consulta as funciones_consulta


def index_handler(DATA_DIR, planes):
    nombre_usuario = session.get('nombre_usuario', 'Usuario')
    tipo_plan = session.get('tipo_plan', 'Oro')
    all_files = funciones_consulta.list_files(DATA_DIR)
    
    if tipo_plan in planes.FILES_BY_PLAN and planes.FILES_BY_PLAN[tipo_plan] is not None:
        allowed_files = planes.FILES_BY_PLAN[tipo_plan]
        files = [file for file in all_files if file in allowed_files]
    else:
        files = all_files

    files = sorted(files, key=lambda x: planes.ORDERED_FILES.index(x) if x in planes.ORDERED_FILES else len(planes.ORDERED_FILES))
    display_files = [file.replace('.txt', '') for file in files]
    image_files = [file.lower().replace('.txt', '') + '.png' for file in files]
    tooltips = [planes.TOOLTIPS[file] for file in files]

    return render_template('index.html', files=files, display_files=display_files, image_files=image_files, tooltips=tooltips, nombre_usuario=nombre_usuario, zip=zip)
