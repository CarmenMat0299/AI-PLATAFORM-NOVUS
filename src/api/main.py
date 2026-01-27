from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import json
import logging
import os
import tempfile
from datetime import datetime, date, timezone

def get_utc_now():
    """Obtener fecha/hora actual en UTC con formato ISO"""
    return datetime.now(timezone.utc).isoformat()
from src.services.azure_openai_service import AzureOpenAIService
from src.services.whatsapp_service import WhatsAppService
from src.services.escalation_service import EscalationService
from src.services.azure_vision_service import AzureVisionService
from src.services.azure_speech_service import AzureSpeechService
from src.services.conversation_service import ConversationService
from src.utils.faq_handler import check_faq
from fastapi import Request, Response
from src.services.teams_service import teams_service
from src.services.activity_service import ActivityService
from src.services.auth_service import AuthService
from src.services.email_service import EmailService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Novus AI Chatbot")

# AGREGAR CORS PARA EL DASHBOARD
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todos los origenes por ahora
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar servicios
openai_service = AzureOpenAIService()
whatsapp_service = WhatsAppService()
escalation_service = EscalationService()
vision_service = AzureVisionService()
speech_service = AzureSpeechService()
conversation_service = ConversationService()
activity_service = ActivityService()
auth_service = AuthService()
email_service = EmailService()

# Crear usuario admin inicial si no existe
auth_service.create_initial_admin()

# Registrar inicio del sistema
activity_service.log_activity(
    activity_type="system",
    message="Sistema iniciado",
    details="Todos los servicios cargados correctamente"
)

conversations = {}
MAX_HISTORY = 10

