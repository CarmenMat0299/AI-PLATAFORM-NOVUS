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

# Copiar archivos de configuración y datos
COPY .env .env
COPY users.json users.json
COPY escalations.json escalations.json
COPY activities.json activities.json
COPY smtp_config.json smtp_config.json

# Exponer puerto
EXPOSE 8000

# Comando de inicio
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]