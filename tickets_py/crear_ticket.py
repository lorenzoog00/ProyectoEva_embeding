import pandas as pd
import os
from flask import flash, redirect, url_for, request, render_template, current_app
import logging
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logging.basicConfig(filename='tickets.log', level=logging.INFO, 
                    format='%(asctime)s:%(levelname)s:%(message)s')

def enviar_correo(destinatario, asunto, cuerpo):
    remitente = current_app.config['MAIL_USERNAME']
    password = current_app.config['MAIL_PASSWORD']

    mensaje = MIMEMultipart()
    mensaje['From'] = remitente
    mensaje['To'] = destinatario
    mensaje['Subject'] = asunto
    mensaje.attach(MIMEText(cuerpo, 'plain'))

    try:
        server = smtplib.SMTP(current_app.config['MAIL_SERVER'], current_app.config['MAIL_PORT'])
        server.starttls()
        server.login(remitente, password)
        texto = mensaje.as_string()
        server.sendmail(remitente, destinatario, texto)
        server.quit()
        print(f"Correo enviado exitosamente a {destinatario}")
    except Exception as e:
        print(f"Error al enviar correo a {destinatario}: {str(e)}")

def crear_ticket_handler(app):
    if request.method == 'POST':
        nombre = request.form['nombre']
        email = request.form['email']
        asunto = request.form['asunto']
        mensaje = request.form['mensaje']
        fecha_hora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        try:
            excel_path = app.config['TICKETS_EXCEL_PATH']
            tickets_dir = os.path.dirname(excel_path)
            
            if not os.path.exists(tickets_dir):
                os.makedirs(tickets_dir)
            
            new_data = pd.DataFrame({
                'Fecha y Hora': [fecha_hora],
                'Nombre': [nombre],
                'Email': [email],
                'Asunto': [asunto],
                'Mensaje': [mensaje]
            })
            
            if os.path.exists(excel_path):
                existing_data = pd.read_excel(excel_path)
                updated_data = pd.concat([existing_data, new_data], ignore_index=True)
            else:
                updated_data = new_data
            
            updated_data.to_excel(excel_path, index=False, engine='openpyxl')
            logging.info(f"Ticket guardado: {fecha_hora} - {email} - {asunto}")
            
            # Enviar correo al usuario
            cuerpo_usuario = f"Estimado/a {nombre},\n\nHemos recibido su ticket con el asunto: '{asunto}'. Estamos trabajando en ello y le contactaremos pronto.\n\nGracias por su paciencia."
            enviar_correo(email, "Ticket Recibido", cuerpo_usuario)
            
           # Enviar correo al admin
            admin_email = current_app.config.get('ADMIN_EMAIL')
            if admin_email:
                cuerpo_admin = f"Nuevo ticket recibido:\n\nFecha y Hora: {fecha_hora}\nNombre: {nombre}\nEmail: {email}\nAsunto: {asunto}\nMensaje: {mensaje}"
                enviar_correo(admin_email, f"Nuevo Ticket: {asunto}", cuerpo_admin)
                print(f"Notificación enviada al administrador ({admin_email})")
            else:
                print("ADVERTENCIA: ADMIN_EMAIL no está configurado en .env")
            
            flash('Su ticket ha sido recibido. Le contactaremos pronto.', 'success')
        except Exception as e:
            print(f"Error al procesar el ticket: {str(e)}")
            flash('Hubo un problema al procesar su ticket. Por favor, intente nuevamente.', 'error')
        
        return redirect(url_for('ticket_enviado'))
    
    return render_template('tickets/crear_ticket.html')

def ticket_enviado_handler():
    return render_template('tickets/ticket_enviado.html')