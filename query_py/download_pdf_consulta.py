# Esta función genera un archivo PDF con las consultas y respuestas realizadas por el usuario,
# y lo ofrece para su descarga.

from flask import session, send_file
import os
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit

def generate_and_download_pdf():
    selected_files = session.get('selected_files', [])
    queries = session.get('queries', [])

    pdf_path = os.path.join("static", "consultas.pdf")
    c = canvas.Canvas(pdf_path, pagesize=letter)
    width, height = letter

    c.drawString(100, height - 50, f"Consulta sobre {', '.join(selected_files)}")

    y = height - 80
    line_height = 12
    max_width = width - 200

    def draw_wrapped_text(text, x, y):
        lines = simpleSplit(text, c._fontname, c._fontsize, max_width)
        for line in lines:
            c.drawString(x, y, line)
            y -= line_height
        return y

    for query in queries:
        y = draw_wrapped_text(f"Consulta: {query['query']}", 100, y)
        y -= line_height
        y = draw_wrapped_text(f"Respuesta: {query['response']}", 100, y)
        y -= 2 * line_height

        if y < 50:
            c.showPage()
            y = height - 50

    c.save()
    return send_file(pdf_path, as_attachment=True)
