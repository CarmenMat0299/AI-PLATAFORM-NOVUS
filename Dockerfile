FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements.txt .

# Instalar dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código de la aplicación
COPY src/ ./src/

# Crear archivos JSON iniciales vacíos
# La aplicación los poblará automáticamente al iniciar
RUN echo '[]' > users.json && \
    echo '[]' > escalations.json && \
    echo '[]' > activities.json && \
    echo '{"smtp_server":"","smtp_port":587,"smtp_username":"","smtp_password":"","from_email":"","enabled":false}' > smtp_config.json

# Exponer puerto
EXPOSE 8000

# Comando de inicio
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]