@app.get("/")
async def root():
    return {
        "status": "running",
        "service": "Novus AI Chatbot"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

# ============================================
# ENDPOINTS DE AUTENTICACIÓN
# ============================================

@app.post("/api/auth/login")
async def login(request: Request):
    """
    Autenticar usuario con email y contraseña

    Body:
        - email: str
        - password: str

    Returns:
        - access_token: JWT token
        - user: Datos del usuario (sin contraseña)
    """
    try:
        data = await request.json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return JSONResponse(
                content={"detail": "Email y contraseña requeridos"},
                status_code=400
            )

        # Autenticar usuario
        user = auth_service.authenticate_user(email, password)

        if not user:
            return JSONResponse(
                content={"detail": "Email o contraseña incorrectos"},
                status_code=401
            )

        # Crear token de acceso
        access_token = auth_service.create_access_token(
            data={"sub": user["email"], "user_id": user["id"]}
        )

        # Registrar actividad
        activity_service.log_activity(
            activity_type="auth",
            message=f"Usuario {user['full_name']} inició sesión",
            details=f"Email: {user['email']}"
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }

    except Exception as e:
        logger.error(f"Error en login: {e}", exc_info=True)
        return JSONResponse(
            content={"detail": "Error al procesar la solicitud"},
            status_code=500
        )

@app.get("/api/auth/me")
async def get_current_user(request: Request):
    """
    Obtener información del usuario actual desde el token JWT

    Headers:
        - Authorization: Bearer {token}

    Returns:
        - user: Datos del usuario actual
    """
    try:
        # Extraer token del header
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            return JSONResponse(
                content={"detail": "Token no proporcionado"},
                status_code=401
            )

        token = auth_header.replace('Bearer ', '')

        # Verificar token
        payload = auth_service.verify_token(token)

        if not payload:
            return JSONResponse(
                content={"detail": "Token inválido o expirado"},
                status_code=401
            )

        # Obtener usuario de la base de datos
        users = auth_service._load_users()
        user_email = payload.get('sub')

        user = None
        for u in users:
            if u['email'] == user_email:
                user = u.copy()
                user.pop('hashed_password', None)
                user.pop('password_reset_token', None)
                user.pop('password_reset_expires', None)
                break

        if not user:
            return JSONResponse(
                content={"detail": "Usuario no encontrado"},
                status_code=404
            )

        return {"user": user}

    except Exception as e:
        logger.error(f"Error en get_current_user: {e}", exc_info=True)
        return JSONResponse(
            content={"detail": "Error al procesar la solicitud"},
            status_code=500
        )

@app.post("/api/auth/logout")
async def logout(request: Request):
    """
    Cerrar sesión del usuario

    Note: En JWT stateless, el logout es manejado por el frontend
    eliminando el token. Este endpoint es para registro de actividad.
    """
    try:
        # Extraer información del usuario si hay token
        auth_header = request.headers.get('Authorization')

        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.replace('Bearer ', '')
            payload = auth_service.verify_token(token)

            if payload:
                user_email = payload.get('sub')

                # Registrar actividad
                activity_service.log_activity(
                    activity_type="auth",
                    message=f"Usuario cerró sesión",
                    details=f"Email: {user_email}"
                )

        return {"message": "Sesión cerrada exitosamente"}

    except Exception as e:
        logger.error(f"Error en logout: {e}", exc_info=True)
        return {"message": "Sesión cerrada"}

@app.post("/api/auth/forgot-password")
async def forgot_password(request: Request):
    """
    Solicitar restablecimiento de contraseña

    Body:
        - email: str

    Returns:
        - message: Confirmación
        - reset_token: Token para desarrollo (remover en producción)
    """
    try:
        data = await request.json()
        email = data.get('email')

        if not email:
            return JSONResponse(
                content={"detail": "Email requerido"},
                status_code=400
            )

        # Crear token de restablecimiento
        reset_token = auth_service.create_password_reset_token(email)

        if not reset_token:
            # Por seguridad, no revelamos si el email existe o no
            return {
                "message": "Si el email existe, recibirás instrucciones para restablecer tu contraseña"
            }

        # Registrar actividad
        activity_service.log_activity(
            activity_type="auth",
            message="Solicitud de restablecimiento de contraseña",
            details=f"Email: {email}"
        )

        # Enviar email con el link de reset
        email_sent = email_service.send_password_reset_email(email, reset_token)

        if email_sent:
            logger.info(f"✉️ Email de recuperación enviado a {email}")
        else:
            logger.warning(f"⚠️ No se pudo enviar email a {email}. Revisa la configuración SMTP.")

        # Siempre devolvemos el mismo mensaje por seguridad (no revelamos si el email existe)
        return {
            "message": "Si el email existe, recibirás instrucciones para restablecer tu contraseña"
        }

    except Exception as e:
        logger.error(f"Error en forgot_password: {e}", exc_info=True)
        return JSONResponse(
            content={"detail": "Error al procesar la solicitud"},
            status_code=500
        )

@app.post("/api/auth/reset-password")
async def reset_password(request: Request):
    """
    Restablecer contraseña usando token

    Body:
        - token: str (token de restablecimiento)
        - new_password: str

    Returns:
        - message: Confirmación
    """
    try:
        data = await request.json()
        token = data.get('token')
        new_password = data.get('new_password')

        if not token or not new_password:
            return JSONResponse(
                content={"detail": "Token y nueva contraseña requeridos"},
                status_code=400
            )

        if len(new_password) < 6:
            return JSONResponse(
                content={"detail": "La contraseña debe tener al menos 6 caracteres"},
                status_code=400
            )

        # Restablecer contraseña
        success = auth_service.reset_password(token, new_password)

        if not success:
            return JSONResponse(
                content={"detail": "Token inválido o expirado"},
                status_code=400
            )

        # Registrar actividad
        activity_service.log_activity(
            activity_type="auth",
            message="Contraseña restablecida exitosamente",
            details="Usuario utilizó token de restablecimiento"
        )

        return {"message": "Contraseña restablecida exitosamente"}

    except Exception as e:
        logger.error(f"Error en reset_password: {e}", exc_info=True)
        return JSONResponse(
            content={"detail": "Error al procesar la solicitud"},
            status_code=500
        )

@app.post("/api/auth/change-password")
async def change_password(request: Request):
    """
    Cambiar contraseña del usuario autenticado

    Headers:
        - Authorization: Bearer {token}

    Body:
        - current_password: str
        - new_password: str

    Returns:
        - message: Confirmación
    """
    try:
        # Extraer token del header
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            return JSONResponse(
                content={"detail": "Token no proporcionado"},
                status_code=401
            )

        token = auth_header.replace('Bearer ', '')
        payload = auth_service.verify_token(token)

        if not payload:
            return JSONResponse(
                content={"detail": "Token inválido o expirado"},
                status_code=401
            )

        user_email = payload.get('sub')

        # Obtener datos del body
        data = await request.json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')

        if not current_password or not new_password:
            return JSONResponse(
                content={"detail": "Contraseña actual y nueva contraseña requeridas"},
                status_code=400
            )

        if len(new_password) < 6:
            return JSONResponse(
                content={"detail": "La contraseña debe tener al menos 6 caracteres"},
                status_code=400
            )

        # Cambiar contraseña
        success = auth_service.change_password(user_email, current_password, new_password)

        if not success:
            return JSONResponse(
                content={"detail": "Contraseña actual incorrecta"},
                status_code=400
            )

        # Registrar actividad
        activity_service.log_activity(
            activity_type="auth",
            message=f"Usuario cambió su contraseña",
            details=f"Email: {user_email}"
        )

        return {"message": "Contraseña cambiada exitosamente"}

    except Exception as e:
        logger.error(f"Error en change_password: {e}", exc_info=True)
        return JSONResponse(
            content={"detail": "Error al procesar la solicitud"},
            status_code=500
        )

# ============================================
# CONFIGURACIÓN SMTP
# ============================================

@app.get("/api/smtp-config")
async def get_smtp_config(request: Request):
    """
    Obtener configuración SMTP actual (sin contraseña)

    Headers:
        - Authorization: Bearer {token} (requiere admin)

    Returns:
        - config: Configuración SMTP sin contraseña
    """
    try:
        # Verificar que sea admin
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JSONResponse(
                content={"detail": "No autenticado"},
                status_code=401
            )

        token = auth_header.replace('Bearer ', '')
        payload = auth_service.verify_token(token)

        if not payload:
            return JSONResponse(
                content={"detail": "Token inválido"},
                status_code=401
            )

        # Verificar que sea admin
        users = auth_service._load_users()
        user_email = payload.get('sub')
        user = next((u for u in users if u['email'] == user_email), None)

        if not user or user.get('role') != 'admin':
            return JSONResponse(
                content={"detail": "Acceso denegado. Se requieren permisos de administrador."},
                status_code=403
            )

        # Cargar configuración SMTP
        smtp_config_file = os.path.join(os.path.dirname(__file__), '..', '..', 'smtp_config.json')

        if os.path.exists(smtp_config_file):
            with open(smtp_config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)

            # No enviar la contraseña al frontend
            config_safe = config.copy()
            if config_safe.get('smtp_password'):
                config_safe['smtp_password'] = '••••••••'

            return {"config": config_safe}
        else:
            return {"config": {
                "smtp_server": "",
                "smtp_port": 587,
                "smtp_username": "",
                "smtp_password": "",
                "from_email": "",
                "enabled": False
            }}

    except Exception as e:
        logger.error(f"Error obteniendo configuración SMTP: {e}", exc_info=True)
        return JSONResponse(
            content={"detail": "Error al procesar la solicitud"},
            status_code=500
        )

@app.post("/api/smtp-config")
async def save_smtp_config(request: Request):
    """
    Guardar configuración SMTP

    Headers:
        - Authorization: Bearer {token} (requiere admin)

    Body:
        - smtp_server: str
        - smtp_port: int
        - smtp_username: str
        - smtp_password: str (opcional, solo si se cambia)
        - from_email: str
        - enabled: bool

    Returns:
        - message: Confirmación
    """
    try:
        # Verificar que sea admin
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JSONResponse(
                content={"detail": "No autenticado"},
                status_code=401
            )

        token = auth_header.replace('Bearer ', '')
        payload = auth_service.verify_token(token)

        if not payload:
            return JSONResponse(
                content={"detail": "Token inválido"},
                status_code=401
            )

        # Verificar que sea admin
        users = auth_service._load_users()
        user_email = payload.get('sub')
        user = next((u for u in users if u['email'] == user_email), None)

        if not user or user.get('role') != 'admin':
            return JSONResponse(
                content={"detail": "Acceso denegado. Se requieren permisos de administrador."},
                status_code=403
            )

        # Obtener datos del body
        data = await request.json()

        # Cargar configuración existente
        smtp_config_file = os.path.join(os.path.dirname(__file__), '..', '..', 'smtp_config.json')
        existing_config = {}

        if os.path.exists(smtp_config_file):
            with open(smtp_config_file, 'r', encoding='utf-8') as f:
                existing_config = json.load(f)

        # Actualizar configuración
        new_config = {
            "smtp_server": data.get('smtp_server', ''),
            "smtp_port": int(data.get('smtp_port', 587)),
            "smtp_username": data.get('smtp_username', ''),
            "from_email": data.get('from_email', ''),
            "enabled": data.get('enabled', False)
        }

        # Solo actualizar contraseña si se proporcionó una nueva (no '••••••••')
        if data.get('smtp_password') and data.get('smtp_password') != '••••••••':
            new_config['smtp_password'] = data.get('smtp_password')
        else:
            # Mantener contraseña existente
            new_config['smtp_password'] = existing_config.get('smtp_password', '')

        # Guardar configuración
        with open(smtp_config_file, 'w', encoding='utf-8') as f:
            json.dump(new_config, f, indent=2, ensure_ascii=False)

        # Reinicializar el servicio de email para cargar la nueva configuración
        global email_service
        email_service = EmailService()

        # Registrar actividad
        activity_service.log_activity(
            activity_type="config",
            message="Configuración SMTP actualizada",
            details=f"Por: {user_email}"
        )

        logger.info(f"✅ Configuración SMTP actualizada por {user_email}")

        return {"message": "Configuración SMTP guardada exitosamente"}

    except Exception as e:
        logger.error(f"Error guardando configuración SMTP: {e}", exc_info=True)
        return JSONResponse(
            content={"detail": "Error al procesar la solicitud"},
            status_code=500
        )

@app.post("/api/smtp-config/test")
async def test_smtp_config(request: Request):
    """
    Probar configuración SMTP enviando un email de prueba

    Headers:
        - Authorization: Bearer {token} (requiere admin)

    Body:
        - test_email: str (email de destino para la prueba)

    Returns:
        - success: bool
        - message: str
    """
    try:
        # Verificar que sea admin
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JSONResponse(
                content={"detail": "No autenticado"},
                status_code=401
            )

        token = auth_header.replace('Bearer ', '')
        payload = auth_service.verify_token(token)

        if not payload:
            return JSONResponse(
                content={"detail": "Token inválido"},
                status_code=401
            )

        # Verificar que sea admin
        users = auth_service._load_users()
        user_email = payload.get('sub')
        user = next((u for u in users if u['email'] == user_email), None)

        if not user or user.get('role') != 'admin':
            return JSONResponse(
                content={"detail": "Acceso denegado"},
                status_code=403
            )

        # Obtener email de prueba
        data = await request.json()
        test_email = data.get('test_email', user_email)

        # Enviar email de prueba
        success = email_service.send_password_reset_email(test_email, "test-token-12345")

        if success:
            return {
                "success": True,
                "message": f"Email de prueba enviado exitosamente a {test_email}"
            }
        else:
            return {
                "success": False,
                "message": "Error al enviar email de prueba. Verifica la configuración SMTP."
            }

    except Exception as e:
        logger.error(f"Error probando SMTP: {e}", exc_info=True)
        return JSONResponse(
            content={
                "success": False,
                "message": f"Error al probar configuración: {str(e)}"
            },
            status_code=500
        )

# ============================================
# GESTIÓN DE USUARIOS/COLABORADORES
# ============================================

@app.get("/api/users")
async def get_users(request: Request):
    """
    Obtener todos los usuarios/colaboradores

    Headers:
        - Authorization: Bearer {token} (requiere admin)

    Returns:
        - users: Lista de usuarios sin contraseñas
    """
    try:
        # Verificar que sea admin
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JSONResponse(content={"detail": "No autenticado"}, status_code=401)

        token = auth_header.replace('Bearer ', '')
        payload = auth_service.verify_token(token)

        if not payload:
            return JSONResponse(content={"detail": "Token inválido"}, status_code=401)

        # Verificar que sea admin
        users = auth_service._load_users()
        user_email = payload.get('sub')
        current_user = next((u for u in users if u['email'] == user_email), None)

        if not current_user or current_user.get('role') != 'admin':
            return JSONResponse(content={"detail": "Acceso denegado"}, status_code=403)

        # Devolver usuarios sin contraseñas
        users_safe = []
        for u in users:
            user_data = u.copy()
            user_data.pop('hashed_password', None)
            user_data.pop('password_reset_token', None)
            user_data.pop('password_reset_expires', None)
            users_safe.append(user_data)

        return {"users": users_safe}

    except Exception as e:
        logger.error(f"Error obteniendo usuarios: {e}", exc_info=True)
        return JSONResponse(content={"detail": "Error al procesar la solicitud"}, status_code=500)

@app.post("/api/users")
async def create_user(request: Request):
    """
    Crear nuevo usuario/colaborador

    Headers:
        - Authorization: Bearer {token} (requiere admin)

    Body:
        - email: str
        - full_name: str
        - role: str (admin, agent, supervisor)
        - department_id: str (opcional)
        - password: str (opcional, por defecto: novus123)

    Returns:
        - user: Usuario creado
    """
    try:
        # Verificar que sea admin
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JSONResponse(content={"detail": "No autenticado"}, status_code=401)

        token = auth_header.replace('Bearer ', '')
        payload = auth_service.verify_token(token)

        if not payload:
            return JSONResponse(content={"detail": "Token inválido"}, status_code=401)

        users = auth_service._load_users()
        user_email = payload.get('sub')
        current_user = next((u for u in users if u['email'] == user_email), None)

        if not current_user or current_user.get('role') != 'admin':
            return JSONResponse(content={"detail": "Acceso denegado"}, status_code=403)

        # Obtener datos del body
        data = await request.json()
        email = data.get('email', '').strip()
        full_name = data.get('full_name', '').strip()
        role = data.get('role', 'agent')
        department_id = data.get('department_id')
        password = data.get('password', 'novus123')

        if not email or not full_name:
            return JSONResponse(
                content={"detail": "Email y nombre completo son requeridos"},
                status_code=400
            )

        # Verificar que el email no exista
        if any(u['email'] == email for u in users):
            return JSONResponse(
                content={"detail": "El email ya está registrado"},
                status_code=400
            )

        # Crear nuevo usuario
        import uuid
        from datetime import datetime

        new_user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "full_name": full_name,
            "hashed_password": auth_service.get_password_hash(password),
            "role": role,
            "department_id": department_id,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "last_login": None,
            "password_reset_token": None,
            "password_reset_expires": None
        }

        users.append(new_user)
        auth_service._save_users(users)

        # Registrar actividad
        activity_service.log_activity(
            activity_type="user",
            message=f"Usuario creado: {full_name}",
            details=f"Email: {email}, Rol: {role}, Por: {user_email}"
        )

        logger.info(f"✅ Usuario creado: {email} por {user_email}")

        # Devolver usuario sin contraseña
        user_safe = new_user.copy()
        user_safe.pop('hashed_password')
        user_safe.pop('password_reset_token')
        user_safe.pop('password_reset_expires')

        return {"user": user_safe, "message": "Usuario creado exitosamente"}

    except Exception as e:
        logger.error(f"Error creando usuario: {e}", exc_info=True)
        return JSONResponse(content={"detail": "Error al procesar la solicitud"}, status_code=500)

