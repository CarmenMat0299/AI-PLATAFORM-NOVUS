# Instrucciones de Despliegue Automático con GitHub Actions

## Resumen
Se ha configurado GitHub Actions para desplegar automáticamente el backend a Azure Container Apps cada vez que se hace push a la rama `main`.

## Paso 1: Subir código a GitHub

Primero, haz push de los cambios actuales a GitHub:

```bash
git push origin main
```

## Paso 2: Configurar Secretos en GitHub

Necesitas un administrador de Azure que tenga permisos para crear service principals. Esta persona debe ejecutar:

### 2.1 Crear Service Principal para GitHub Actions

En Azure Cloud Shell (https://shell.azure.com) o Azure CLI, ejecutar:

```bash
az ad sp create-for-rbac \
  --name "github-actions-novus-chatbot" \
  --role contributor \
  --scopes /subscriptions/3c06b864-b61b-4a4e-9592-3866de872209/resourceGroups/novus-rg \
  --json-auth
```

Esto generará un JSON similar a:
```json
{
  "clientId": "xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "3c06b864-b61b-4a4e-9592-3866de872209",
  "tenantId": "xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**IMPORTANTE:** Guarda todo este JSON, lo necesitarás en el siguiente paso.

### 2.2 Agregar Secretos en GitHub

Ve a tu repositorio en GitHub:
1. Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Agrega estos 3 secretos:

#### Secreto 1: ACR_USERNAME
- Name: `ACR_USERNAME`
- Value: Obtener con `az acr credential show --name acrnovus --query username -o tsv`

#### Secreto 2: ACR_PASSWORD
- Name: `ACR_PASSWORD`
- Value: Obtener con `az acr credential show --name acrnovus --query "passwords[0].value" -o tsv`

#### Secreto 3: AZURE_CREDENTIALS
- Name: `AZURE_CREDENTIALS`
- Value: El JSON completo que obtuviste del comando `az ad sp create-for-rbac` (todo el JSON incluyendo las llaves {})

## Paso 3: Activar el Despliegue

Una vez configurados los secretos, hay dos formas de activar el despliegue:

### Opción A: Push a main (Automático)
Cada vez que hagas `git push origin main`, el despliegue se ejecutará automáticamente.

### Opción B: Manual desde GitHub
1. Ve a tu repositorio en GitHub
2. Click en "Actions"
3. Selecciona "Deploy Backend to Azure"
4. Click en "Run workflow"
5. Selecciona la rama "main"
6. Click en "Run workflow"

## Paso 4: Verificar el Despliegue

1. Ve a GitHub → Actions
2. Verás el workflow en ejecución
3. Click en el workflow para ver los logs en tiempo real
4. Cuando termine, verás ✅ y el mensaje "Backend deployed successfully!"

El despliegue tarda aproximadamente 5-10 minutos.

## URLs de la Aplicación

- **Frontend**: https://lemon-mushroom-0d4526a0f-preview.eastus2.6.azurestaticapps.net
- **Backend**: https://app-chatbot-novus.proudsea-b52fc0ea.eastus2.azurecontainerapps.io

## Credenciales de Login

- **Email**: carmen.matarrita@novuscr.com
- **Password**: admin123

## Solución de Problemas

### Si el workflow falla:
1. Verifica que los 3 secretos estén configurados correctamente
2. Revisa los logs en GitHub Actions para ver el error específico
3. Asegúrate que el service principal tenga permisos de "Contributor" en el resource group

### Si no puedes crear el service principal:
Contacta a un administrador de Azure que tenga permisos de Global Administrator o Application Administrator en Azure AD.

## Archivos Modificados

Los siguientes archivos fueron modificados/creados para el sistema de autenticación:

- `src/api/main.py` - Endpoints de autenticación, SMTP y usuarios
- `src/middleware/auth.py` - Middleware de autenticación JWT
- `src/services/auth_service.py` - Servicio de autenticación
- `src/services/email_service.py` - Servicio de email con SMTP
- `src/services/user_service.py` - Servicio de gestión de usuarios
- `Dockerfile` - Actualizado para incluir archivos JSON y .env
- `users.json` - Base de datos de usuarios
- `smtp_config.json` - Configuración SMTP
- `.github/workflows/deploy-backend.yml` - Workflow de GitHub Actions
