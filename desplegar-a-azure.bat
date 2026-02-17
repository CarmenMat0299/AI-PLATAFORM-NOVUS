@echo off
echo ========================================
echo  DESPLEGAR A AZURE
echo ========================================
echo.

REM Login a Azure Container Registry
echo [1/3] Login a Azure Container Registry...
az acr login --name acrnovus
if errorlevel 1 (
    echo ERROR: Fallo el login a ACR
    echo.
    echo Asegurate de estar logueado en Azure CLI:
    echo   az login
    pause
    exit /b 1
)

REM Push de la imagen
echo.
echo [2/3] Subiendo imagen Docker a Azure...
docker push acrnovus.azurecr.io/chatbot-novus:latest
if errorlevel 1 (
    echo ERROR: Fallo el push de la imagen
    pause
    exit /b 1
)

REM Actualizar Container App
echo.
echo [3/3] Actualizando Container App en Azure...
az containerapp update ^
  --name app-chatbot-novus ^
  --resource-group novus-rg ^
  --image acrnovus.azurecr.io/chatbot-novus:latest

if errorlevel 1 (
    echo ERROR: Fallo la actualizacion del Container App
    pause
    exit /b 1
)

echo.
echo ========================================
echo  DESPLIEGUE EXITOSO!
echo ========================================
echo.
echo Backend URL: https://app-chatbot-novus.proudsea-b52fc0ea.eastus2.azurecontainerapps.io
echo Frontend URL: https://lemon-mushroom-0d4526a0f-preview.eastus2.6.azurestaticapps.net
echo.
echo El codigo esta 100%% OFUSCADO y protegido
echo.
pause
