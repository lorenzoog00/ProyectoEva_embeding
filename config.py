import os
from dotenv import load_dotenv

# Configuración del modelo y directorios
EMBEDDING_MODEL = 'text-embedding-ada-002'
GPT_MODEL = 'gpt-3.5-turbo'
DATA_DIR = 'data'
OPENAI_API= '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'


load_dotenv()
class Config:
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    SECRET_KEY = os.getenv('SECRET_KEY')
    TICKETS_EXCEL_PATH = os.path.join(BASE_DIR, 'tickets', 'tickets.xlsx')
    ADMIN_EMAIL = os.getenv('ADMIN_EMAIL')
    
    # Configuración de correo
    MAIL_SERVER = os.getenv('MAIL_SERVER')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')