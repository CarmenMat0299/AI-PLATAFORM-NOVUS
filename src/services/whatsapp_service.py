# src/services/whatsapp_cloud_service.py
import os
import logging
import aiohttp
from typing import Optional, Tuple
from .keyvault_service import KeyVaultService

logger = logging.getLogger(__name__)

class WhatsAppService:
    """
    Servicio de WhatsApp usando Meta Cloud API directamente
    Reemplazo para Azure Communication Service
    """
    def __init__(self):
        # Cargar credenciales desde Key Vault
        kv = KeyVaultService()
        
        # Nuevas variables para Meta WhatsApp Cloud API
        self.access_token = kv.get_secret('WhatsAppAccessToken')
        self.phone_number_id = kv.get_secret('WhatsAppPhoneNumberId')
        self.version = os.getenv('WHATSAPP_API_VERSION', 'v21.0')
        self.business_account_id = kv.get_secret('WhatsAppBusinessAccountId')  # Opcional
        
        self.base_url = f"https://graph.facebook.com/{self.version}"
        
        logger.info("WhatsApp Cloud Service inicializado")
        logger.info(f"Phone Number ID: {self.phone_number_id[:10]}...")
        
    async def send_message(self, to_phone: str, message: str):
        """Enviar mensaje de texto a WhatsApp"""
        try:
            url = f"{self.base_url}/{self.phone_number_id}/messages"
            
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            # Limpiar número de teléfono (quitar espacios y caracteres especiales)
            to_phone_clean = to_phone.replace("+", "").replace(" ", "").replace("-", "")
            
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to_phone_clean,
                "type": "text",
                "text": {
                    "preview_url": False,
                    "body": message
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    response_text = await response.text()
                    
                    if response.status == 200:
                        logger.info(f"Mensaje enviado a {to_phone_clean[:8]}...")
                        return True
                    else:
                        logger.error(f"Error enviando mensaje: {response.status}")
                        logger.error(f"Response: {response_text}")
                        return False
                        
        except Exception as e:
            logger.error(f"Excepción enviando mensaje: {e}", exc_info=True)
            return False
    
    async def download_media(self, media_id: str) -> Tuple[Optional[bytes], Optional[str]]:
        """
        Descargar media (imagen, audio, etc.) desde WhatsApp
        
        Proceso en 2 pasos según la API de Meta:
        1. GET media URL usando media_id
        2. GET el contenido desde la URL obtenida
        """
        try:
            logger.info(f" Descargando media ID: {media_id}")
            
            # PASO 1: Obtener URL del media
            media_url_endpoint = f"{self.base_url}/{media_id}"
            
            headers = {
                "Authorization": f"Bearer {self.access_token}"
            }
            
            async with aiohttp.ClientSession() as session:
                # Obtener la URL del media
                async with session.get(media_url_endpoint, headers=headers) as response:
                    if response.status != 200:
                        logger.error(f"Error obteniendo URL del media: {response.status}")
                        error_text = await response.text()
                        logger.error(f"Error: {error_text}")
                        return None, None
                    
                    media_info = await response.json()
                    media_url = media_info.get('url')
                    mime_type = media_info.get('mime_type', 'application/octet-stream')
                    
                    if not media_url:
                        logger.error("No se obtuvo URL del media")
                        return None, None
                    
                    logger.info(f"URL del media obtenida: {media_url[:50]}...")
                    logger.info(f"MIME type: {mime_type}")
                
                # PASO 2: Descargar el contenido del media
                async with session.get(media_url, headers=headers) as media_response:
                    if media_response.status != 200:
                        logger.error(f"Error descargando contenido: {media_response.status}")
                        return None, None
                    
                    media_bytes = await media_response.read()
                    
                    if len(media_bytes) > 0:
                        logger.info(f"Media descargado: {len(media_bytes)} bytes")
                        return media_bytes, mime_type
                    else:
                        logger.error("Media descargado pero está vacío")
                        return None, None
                        
        except Exception as e:
            logger.error(f"Excepción descargando media: {e}", exc_info=True)
            return None, None
    
    async def mark_message_as_read(self, message_id: str) -> bool:
        """Marcar mensaje como leído"""
        try:
            url = f"{self.base_url}/{self.phone_number_id}/messages"
            
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "messaging_product": "whatsapp",
                "status": "read",
                "message_id": message_id
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    return response.status == 200
                    
        except Exception as e:
            logger.error(f"Error marcando mensaje como leído: {e}")
            return False
    
    async def send_template_message(self, to_phone: str, template_name: str, 
                                   language_code: str = "es") -> bool:
        """Enviar mensaje de plantilla (opcional para el futuro)"""
        try:
            url = f"{self.base_url}/{self.phone_number_id}/messages"
            
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            to_phone_clean = to_phone.replace("+", "").replace(" ", "").replace("-", "")
            
            payload = {
                "messaging_product": "whatsapp",
                "to": to_phone_clean,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {
                        "code": language_code
                    }
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    if response.status == 200:
                        logger.info(f"Template enviado a {to_phone_clean}")
                        return True
                    else:
                        error = await response.text()
                        logger.error(f"Error enviando template: {error}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error enviando template: {e}")
            return False
    
    async def close(self):
        """Cerrar el cliente (compatibilidad con código existente)"""
        logger.info("WhatsApp service closed")
        pass