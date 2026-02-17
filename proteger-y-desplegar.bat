@echo off
echo ========================================
echo  PROTEGER Y DESPLEGAR JULIA (CODIGO ENCRIPTADO)
echo ========================================
echo.

REM Activar entorno virtual
echo [1/6] Activando entorno virtual...
call venv\Scripts\activate

REM Instalar PyArmor si no está instalado
echo [2/6] Verificando PyArmor...
pip show pyarmor >nul 2>&1
if errorlevel 1 (
    echo Instalando PyArmor...
    pip install pyarmor
)

REM Limpiar carpeta anterior
echo [3/6] Limpiando ofuscacion anterior...
if exist src_protected rmdir /s /q src_protected

REM Ofuscar código
echo [4/6] Ofuscando TODO el codigo Python...
pyarmor gen -O src_protected src/
if errorlevel 1 (
    echo ERROR: Fallo la ofuscacion
    pause
    exit /b 1
)

echo.
echo ========================================
echo  CODIGO OFUSCADO EXITOSAMENTE
echo ========================================
echo.
echo Carpeta src_protected/ creada con codigo encriptado
echo.

REM Construir imagen Docker
echo [5/6] Construyendo imagen Docker con codigo protegido...
docker build -f Dockerfile.protected -t acrnovus.azurecr.io/chatbot-novus:latest .
if errorlevel 1 (
    echo ERROR: Fallo la construccion de Docker
    pause
    exit /b 1
)

echo.
echo [6/6] Imagen Docker creada exitosamente
echo.
echo ========================================
echo SIGUIENTE PASO: DESPLEGAR A AZURE
echo ========================================
echo.
echo Ejecuta estos comandos para desplegar:
echo.
echo 1. az acr login --name acrnovus
echo 2. docker push acrnovus.azurecr.io/chatbot-novus:latest
echo 3. az containerapp update --name app-chatbot-novus --resource-group novus-rg --image acrnovus.azurecr.io/chatbot-novus:latest
echo.
echo O ejecuta: desplegar-a-azure.bat
echo.
pause