@app.put("/api/users/{user_id}")
async def update_user(user_id: str, request: Request):
    """
    Actualizar usuario/colaborador

    Headers:
        - Authorization: Bearer {token} (requiere admin)

    Body:
        - email: str (opcional)
        - full_name: str (opcional)
        - role: str (opcional)
        - department_id: str (opcional)
        - is_active: bool (opcional)

    Returns:
        - user: Usuario actualizado
    """
    try:
        # Verificar que sea admin
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JSONResponse(content={"detail": "No autenticado"}, status_code=401)

        token = auth_header.replace('Bearer ', '')
        payload = auth_service.verify_token(token)

        if not payload:
            return JSONResponse(content={"detail": "Token inválido"}, status_code=401)

        users = auth_service._load_users()
        user_email = payload.get('sub')
        current_user = next((u for u in users if u['email'] == user_email), None)

        if not current_user or current_user.get('role') != 'admin':
            return JSONResponse(content={"detail": "Acceso denegado"}, status_code=403)

        # Buscar usuario a actualizar
        user_to_update = next((u for u in users if u['id'] == user_id), None)

        if not user_to_update:
            return JSONResponse(content={"detail": "Usuario no encontrado"}, status_code=404)

        # Obtener datos del body
        data = await request.json()

        # Actualizar campos
        if 'email' in data:
            new_email = data['email'].strip()
            # Verificar que el nuevo email no exista en otro usuario
            if any(u['email'] == new_email and u['id'] != user_id for u in users):
                return JSONResponse(
                    content={"detail": "El email ya está registrado"},
                    status_code=400
                )
            user_to_update['email'] = new_email

        if 'full_name' in data:
            user_to_update['full_name'] = data['full_name'].strip()

        if 'role' in data:
            user_to_update['role'] = data['role']

        if 'department_id' in data:
            user_to_update['department_id'] = data['department_id']

        if 'is_active' in data:
            user_to_update['is_active'] = data['is_active']

        auth_service._save_users(users)

        # Registrar actividad
        activity_service.log_activity(
            activity_type="user",
            message=f"Usuario actualizado: {user_to_update['full_name']}",
            details=f"Por: {user_email}"
        )

        logger.info(f"✅ Usuario actualizado: {user_to_update['email']} por {user_email}")

        # Devolver usuario sin contraseña
        user_safe = user_to_update.copy()
        user_safe.pop('hashed_password', None)
        user_safe.pop('password_reset_token', None)
        user_safe.pop('password_reset_expires', None)

        return {"user": user_safe, "message": "Usuario actualizado exitosamente"}

    except Exception as e:
        logger.error(f"Error actualizando usuario: {e}", exc_info=True)
        return JSONResponse(content={"detail": "Error al procesar la solicitud"}, status_code=500)

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    """
    Eliminar usuario/colaborador

    Headers:
        - Authorization: Bearer {token} (requiere admin)

    Returns:
        - message: Confirmación
    """
    try:
        # Verificar que sea admin
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JSONResponse(content={"detail": "No autenticado"}, status_code=401)

        token = auth_header.replace('Bearer ', '')
        payload = auth_service.verify_token(token)

        if not payload:
            return JSONResponse(content={"detail": "Token inválido"}, status_code=401)

        users = auth_service._load_users()
        user_email = payload.get('sub')
        current_user = next((u for u in users if u['email'] == user_email), None)

        if not current_user or current_user.get('role') != 'admin':
            return JSONResponse(content={"detail": "Acceso denegado"}, status_code=403)

        # No permitir eliminarse a sí mismo
        if current_user['id'] == user_id:
            return JSONResponse(
                content={"detail": "No puedes eliminarte a ti mismo"},
                status_code=400
            )

        # Buscar usuario a eliminar
        user_to_delete = next((u for u in users if u['id'] == user_id), None)

        if not user_to_delete:
            return JSONResponse(content={"detail": "Usuario no encontrado"}, status_code=404)

        # Eliminar usuario
        users = [u for u in users if u['id'] != user_id]
        auth_service._save_users(users)

        # Registrar actividad
        activity_service.log_activity(
            activity_type="user",
            message=f"Usuario eliminado: {user_to_delete['full_name']}",
            details=f"Email: {user_to_delete['email']}, Por: {user_email}"
        )

        logger.info(f"🗑️ Usuario eliminado: {user_to_delete['email']} por {user_email}")

        return {"message": "Usuario eliminado exitosamente"}

    except Exception as e:
        logger.error(f"Error eliminando usuario: {e}", exc_info=True)
        return JSONResponse(content={"detail": "Error al procesar la solicitud"}, status_code=500)

