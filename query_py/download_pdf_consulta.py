from flask import session, send_file
import os
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Frame
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from datetime import datetime

def generate_and_download_pdf():
    selected_files = session.get('selected_files', [])
    queries = session.get('queries', [])
    pdf_path = os.path.join("static", "consultas.pdf")
    
    # Define colors
    orange = HexColor("#FF5100")
    dark_gray = HexColor("#3F3F3E")
    light_gray = HexColor("#898A8D")
    
    # Create canvas
    c = canvas.Canvas(pdf_path, pagesize=letter)
    width, height = letter
    
    def add_page_elements():
        # Add logo
        logo_path = os.path.join("static", "logos", "Q.png")
        c.drawImage(logo_path, 0.75*inch, height - 1.2*inch, width=1*inch, height=1*inch, mask='auto')
        
        # Add company name and title
        c.setFont("Helvetica-Bold", 18)
        c.setFillColor(orange)
        c.drawString(2*inch, height - 0.8*inch, "Quamtum Services")
        
        c.setFont("Helvetica", 12)
        c.setFillColor(dark_gray)
        
        # Wrap text for "Consulta de"
        consulta_text = f"Consulta de {', '.join(selected_files)}"
        wrapped_text = consulta_text.split()
        max_width = width - 3*inch  # Allow 1.5 inches of margin on both sides
        current_line = ""
        y_position = height - 1.1*inch
        line_height = 14
        
        for word in wrapped_text:
            if c.stringWidth(current_line + word, "Helvetica", 12) <= max_width:
                current_line += word + " "
            else:
                c.drawString(2*inch, y_position, current_line.strip())
                y_position -= line_height
                current_line = word + " "
        
        if current_line:  # Draw the last line
            c.drawString(2*inch, y_position, current_line.strip())
        
        # Add date
        c.setFont("Helvetica", 10)
        c.setFillColor(light_gray)
        c.drawString(width - 2.5*inch, height - 0.5*inch, datetime.now().strftime("%d/%m/%Y"))
        
        # Add footer
        c.setFont("Helvetica", 8)
        c.drawString(0.75*inch, 0.5*inch, "Contacto: contacto@quamtumservices.com | 55 44438222")
        c.line(0.75*inch, 0.7*inch, width - 0.75*inch, 0.7*inch)
    
    def draw_wrapped_text(text, x, y, width, style):
        p = Paragraph(text, style)
        w, h = p.wrap(width, height)
        p.drawOn(c, x, y - h)
        return y - h - style.spaceBefore - style.spaceAfter
    
    add_page_elements()
    y = height - 2*inch
    
    query_style = ParagraphStyle(
        'Query',
        fontName='Helvetica-Bold',
        fontSize=11,
        textColor=dark_gray,
        spaceBefore=6,
        spaceAfter=3,
        leading=14  # Increased line spacing
    )
    
    response_style = ParagraphStyle(
        'Response',
        fontName='Helvetica',
        fontSize=10,
        textColor=dark_gray,
        spaceBefore=3,
        spaceAfter=12,
        leading=14,  # Increased line spacing
        leftIndent=20  # Add left indentation for responses
    )
    
    content_width = width - 1.5*inch  # Reduce width to create margins
    
    for query in queries:
        if y < 2*inch:
            c.showPage()
            add_page_elements()
            y = height - 2*inch
        
        y = draw_wrapped_text(f"<b>Consulta:</b> {query['query']}", 0.75*inch, y, content_width, query_style)
        y = draw_wrapped_text(f"<b>Respuesta:</b> {query['response']}", 0.75*inch, y, content_width, response_style)
    
    c.save()
    return send_file(pdf_path, as_attachment=True)