"""
Middleware de autenticación JWT para proteger endpoints
"""

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from functools import wraps
from typing import Optional, Callable
import logging

logger = logging.getLogger(__name__)


def get_current_user_from_token(request: Request, auth_service) -> Optional[dict]:
    """
    Extraer y validar usuario desde el token JWT

    Args:
        request: Request object de FastAPI
        auth_service: Instancia de AuthService

    Returns:
        dict con datos del usuario o None si no es válido
    """
    try:
        # Extraer token del header
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        token = auth_header.replace('Bearer ', '')

        # Verificar token
        payload = auth_service.verify_token(token)

        if not payload:
            return None

        # Obtener usuario de la base de datos
        users = auth_service._load_users()
        user_email = payload.get('sub')

        for user in users:
            if user['email'] == user_email and user.get('is_active', True):
                # Retornar usuario sin datos sensibles
                user_data = user.copy()
                user_data.pop('hashed_password', None)
                user_data.pop('password_reset_token', None)
                user_data.pop('password_reset_expires', None)
                return user_data

        return None

    except Exception as e:
        logger.error(f"Error validando token: {e}", exc_info=True)
        return None


async def require_auth(request: Request, auth_service) -> dict:
    """
    Verificar que la petición tenga un token válido

    Args:
        request: Request object de FastAPI
        auth_service: Instancia de AuthService

    Returns:
        dict con datos del usuario

    Raises:
        HTTPException: Si no hay token o es inválido
    """
    user = get_current_user_from_token(request, auth_service)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="No autenticado. Por favor inicia sesión.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return user


async def require_admin(request: Request, auth_service) -> dict:
    """
    Verificar que la petición tenga un token válido de un usuario admin

    Args:
        request: Request object de FastAPI
        auth_service: Instancia de AuthService

    Returns:
        dict con datos del usuario admin

    Raises:
        HTTPException: Si no hay token, es inválido, o no es admin
    """
    user = await require_auth(request, auth_service)

    if user.get('role') != 'admin':
        raise HTTPException(
            status_code=403,
            detail="Acceso denegado. Se requieren permisos de administrador."
        )

    return user


def protected_endpoint(require_admin_role: bool = False):
    """
    Decorador para proteger endpoints con autenticación JWT

    Args:
        require_admin_role: Si True, requiere que el usuario sea admin

    Uso:
        @app.get("/api/protected")
        @protected_endpoint()
        async def protected_route(request: Request, current_user: dict):
            return {"user": current_user["email"]}

        @app.get("/api/admin-only")
        @protected_endpoint(require_admin_role=True)
        async def admin_route(request: Request, current_user: dict):
            return {"admin": current_user["email"]}
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Buscar el objeto Request en los argumentos
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break

            if not request:
                raise HTTPException(
                    status_code=500,
                    detail="Request object not found"
                )

            # Importar auth_service dinámicamente para evitar imports circulares
            from src.services.auth_service import AuthService
            auth_service = AuthService()

            # Verificar autenticación
            if require_admin_role:
                current_user = await require_admin(request, auth_service)
            else:
                current_user = await require_auth(request, auth_service)

            # Agregar current_user a kwargs
            kwargs['current_user'] = current_user

            # Ejecutar la función original
            return await func(*args, **kwargs)

        return wrapper
    return decorator


# Función helper para uso directo en endpoints
async def get_optional_user(request: Request, auth_service) -> Optional[dict]:
    """
    Obtener usuario del token si existe, pero no requiere autenticación

    Args:
        request: Request object de FastAPI
        auth_service: Instancia de AuthService

    Returns:
        dict con datos del usuario o None
    """
    return get_current_user_from_token(request, auth_service)