@app.post("/api/users/{user_id}/reset-password")
async def admin_reset_user_password(user_id: str, request: Request):
    """
    Resetear contraseña de un usuario (admin)

    Headers:
        - Authorization: Bearer {token} (requiere admin)

    Body:
        - new_password: str

    Returns:
        - message: Confirmación
    """
    try:
        # Verificar que sea admin
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JSONResponse(content={"detail": "No autenticado"}, status_code=401)

        token = auth_header.replace('Bearer ', '')
        payload = auth_service.verify_token(token)

        if not payload:
            return JSONResponse(content={"detail": "Token inválido"}, status_code=401)

        users = auth_service._load_users()
        user_email = payload.get('sub')
        current_user = next((u for u in users if u['email'] == user_email), None)

        if not current_user or current_user.get('role') != 'admin':
            return JSONResponse(content={"detail": "Acceso denegado"}, status_code=403)

        # Buscar usuario
        user_to_update = next((u for u in users if u['id'] == user_id), None)

        if not user_to_update:
            return JSONResponse(content={"detail": "Usuario no encontrado"}, status_code=404)

        # Obtener nueva contraseña
        data = await request.json()
        new_password = data.get('new_password', 'novus123')

        if len(new_password) < 6:
            return JSONResponse(
                content={"detail": "La contraseña debe tener al menos 6 caracteres"},
                status_code=400
            )

        # Actualizar contraseña
        user_to_update['hashed_password'] = auth_service.get_password_hash(new_password)
        auth_service._save_users(users)

        # Registrar actividad
        activity_service.log_activity(
            activity_type="user",
            message=f"Contraseña reseteada para: {user_to_update['full_name']}",
            details=f"Por admin: {user_email}"
        )

        logger.info(f"🔑 Contraseña reseteada para: {user_to_update['email']} por {user_email}")

        return {"message": f"Contraseña actualizada exitosamente para {user_to_update['full_name']}"}

    except Exception as e:
        logger.error(f"Error reseteando contraseña: {e}", exc_info=True)
        return JSONResponse(content={"detail": "Error al procesar la solicitud"}, status_code=500)

# ============================================
# WEBHOOKS
# ============================================

@app.get("/webhooks/whatsapp")
async def whatsapp_webhook_verify(request: Request):
    """
    Verificacion del webhook de WhatsApp (Meta Cloud API)
    """
    try:
        mode = request.query_params.get('hub.mode')
        token = request.query_params.get('hub.verify_token')
        challenge = request.query_params.get('hub.challenge')

        verify_token = os.getenv('WHATSAPP_VERIFY_TOKEN', 'novus-chatbot-2024')

        logger.info(f"Verificacion webhook - mode: {mode}, token: {token}")

        if mode == 'subscribe' and token == verify_token:
            logger.info("Webhook verificado exitosamente")
            return JSONResponse(content=int(challenge), status_code=200)
        else:
            logger.warning("Verificacion fallida")
            return JSONResponse(content={"error": "Verification failed"}, status_code=403)

    except Exception as e:
        logger.error(f"Error en verificacion: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/webhooks/whatsapp")
