# Guía de Configuración SMTP para AI Platform Novus

Esta guía explica cómo configurar el servicio de correo electrónico (SMTP) para que el sistema pueda enviar correos de recuperación de contraseña y otras notificaciones.

## 📋 Tabla de Contenidos

1. [¿Qué es SMTP?](#qué-es-smtp)
2. [Configuración con Gmail](#configuración-con-gmail)
3. [Configuración con Outlook/Office 365](#configuración-con-outlookoffice-365)
4. [Configuración Manual](#configuración-manual)
5. [Verificación de Configuración](#verificación-de-configuración)
6. [Solución de Problemas](#solución-de-problemas)

---

## ¿Qué es SMTP?

SMTP (Simple Mail Transfer Protocol) es el protocolo que permite enviar correos electrónicos. Para que el sistema pueda enviar correos de recuperación de contraseña, necesitas configurar un servidor SMTP.

El sistema utiliza el archivo `smtp_config.json` ubicado en la raíz del proyecto para almacenar la configuración del correo.

---

## 🔧 Configuración con Gmail

### Paso 1: Crear una Contraseña de Aplicación

Gmail requiere que uses una "Contraseña de aplicación" en lugar de tu contraseña normal.

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. En el menú izquierdo, selecciona **Seguridad**
3. Busca la sección **Verificación en dos pasos** y actívala si no lo está
4. Una vez activada, busca **Contraseñas de aplicaciones**
5. Selecciona:
   - Aplicación: **Correo**
   - Dispositivo: **Otro (nombre personalizado)**
   - Ingresa: **AI Platform Novus**
6. Haz clic en **Generar**
7. **Copia la contraseña de 16 caracteres** (guárdala en un lugar seguro)

### Paso 2: Configurar el archivo smtp_config.json

Edita el archivo `smtp_config.json` en la raíz del proyecto:

```json
{
  "smtp_server": "smtp.gmail.com",
  "smtp_port": 587,
  "smtp_username": "tu-correo@gmail.com",
  "smtp_password": "tu-contraseña-de-aplicacion",
  "from_email": "tu-correo@gmail.com",
  "enabled": true
}
```

**Importante:**
- Usa la contraseña de aplicación de 16 caracteres, NO tu contraseña normal
- Cambia `enabled` a `true` para activar el envío de correos
- El `from_email` debe ser el mismo correo que estás usando

---

## 📧 Configuración con Outlook/Office 365

### Para Outlook.com (cuentas personales)

```json
{
  "smtp_server": "smtp-mail.outlook.com",
  "smtp_port": 587,
  "smtp_username": "tu-correo@outlook.com",
  "smtp_password": "tu-contraseña",
  "from_email": "tu-correo@outlook.com",
  "enabled": true
}
```

### Para Office 365 (cuentas corporativas)

```json
{
  "smtp_server": "smtp.office365.com",
  "smtp_port": 587,
  "smtp_username": "tu-correo@tuempresa.com",
  "smtp_password": "tu-contraseña",
  "from_email": "tu-correo@tuempresa.com",
  "enabled": true
}
```

**Nota:** Si tienes autenticación de dos factores activada, necesitarás crear una contraseña de aplicación similar a Gmail.

---

## ⚙️ Configuración Manual

### Otros Proveedores de Correo

Si usas otro proveedor (GoDaddy, Zoho, etc.), necesitarás buscar la configuración SMTP específica de tu proveedor. Los datos que necesitas son:

- **Servidor SMTP** (ejemplo: smtp.tuproveedor.com)
- **Puerto** (generalmente 587 para TLS o 465 para SSL)
- **Usuario** (tu dirección de correo completa)
- **Contraseña** (tu contraseña de correo o contraseña de aplicación)

Formato del archivo `smtp_config.json`:

```json
{
  "smtp_server": "smtp.tuproveedor.com",
  "smtp_port": 587,
  "smtp_username": "tu-correo@tudominio.com",
  "smtp_password": "tu-contraseña",
  "from_email": "noreply@tudominio.com",
  "enabled": true
}
```

### Configuración con Variables de Entorno (Alternativa)

Si prefieres no guardar la configuración en el archivo JSON, puedes usar variables de entorno:

```bash
# En Windows (PowerShell)
$env:SMTP_SERVER="smtp.gmail.com"
$env:SMTP_PORT="587"
$env:SMTP_USERNAME="tu-correo@gmail.com"
$env:SMTP_PASSWORD="tu-contraseña-de-aplicacion"
$env:FROM_EMAIL="tu-correo@gmail.com"

# En Linux/Mac (bash)
export SMTP_SERVER="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USERNAME="tu-correo@gmail.com"
export SMTP_PASSWORD="tu-contraseña-de-aplicacion"
export FROM_EMAIL="tu-correo@gmail.com"
```

**Nota:** Si usas variables de entorno, el archivo `smtp_config.json` debe tener `enabled: false`.

---

## ✅ Verificación de Configuración

### Probar el Envío de Correos

1. **Reinicia el servidor backend:**
   ```bash
   # Detén el servidor (Ctrl+C)
   # Vuelve a iniciarlo
   cd C:\Users\AnaLuciaMatarritaGra\Documents\ai-platform-novus
   uvicorn src.api.main:app --reload
   ```

2. **Prueba la recuperación de contraseña:**
   - Ve al login: http://localhost:5173/login
   - Haz clic en "¿Olvidaste tu contraseña?"
   - Ingresa un correo de usuario registrado
   - Verifica que llegue el correo

3. **Revisa los logs del servidor:**
   - En la terminal del backend deberías ver:
     ```
     ✓ Password reset email sent to usuario@ejemplo.com
     ```
   - Si hay errores, aparecerán con:
     ```
     ✗ Error sending email: [descripción del error]
     ```

---

## 🔍 Solución de Problemas

### Error: "Authentication failed"

**Causa:** Credenciales incorrectas o falta de contraseña de aplicación.

**Solución:**
- Verifica que estés usando la contraseña de aplicación (no tu contraseña normal)
- Confirma que el correo esté escrito correctamente
- En Gmail, asegúrate de que la verificación en dos pasos esté activada

### Error: "Connection refused" o "Timeout"

**Causa:** Problema de conexión al servidor SMTP o puerto incorrecto.

**Solución:**
- Verifica que el puerto sea 587 (TLS) o 465 (SSL)
- Comprueba tu firewall o antivirus
- Verifica que tengas conexión a internet

### Error: "SMTPAuthenticationError"

**Causa:** Gmail bloqueó el acceso por seguridad.

**Solución:**
1. Ve a: https://myaccount.google.com/lesssecureapps
2. O mejor aún, usa contraseñas de aplicación (más seguro)

### Los correos no llegan

**Posibles causas:**
1. **Revisa la carpeta de SPAM** del destinatario
2. **Verifica el correo remitente:** Algunos proveedores marcan como spam correos de cuentas nuevas
3. **Límite de envíos:** Gmail tiene límites (500 correos/día para cuentas normales)

### Modo de Desarrollo

Si `smtp_username` o `smtp_password` están vacíos, el sistema funciona en "modo desarrollo":
- No envía correos reales
- Imprime el enlace de recuperación en la consola del servidor
- Útil para desarrollo local sin configurar SMTP

---

## 🔐 Seguridad

### Recomendaciones de Seguridad:

1. **No subas el archivo smtp_config.json a Git:**
   - Ya está incluido en `.gitignore`
   - Nunca compartas tus contraseñas

2. **Usa contraseñas de aplicación:**
   - Más seguro que usar tu contraseña principal
   - Puedes revocarlas sin cambiar tu contraseña

3. **Para producción:**
   - Usa variables de entorno en Azure
   - O mejor aún, usa Azure Key Vault (ya configurado en el proyecto)

4. **Correo remitente dedicado:**
   - Considera crear un correo específico como `noreply@tudominio.com`
   - No uses tu correo personal para envíos automáticos

---

## 📝 Ejemplo Completo de Configuración

### Archivo smtp_config.json (Gmail):

```json
{
  "smtp_server": "smtp.gmail.com",
  "smtp_port": 587,
  "smtp_username": "julia.novus@gmail.com",
  "smtp_password": "abcd efgh ijkl mnop",
  "from_email": "julia.novus@gmail.com",
  "enabled": true
}
```

### Variables de Entorno en Azure (Producción):

En Azure Container Apps, configura estas variables de entorno:

```
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=julia.novus@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
FROM_EMAIL=julia.novus@gmail.com
FRONTEND_URL=https://tu-app.azurewebsites.net
```

---

## 🚀 Configuración en Azure (Producción)

Para configurar SMTP en producción en Azure:

1. **Ve a Azure Portal:** https://portal.azure.com
2. Busca tu Container App: `app-chatbot-novus`
3. En el menú izquierdo, selecciona **Configuration**
4. Agrega las variables de entorno:
   - `SMTP_SERVER`
   - `SMTP_PORT`
   - `SMTP_USERNAME`
   - `SMTP_PASSWORD`
   - `FROM_EMAIL`
   - `FRONTEND_URL` (URL de tu aplicación en producción)
5. Guarda los cambios
6. La aplicación se reiniciará automáticamente

---

## ❓ Preguntas Frecuentes

**P: ¿Necesito configurar SMTP obligatoriamente?**
R: No, el sistema funciona sin SMTP pero los usuarios no podrán recuperar sus contraseñas olvidadas. Los administradores tendrán que cambiar las contraseñas manualmente.

**P: ¿Puedo usar mi correo personal de Gmail?**
R: Sí, pero considera crear un correo específico para la aplicación por seguridad y profesionalismo.

**P: ¿Cuántos correos puedo enviar?**
R: Gmail: ~500/día, Outlook: ~300/día. Para más volumen, considera servicios como SendGrid, AWS SES, o Mailgun.

**P: ¿Los correos son seguros?**
R: Sí, el sistema usa TLS/SSL para encriptar la conexión con el servidor SMTP.

---

## 📞 Soporte

Si tienes problemas con la configuración:

1. Revisa los logs del servidor backend
2. Verifica que `enabled: true` en `smtp_config.json`
3. Confirma que las credenciales sean correctas
4. Prueba primero en modo desarrollo (credenciales vacías) para ver si el flujo funciona

---

**Última actualización:** 27 de enero de 2026

© 2026 Novus Soluciones S.A.