async def whatsapp_webhook(request: Request):
    """
    Recibir y procesar mensajes de WhatsApp (Meta Cloud API)
    """
    try:
        body = await request.body()
        body_str = body.decode('utf-8')
        webhook_data = json.loads(body_str)

        logger.info(f"Webhook recibido de Meta")

        if 'entry' not in webhook_data:
            logger.warning("Webhook sin 'entry', ignorando")
            return JSONResponse(content={"status": "ignored"}, status_code=200)

        for entry in webhook_data['entry']:
            if 'changes' not in entry:
                continue

            for change in entry['changes']:
                if change.get('field') != 'messages':
                    continue

                value = change.get('value', {})

                if 'messages' not in value:
                    logger.info("Webhook sin mensajes (posiblemente status), ignorando")
                    continue

                messages = value.get('messages', [])

                for message in messages:
                    message_id = message.get('id')
                    from_phone = message.get('from')
                    message_type = message.get('type')
                    timestamp = message.get('timestamp')

                    logger.info(f"Mensaje tipo '{message_type}' de {from_phone}")

                    await whatsapp_service.mark_message_as_read(message_id)

                    # ===== VERIFICAR SI USUARIO YA FUE ESCALADO =====
                    if escalation_service.is_escalated(from_phone):
                        escalation_msg = """Ya hemos registrado tu solicitud de atencion con un agente humano.

Un miembro de nuestro equipo te contactara pronto.

Si deseas continuar con el asistente automatico, escribe "volver al bot"."""

                        if message_type == 'text':
                            user_text = message.get('text', {}).get('body', '').lower()
                            if "volver al bot" in user_text or "continuar" in user_text:
                                escalation_service.resolve_escalation(from_phone)
                                await whatsapp_service.send_message(
                                    from_phone,
                                    "Perfecto, continuemos. En que puedo ayudarte?"
                                )
                                continue

                        await whatsapp_service.send_message(from_phone, escalation_msg)
                        continue

                    # ===== MANEJO DE TEXTO =====
                    if message_type == 'text':
                        user_message = message.get('text', {}).get('body', '')
                        logger.info(f"Mensaje de texto: {user_message}")

                        # Verificar FAQ
                        faq_response = check_faq(user_message)
                        if faq_response:
                            await whatsapp_service.send_message(from_phone, faq_response)
                            conversation_service.save_message(from_phone, user_message, role="user", channel="whatsapp")
                            conversation_service.save_message(from_phone, faq_response, role="assistant", channel="whatsapp")
                            logger.info("Respuesta FAQ enviada")
                            continue

                        # Detectar solicitud de agente humano
                        human_request_keywords = [
                            "hablar con una persona", "hablar con alguien",
                            "agente humano", "representante", "operador",
                            "persona real", "hablar con agente"
                        ]

                        if any(keyword in user_message.lower() for keyword in human_request_keywords):
                            history = conversations.get(from_phone, [])
                            escalation_service.escalate_to_human(from_phone, user_message, history)

                            escalation_msg = """Entendido. Te voy a conectar con un agente humano.

Un miembro de nuestro equipo te contactara en breve.

Horario de atencion: Lunes a Viernes, 8:00 AM - 5:00 PM"""

                            await whatsapp_service.send_message(from_phone, escalation_msg)
                            conversation_service.save_message(from_phone, user_message, role="user", channel="whatsapp")
                            conversation_service.save_message(from_phone, escalation_msg, role="assistant", channel="whatsapp")

                            activity_service.log_activity(
                                activity_type="escalation",
                                message="Escalacion solicitada",
                                details=f"Usuario solicito agente humano",
                                phone=from_phone
                            )

                            logger.info("Escalado a agente humano")
                            continue

                        # Generar respuesta con IA
                        history = conversations.get(from_phone, [])[-MAX_HISTORY:]
                        bot_response = await openai_service.generate_response(user_message, history, channel="whatsapp")

                        # Verificar si necesita escalacion
                        if openai_service.should_escalate(bot_response):
                            escalation_service.escalate_to_human(from_phone, user_message, history)
                            bot_response += """\n\nTe gustaria hablar con un agente humano? Responde "si" o "hablar con agente"."""

                        conversation_service.save_message(from_phone, user_message, role="user", channel="whatsapp")
                        conversation_service.save_message(from_phone, bot_response, role="assistant", channel="whatsapp")

                        # Guardar en historial
                        history.append({"role": "user", "content": user_message})
                        history.append({"role": "assistant", "content": bot_response})
                        conversations[from_phone] = history[-MAX_HISTORY:]

                        # Enviar respuesta
                        await whatsapp_service.send_message(from_phone, bot_response)
                        logger.info(f"Respuesta enviada a {from_phone}")

                        activity_service.log_activity(
                            activity_type="conversation",
                            message="Nueva conversación WhatsApp",
                            details=f"{from_phone} - {user_message[:40]}",
                            phone=from_phone
                        )

                    # ===== MANEJO DE IMAGENES =====
                    elif message_type == 'image':
                        image_data = message.get('image', {})
                        media_id = image_data.get('id')
                        caption = image_data.get('caption', '')

                        logger.info(f"Procesando imagen - Media ID: {media_id}")

                        if media_id:
                            media_bytes, mime_type = await whatsapp_service.download_media(media_id)

                            if media_bytes and len(media_bytes) > 0:
                                logger.info(f"Imagen descargada: {len(media_bytes)} bytes")

                                analysis = await vision_service.analyze_image_from_bytes(media_bytes)
                                ocr_text = await vision_service.extract_text_from_bytes(media_bytes)
                                image_summary = vision_service.create_image_summary(analysis, ocr_text)

                                logger.info(f"Analisis completado")

                                user_message = f"El usuario envio una imagen por WhatsApp."
                                if caption:
                                    user_message += f"\n\nMensaje del usuario: '{caption}'"
                                user_message += f"\n\nAnalisis de la imagen:\n{image_summary}\n\nResponde de manera util basandote en lo que ves en la imagen."

                                history = conversations.get(from_phone, [])[-MAX_HISTORY:]
                                bot_response = await openai_service.generate_response(user_message, history, channel="whatsapp")

                                conversation_service.save_message(from_phone, "[Usuario envio imagen]", role="user", channel="whatsapp")
                                conversation_service.save_message(from_phone, bot_response, role="assistant", channel="whatsapp")

                                history.append({"role": "user", "content": user_message})
                                history.append({"role": "assistant", "content": bot_response})
                                conversations[from_phone] = history[-MAX_HISTORY:]

                                await whatsapp_service.send_message(from_phone, bot_response)
                                logger.info(f"Respuesta a imagen enviada")

                                activity_service.log_activity(
                                    activity_type="conversation",
                                    message="Imagen recibida WhatsApp",
                                    details=f"{from_phone} envió una imagen",
                                    phone=from_phone
                                )
                            else:
                                await whatsapp_service.send_message(
                                    from_phone,
                                    "No pude descargar la imagen. Por favor, intentalo de nuevo."
                                )
                        else:
                            await whatsapp_service.send_message(
                                from_phone,
                                "No pude acceder a la imagen. Por favor, intentalo de nuevo."
                            )

                    # ===== MANEJO DE AUDIO =====
                    elif message_type == 'audio':
                        audio_data = message.get('audio', {})
                        media_id = audio_data.get('id')

                        logger.info(f"Procesando audio - Media ID: {media_id}")

                        if media_id:
                            media_bytes, mime_type = await whatsapp_service.download_media(media_id)

                            if media_bytes and len(media_bytes) > 0:
                                logger.info(f"Audio descargado: {len(media_bytes)} bytes")

                                with tempfile.NamedTemporaryFile(delete=False, suffix='.ogg') as temp_file:
                                    temp_file.write(media_bytes)
                                    temp_path = temp_file.name

                                try:
                                    transcribed_text = speech_service.speech_to_text(temp_path)

                                    if transcribed_text:
                                        logger.info(f"Audio transcrito: {transcribed_text}")

                                        faq_response = check_faq(transcribed_text)
                                        if faq_response:
                                            response_text = f"Escuche: '{transcribed_text}'\n\n{faq_response}"
                                            await whatsapp_service.send_message(from_phone, response_text)
                                            conversation_service.save_message(from_phone, f"[Audio]: {transcribed_text}", role="user", channel="whatsapp")
                                            conversation_service.save_message(from_phone, faq_response, role="assistant", channel="whatsapp")
                                            continue

                                        human_request_keywords = [
                                            "hablar con una persona", "hablar con alguien",
                                            "agente humano", "representante", "operador",
                                            "persona real", "hablar con agente"
                                        ]

                                        if any(keyword in transcribed_text.lower() for keyword in human_request_keywords):
                                            history = conversations.get(from_phone, [])
                                            escalation_service.escalate_to_human(from_phone, transcribed_text, history)
                                            escalation_msg = """Entendido. Te voy a conectar con un agente humano.

Un miembro de nuestro equipo te contactara en breve.

Horario de atencion: Lunes a Viernes, 8:00 AM - 5:00 PM"""

                                            await whatsapp_service.send_message(from_phone, escalation_msg)
                                            conversation_service.save_message(from_phone, f"[Audio]: {transcribed_text}", role="user", channel="whatsapp")
                                            conversation_service.save_message(from_phone, escalation_msg, role="assistant", channel="whatsapp")
                                            continue

                                        history = conversations.get(from_phone, [])[-MAX_HISTORY:]
                                        bot_response = await openai_service.generate_response(transcribed_text, history, channel="whatsapp")

                                        if openai_service.should_escalate(bot_response):
                                            escalation_service.escalate_to_human(from_phone, transcribed_text, history)
                                            bot_response += """\n\nTe gustaria hablar con un agente humano? Responde "si" o "hablar con agente"."""

                                        conversation_service.save_message(from_phone, f"[Audio]: {transcribed_text}", role="user", channel="whatsapp")
                                        conversation_service.save_message(from_phone, bot_response, role="assistant", channel="whatsapp")

                                        history.append({"role": "user", "content": f"[Audio]: {transcribed_text}"})
                                        history.append({"role": "assistant", "content": bot_response})
                                        conversations[from_phone] = history[-MAX_HISTORY:]

                                        await whatsapp_service.send_message(
                                            from_phone,
                                            f"Escuche: '{transcribed_text}'\n\n{bot_response}"
                                        )
                                        logger.info(f"Respuesta a audio enviada")

                                        activity_service.log_activity(
                                            activity_type="conversation",
                                            message="Audio recibido WhatsApp",
                                            details=f"{from_phone} - {transcribed_text[:40]}",
                                            phone=from_phone
                                        )
                                    else:
                                        await whatsapp_service.send_message(
                                            from_phone,
                                            "Lo siento, no pude entender el audio. Podrias escribir tu mensaje?"
                                        )
                                finally:
                                    try:
                                        os.unlink(temp_path)
                                    except:
                                        pass
                            else:
                                await whatsapp_service.send_message(
                                    from_phone,
                                    "No pude descargar el audio. Por favor, intentalo de nuevo."
                                )
                        else:
                            await whatsapp_service.send_message(
                                from_phone,
                                "No pude acceder al audio. Por favor, intentalo de nuevo."
                            )

                    # ===== OTROS TIPOS DE MENSAJES =====
                    else:
                        await whatsapp_service.send_message(
                            from_phone,
                            "Lo siento, solo puedo procesar mensajes de texto, imagenes y audios por ahora."
                        )
                        logger.warning(f"Tipo de mensaje no soportado: {message_type}")

        return JSONResponse(content={"status": "success"}, status_code=200)

    except Exception as e:
        logger.error(f"Error en webhook: {e}", exc_info=True)
        return JSONResponse(content={"status": "error"}, status_code=500)

@app.post("/api/test")
async def test_chat(request: Request):
    """Endpoint para pruebas"""
    try:
        data = await request.json()
        message = data.get('message', '')
        conversation_id = data.get('conversation_id', 'default')

        if not message:
            return JSONResponse(content={"error": "No message provided"}, status_code=400)

        faq_response = check_faq(message)
        if faq_response:
            conversation_service.save_message(conversation_id, message, role="user", channel="test")
            conversation_service.save_message(conversation_id, faq_response, role="assistant", channel="test")
            return {
                "user_message": message,
                "bot_response": faq_response,
                "type": "faq",
                "conversation_id": conversation_id
            }

        history = conversations.get(conversation_id, [])[-MAX_HISTORY:]
        response = await openai_service.generate_response(message, history, channel="whatsapp")

        conversation_service.save_message(conversation_id, message, role="user", channel="test")
        conversation_service.save_message(conversation_id, response, role="assistant", channel="test")

        history.append({"role": "user", "content": message})
        history.append({"role": "assistant", "content": response})
        conversations[conversation_id] = history[-MAX_HISTORY:]

        should_escalate = openai_service.should_escalate(response)

        return {
            "user_message": message,
            "bot_response": response,
            "type": "ai",
            "should_escalate": should_escalate,
            "conversation_id": conversation_id
        }
    except Exception as e:
        logger.error(f"Error en test: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/api/messages")
async def teams_messages(request: Request):
    """Endpoint para recibir mensajes de Microsoft Teams via Bot Framework"""
    try:
        body = await request.json()
        auth_header = request.headers.get("Authorization", "")

        await teams_service.process_activity(body, auth_header)

        return Response(status_code=200)

    except Exception as e:
        print(f"Error en endpoint /api/messages: {e}")
        return Response(status_code=500)

@app.get("/api/escalations")
async def get_escalations():
    """Ver todas las solicitudes de agente humano"""
    try:
        escalations_path = os.path.join(os.path.dirname(__file__), '..', '..', 'escalations.json')

        if os.path.exists(escalations_path):
            with open(escalations_path, 'r', encoding='utf-8') as f:
                escalations = json.load(f)
            return {"escalations": escalations, "count": len(escalations)}
        else:
            return {"escalations": [], "count": 0}
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/api/escalations/resolve")
async def resolve_escalation(request: Request):
    """Marcar una escalacion como resuelta"""
    try:
        data = await request.json()
        phone = data.get('phone')
        resolved_by = data.get('resolved_by')

        if not phone:
            return JSONResponse(
                content={"error": "Phone number required"},
                status_code=400
            )

        result = escalation_service.resolve_escalation(phone, resolved_by)

        if result:
            logger.info(f"Escalacion resuelta para {phone} por {resolved_by}")
            return {
                "success": True,
                "message": f"Escalacion resuelta para {phone}",
                "phone": phone,
                "resolved_by": resolved_by
            }
        else:
            return JSONResponse(
                content={
                    "success": False,
                    "message": f"No se encontro escalacion para {phone}"
                },
                status_code=404
            )

    except Exception as e:
        logger.error(f"Error resolviendo escalacion: {e}")
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.post("/api/escalations/priority")
async def update_escalation_priority(request: Request):
    """Actualizar prioridad de una escalacion"""
    try:
        data = await request.json()
        phone = data.get('phone')
        priority = data.get('priority')

        if not phone or not priority:
            return JSONResponse(
                content={"error": "Phone and priority required"},
                status_code=400
            )

        result = escalation_service.update_priority(phone, priority)

        if result:
            return {
                "success": True,
                "message": f"Prioridad actualizada para {phone}",
                "phone": phone,
                "priority": priority
            }
        else:
            return JSONResponse(
                content={
                    "success": False,
                    "message": f"No se encontro escalacion para {phone}"
                },
                status_code=404
            )

    except Exception as e:
        logger.error(f"Error actualizando prioridad: {e}")
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.post("/api/escalations/note")
async def add_escalation_note(request: Request):
    """Agregar nota interna a una escalacion"""
    try:
        data = await request.json()
        phone = data.get('phone')
        note = data.get('note')

        if not phone or not note:
            return JSONResponse(
                content={"error": "Phone and note required"},
                status_code=400
            )

        result = escalation_service.update_note(phone, note)

        if result:
            return {
                "success": True,
                "message": f"Nota agregada para {phone}",
                "phone": phone
            }
        else:
            return JSONResponse(
                content={
                    "success": False,
                    "message": f"No se encontro escalacion para {phone}"
                },
                status_code=404
            )

    except Exception as e:
        logger.error(f"Error agregando nota: {e}")
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.post("/api/escalations/assign")
async def assign_escalation_agent(request: Request):
    """Asignar o desasignar agente a una escalacion"""
    try:
        data = await request.json()
        phone = data.get('phone')
        agent = data.get('agent')  # Puede ser None para desasignar

        if not phone:
            return JSONResponse(
                content={"error": "Phone is required"},
                status_code=400
            )

        result = escalation_service.assign_agent(phone, agent)

        if result:
            action = "asignado" if agent else "desasignado"
            return {
                "success": True,
                "message": f"Agente {action} para {phone}",
                "phone": phone,
                "agent": agent
            }
        else:
            return JSONResponse(
                content={
                    "success": False,
                    "message": f"No se encontro escalacion para {phone}"
                },
                status_code=404
            )

    except Exception as e:
        logger.error(f"Error asignando agente: {e}")
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.post("/api/escalations/status")
async def update_escalation_status(request: Request):
    """Actualizar estado de una escalacion"""
    try:
        data = await request.json()
        phone = data.get('phone')
        status = data.get('status')

        if not phone or not status:
            return JSONResponse(
                content={"error": "Phone and status required"},
                status_code=400
            )

        result = escalation_service.update_status(phone, status)

        if result:
            return {
                "success": True,
                "message": f"Estado actualizado para {phone}",
                "phone": phone,
                "status": status
            }
        else:
            return JSONResponse(
                content={
                    "success": False,
                    "message": f"No se encontro escalacion para {phone}"
                },
                status_code=404
            )

    except Exception as e:
        logger.error(f"Error actualizando estado: {e}")
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.get("/api/conversations")
async def get_conversations():
    """Ver conversaciones del dia"""
    try:
        conversations_list = conversation_service.get_today_conversations()

        return {
            "conversations": conversations_list,
            "count": len(conversations_list),
            "date": date.today().isoformat()
        }
    except Exception as e:
        logger.error(f"Error obteniendo conversaciones: {e}")
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.get("/api/stats")
async def get_stats():
    """Estadisticas basicas del chatbot"""
    try:
        # Conversaciones del dia
        today_conversations = conversation_service.get_today_conversations()
        total_conversations = len(today_conversations)

        # Calcular mensajes de hoy
        total_messages = sum(conv.get('message_count', 0) for conv in today_conversations)

        # Calcular usuarios unicos
        unique_users = len(set(conv.get('phone') for conv in today_conversations if conv.get('phone')))

        # Escalaciones pendientes
        escalations_path = os.path.join(os.path.dirname(__file__), '..', '..', 'escalations.json')
        total_escalations = 0

        if os.path.exists(escalations_path):
            with open(escalations_path, 'r', encoding='utf-8') as f:
                escalations = json.load(f)
                total_escalations = len([e for e in escalations if not e.get('resolved', False)])

        return {
            "active_conversations": total_conversations,
            "total_escalations": total_escalations,
            "messages_today": total_messages,
            "unique_users": unique_users,
            "status": "running"
        }
    except Exception as e:
        logger.error(f"Error en stats: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/system-status")
async def get_system_status():
    """Verificar el estado de todos los servicios del sistema"""
    try:
        status = {
            "backend_api": {"status": "active", "message": "API funcionando correctamente"},
            "whatsapp": {"status": "checking", "message": "Verificando conexion..."},
            "teams": {"status": "checking", "message": "Verificando conexion..."},
            "azure_openai": {"status": "checking", "message": "Verificando conexion..."}
        }

        # WhatsApp
        try:
            if whatsapp_service and hasattr(whatsapp_service, 'access_token') and whatsapp_service.access_token:
                status["whatsapp"] = {
                    "status": "connected",
                    "message": "WhatsApp Business API conectado"
                }
            else:
                status["whatsapp"] = {
                    "status": "disconnected",
                    "message": "Token de WhatsApp no configurado"
                }
        except Exception as e:
            status["whatsapp"] = {
                "status": "error",
                "message": f"Error: {str(e)}"
            }

        # Teams
        try:
            if teams_service and hasattr(teams_service, 'app_id') and teams_service.app_id:
                status["teams"] = {
                    "status": "connected",
                    "message": "Microsoft Teams Bot conectado"
                }
            else:
                status["teams"] = {
                    "status": "disconnected",
                    "message": "Credenciales de Teams no configuradas"
                }
        except Exception as e:
            status["teams"] = {
                "status": "error",
                "message": f"Error: {str(e)}"
            }

        # Azure OpenAI
        try:
            if openai_service and hasattr(openai_service, 'client') and openai_service.client:
                status["azure_openai"] = {
                    "status": "available",
                    "message": "Azure OpenAI disponible"
                }
            else:
                status["azure_openai"] = {
                    "status": "error",
                    "message": "Cliente de OpenAI no inicializado"
                }
        except Exception as e:
            status["azure_openai"] = {
                "status": "error",
                "message": f"Error: {str(e)}"
            }

        return {
            "status": "success",
            "services": status,
            "timestamp": get_utc_now()
        }

    except Exception as e:
        logger.error(f"Error obteniendo system status: {e}")
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.get("/api/recent-activity")
async def get_recent_activity():
    """Obtener actividad reciente del sistema"""
    try:
        activities = activity_service.get_recent_activities(limit=10)

        return {
            "activities": activities,
            "count": len(activities),
            "timestamp": get_utc_now()
        }

    except Exception as e:
        logger.error(f"Error obteniendo actividad reciente: {e}")
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.get("/api/logs")
async def get_system_logs():
    """Obtener logs del sistema"""
    try:
        activities = activity_service.get_recent_activities(limit=100)

        logs = []
        for activity in activities:
            log_entry = {
                "id": f"log_{activity['timestamp']}",
                "timestamp": activity['timestamp'],
                "level": "warning" if activity['type'] == 'escalation' else "info",
                "type": activity['type'],
                "message": activity['message'],
                "details": activity['details'],
                "phone": activity.get('phone', None)
            }
            logs.append(log_entry)

        return {
            "logs": logs,
            "count": len(logs),
            "timestamp": get_utc_now()
        }

    except Exception as e:
        logger.error(f"Error obteniendo logs: {e}")
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.get("/api/metrics")
async def get_metrics():
    """Obtener métricas y datos para gráficos del dashboard"""
    try:
        from collections import defaultdict
        from datetime import datetime, timedelta, timezone
        import pytz
        from src.services.metrics_history_service import MetricsHistoryService

        # Inicializar servicio de métricas históricas
        metrics_history_service = MetricsHistoryService()

        # Cargar conversaciones
        conversations_list = conversation_service.get_today_conversations()

        # Cargar escalaciones
        escalations_path = os.path.join(os.path.dirname(__file__), '..', '..', 'escalations.json')
        escalations = []
        if os.path.exists(escalations_path):
            with open(escalations_path, 'r', encoding='utf-8') as f:
                escalations = json.load(f)

        # Calcular métricas por hora (últimas 24 horas)
        hourly_messages = defaultdict(int)
        cr_tz = pytz.timezone('America/Costa_Rica')
        now_utc = datetime.now(timezone.utc)
        now_cr = now_utc.astimezone(cr_tz)

        for conv in conversations_list:
            for msg in conv.get('messages', []):
                try:
                    msg_time = datetime.fromisoformat(msg['timestamp'])
                    if msg_time.tzinfo is None:
                        msg_time = cr_tz.localize(msg_time)
                    msg_time_cr = msg_time.astimezone(cr_tz)
                    hour_key = msg_time_cr.strftime('%-I%p').lower()
                    hourly_messages[hour_key] += 1
                except:
                    pass

        # Generar datos por hora (8am - 5pm)
        hours = ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm']
        hourly_data = [{'hour': h, 'mensajes': hourly_messages.get(h, 0)} for h in hours]

        # Calcular distribución por canal
        whatsapp_count = sum(1 for c in conversations_list if c.get('channel') == 'whatsapp')
        teams_count = sum(1 for c in conversations_list if c.get('channel') == 'teams')
        total_convs = whatsapp_count + teams_count

        if total_convs > 0:
            whatsapp_pct = round((whatsapp_count / total_convs) * 100)
            teams_pct = 100 - whatsapp_pct
        else:
            whatsapp_pct = 0
            teams_pct = 0

        channel_data = [
            {'name': 'WhatsApp', 'value': whatsapp_pct, 'color': '#25D366'},
            {'name': 'Teams', 'value': teams_pct, 'color': '#5558AF'}
        ]

        # Datos semanales desde el historial
        weekly_data = []
        last_7_days = metrics_history_service.get_last_n_days(7)

        # Ordenar por fecha ascendente
        last_7_days.sort(key=lambda x: x.get('date', ''))

        # weekday() retorna 0=Lunes, 1=Martes, ..., 6=Domingo
        days_es = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

        for snapshot in last_7_days:
            # Convertir fecha a día de la semana
            try:
                date_obj = datetime.fromisoformat(snapshot['date'])
                day_name = days_es[date_obj.weekday()]

                weekly_data.append({
                    'day': day_name,
                    'whatsapp': snapshot.get('whatsapp_conversations', 0),
                    'teams': snapshot.get('teams_conversations', 0)
                })
            except:
                pass

        return {
            'hourlyData': hourly_data,
            'channelData': channel_data,
            'weeklyData': weekly_data,
            'timestamp': get_utc_now()
        }

    except Exception as e:
        logger.error(f"Error calculando métricas: {e}", exc_info=True)
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.post("/api/metrics/save-snapshot")
async def save_metrics_snapshot():
    """Guardar snapshot de métricas del día actual (útil para testing o backups manuales)"""
    try:
        from src.services.metrics_history_service import MetricsHistoryService

        metrics_service = MetricsHistoryService()

        # Obtener conversaciones del día actual
        today_convs = conversation_service.get_today_conversations()
        today = date.today().isoformat()

        # Calcular métricas
        total_conversations = len(today_convs)
        whatsapp_convs = len([c for c in today_convs if c.get('channel') == 'whatsapp'])
        teams_convs = len([c for c in today_convs if c.get('channel') == 'teams'])

        total_messages = sum(c.get('message_count', 0) for c in today_convs)
        unique_users = len(set(c.get('phone') for c in today_convs if c.get('phone')))

        # Cargar escalaciones del día
        escalations_path = os.path.join(os.path.dirname(__file__), '..', '..', 'escalations.json')
        escalations_created = 0
        escalations_resolved = 0

        if os.path.exists(escalations_path):
            with open(escalations_path, 'r', encoding='utf-8') as f:
                all_escalations = json.load(f)

            for esc in all_escalations:
                esc_date = esc.get('timestamp', '')[:10]
                if esc_date == today:
                    escalations_created += 1
                    if esc.get('resolved', False):
                        escalations_resolved += 1

        # Guardar snapshot
        success = metrics_service.save_daily_snapshot(
            date_str=today,
            total_conversations=total_conversations,
            whatsapp_conversations=whatsapp_convs,
            teams_conversations=teams_convs,
            total_messages=total_messages,
            unique_users=unique_users,
            escalations_created=escalations_created,
            escalations_resolved=escalations_resolved
        )

        if success:
            return {
                "success": True,
                "message": f"Snapshot guardado para {today}",
                "data": {
                    "date": today,
                    "total_conversations": total_conversations,
                    "escalations_created": escalations_created,
                    "escalations_resolved": escalations_resolved
                }
            }
        else:
            return JSONResponse(
                content={"error": "Error guardando snapshot"},
                status_code=500
            )

    except Exception as e:
        logger.error(f"Error guardando snapshot manual: {e}", exc_info=True)
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
