from botbuilder.core import BotFrameworkAdapter, BotFrameworkAdapterSettings, TurnContext
from botbuilder.schema import Activity, ActivityTypes
from botframework.connector.auth import MicrosoftAppCredentials
from src.services.keyvault_service import KeyVaultService
from src.services.azure_search_service import AzureSearchService
from src.services.web_search_service import WebSearchService
from src.services.novus_website_tool import NovusWebsiteTool
from .keyvault_service import KeyVaultService
import traceback
import logging
from openai import AsyncAzureOpenAI
import os
import aiohttp
import asyncio
import base64
import re
import requests
import json

logger = logging.getLogger(__name__)

class TeamsService:
    def __init__(self):
        kv = KeyVaultService()
        app_id = kv.get_secret("MICROSOFT-APP-ID")
        app_password = kv.get_secret("MICROSOFT-APP-PASSWORD")
        tenant_id = kv.get_secret("MICROSOFT-APP-TENANT-ID")
        api_version=os.getenv('AZURE_OPENAI_API_VERSION') or '2024-02-15-preview'
        
        logger.info(f"App ID cargado: {app_id[:8]}...")
        logger.info("Inicializando JulIA - Asistente IA de Novus con function calling")
        
        settings = BotFrameworkAdapterSettings(
            app_id=app_id,
            app_password=app_password,
            channel_auth_tenant=tenant_id  
        )
        
        self.adapter = BotFrameworkAdapter(settings)
        self.adapter.on_turn_error = self._on_error
        
        self.app_id = app_id
        self.app_password = app_password
        self.tenant_id = tenant_id
        
        self.kv = kv
        self.search_service = AzureSearchService()
        self.web_service = WebSearchService()
        
        self.client = AsyncAzureOpenAI(
            azure_endpoint=kv.get_secret('AzureOpenAIEndpoint'),
            api_key=kv.get_secret('AzureOpenAIKey'),
            api_version=os.getenv('AZURE_OPENAI_API_VERSION')
        )
        self.deployment = os.getenv('AZURE_OPENAI_DEPLOYMENT_GPT4')
        
        # Definir herramientas disponibles
        self.tools = [
            NovusWebsiteTool.get_tool_definition()
        ]
        
        self.conversation_histories = {}
        
        logger.info("JulIA inicializada correctamente con WordPress API tool")
    
    async def _on_error(self, context: TurnContext, error: Exception):
        logger.error(f"Error en Teams bot: {error}", exc_info=True)
        try:
            await context.send_activity("Disculpa, ocurrió un error. Intenta de nuevo.")
        except:
            pass
    
    async def process_activity(self, body: dict, auth_header: str):
        activity = Activity().deserialize(body)
        auth_header = auth_header or ""
        await self.adapter.process_activity(activity, auth_header, self._handle_message)
    
    async def _download_image(self, attachment_url: str, turn_context: TurnContext):
        """Descargar imagen desde Teams"""
        try:
            logger.info(f"Descargando imagen...")
            
            token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
            token_data = {
                'grant_type': 'client_credentials',
                'client_id': self.app_id,
                'client_secret': self.app_password,
                'scope': 'https://api.botframework.com/.default'
            }
            
            token_response = requests.post(token_url, data=token_data)
            
            if token_response.status_code != 200:
                logger.error(f"Error token: {token_response.status_code}")
                return None, None
            
            access_token = token_response.json().get('access_token')
            
            if not access_token:
                logger.error("No access_token")
                return None, None
            
            logger.info("Token OK")
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "*/*"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(attachment_url, headers=headers, allow_redirects=True) as response:
                    if response.status == 200:
                        image_data = await response.read()
                        base64_image = base64.b64encode(image_data).decode('utf-8')
                        content_type = self._detect_image_type(image_data)
                        
                        logger.info(f"✓ Imagen: {len(image_data)} bytes")
                        return base64_image, content_type
                    else:
                        logger.error(f"✗ Status {response.status}")
                        return None, None
            
        except Exception as e:
            logger.error(f"Error: {e}")
            return None, None
    
    def _detect_image_type(self, image_bytes: bytes) -> str:
        if image_bytes[:2] == b'\xff\xd8':
            return 'image/jpeg'
        elif image_bytes[:8] == b'\x89PNG\r\n\x1a\n':
            return 'image/png'
        elif image_bytes[:3] == b'GIF':
            return 'image/gif'
        elif image_bytes[:4] == b'RIFF' and image_bytes[8:12] == b'WEBP':
            return 'image/webp'
        else:
            return 'image/jpeg'
    
    async def _handle_message(self, turn_context: TurnContext):
        if turn_context.activity.type == ActivityTypes.message:
            user_message = turn_context.activity.text or ""
            user_id = turn_context.activity.from_property.id
            user_name = turn_context.activity.from_property.name
            
            images = []
            if turn_context.activity.attachments:
                logger.info(f"Adjuntos: {len(turn_context.activity.attachments)}")
                
                for attachment in turn_context.activity.attachments:
                    logger.info(f"Tipo: {attachment.content_type}, Nombre: {attachment.name}")
                    
                    is_image = False
                    download_url = None
                    
                    if attachment.content_type == 'application/vnd.microsoft.teams.file.download.info':
                        if attachment.content:
                            download_url = attachment.content.get('downloadUrl')
                            file_type = attachment.content.get('fileType', '')
                            
                            logger.info(f"Teams file: {file_type}, URL: {bool(download_url)}")
                            
                            if file_type.startswith('image/') or any(ext in (attachment.name or '').lower() for ext in ['.jpg', '.png', '.gif', '.jpeg', '.webp']):
                                is_image = True
                    
                    elif attachment.content_type and attachment.content_type.startswith('image/'):
                        is_image = True
                        download_url = attachment.content_url
                    
                    elif attachment.name and any(attachment.name.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
                        is_image = True
                        download_url = attachment.content_url or (attachment.content.get('downloadUrl') if attachment.content else None)
                    
                    if is_image and download_url:
                        logger.info(f"✓ Procesando imagen")
                        
                        base64_image, content_type = await self._download_image(
                            download_url,
                            turn_context
                        )
                        
                        if base64_image:
                            images.append({
                                'base64': base64_image,
                                'content_type': content_type,
                                'name': attachment.name or 'imagen'
                            })
                            logger.info(f"✓ Imagen OK")
                    else:
                        logger.warning(f" NO imagen: {attachment.content_type}")
            
            if images:
                logger.info(f"Consulta con {len(images)} imagen(es)")
            else:
                logger.info(f"Consulta: {user_message}")
            
            await turn_context.send_activities([Activity(type=ActivityTypes.typing)])
            
            response = await self._process_query(user_message, user_id, user_name, images)
            
            await turn_context.send_activity(response)
            logger.info(f"✓ Enviado")
        
        elif turn_context.activity.type == ActivityTypes.conversation_update:
            if turn_context.activity.members_added:
                for member in turn_context.activity.members_added:
                    if member.id != turn_context.activity.recipient.id:
                        welcome_message = (
                            "**¡Hola! Soy JulIA **\n\n"
                            "**Jul**ia - **I**nteligencia **A**rtificial de Novus\n\n"
                            "Tu asistente con IA.\n\n"
                            "_¡Pregúntame lo que necesites!_"
                        )
                        await turn_context.send_activity(welcome_message)
    
    async def _process_query(self, message: str, user_id: str, user_name: str, images: list = None):
        try:
            conversation_history = self.conversation_histories.get(user_id, [])
            
            # Buscar en documentos internos
            internal_docs = []
            if self.search_service and self.search_service.enabled:
                search_query = message if message else "imagen"
                internal_docs = self.search_service.search(search_query, top=3)
            
            # Buscar en web si es necesario
            web_results = []
            if message and self._should_search_web(message):
                try:
                    web_results = await self.web_service.search_web(message, num_results=3)
                except:
                    pass
            
            context = self._build_context(internal_docs, user_name, has_images=bool(images), web_results=web_results)
            
            system_prompt = f"""Eres JulIA, asistente amigable de Novus Soluciones S.A.

Usuario: {user_name}

{context}

HERRAMIENTAS DISPONIBLES:
- Tienes acceso a la herramienta "get_novus_info" que consulta el sitio web oficial de Novus
- Úsala cuando el usuario pregunte sobre Novus, sus servicios, productos, contacto u otra info empresarial
- La herramienta obtiene información actualizada directamente del sitio web de Novus

INFORMACIÓN BÁSICA DE NOVUS:
- Email: info@novuscr.com
- Web: novuscr.com
- Horario: Lunes-Viernes 8:00 AM - 5:00 PM (Costa Rica)

PERSONALIDAD:
- Amigable, cálida, cercana
- Respuestas completas (4-6 párrafos)
- Tono natural

CAPACIDADES:
- Preguntas generales
- Analizar imágenes
- Extraer texto de fotos
- Consultar información actualizada de Novus usando herramientas

IMPORTANTE:
- Si el usuario pregunta sobre Novus, usa la herramienta get_novus_info
- Responde en el mismo idioma del usuario
- Sé detallada y natural"""

            messages = [{"role": "system", "content": system_prompt}]
            
            if conversation_history:
                messages.extend(conversation_history[-10:])
            
            if images:
                user_content = []
                
                if message:
                    user_content.append({"type": "text", "text": message})
                else:
                    user_content.append({"type": "text", "text": "Analiza esta imagen"})
                
                for img in images:
                    user_content.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{img['content_type']};base64,{img['base64']}"
                        }
                    })
                
                messages.append({"role": "user", "content": user_content})
            else:
                messages.append({"role": "user", "content": message})
            
            logger.info(f" Enviando mensaje a GPT-4 con function calling...")
            
            # Primera llamada con tools
            response = await self.client.chat.completions.create(
                model=self.deployment,
                messages=messages,
                tools=self.tools,
                tool_choice="auto",
                max_tokens=1000,
                temperature=0.7
            )
            
            response_message = response.choices[0].message
            
            # Verificar si el modelo quiere usar una herramienta
            if response_message.tool_calls:
                logger.info(f"🔧 GPT-4 quiere usar herramientas...")
                
                messages.append(response_message)
                
                for tool_call in response_message.tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    
                    logger.info(f"   └─ Ejecutando: {function_name}({function_args})")
                    
                    if function_name == "get_novus_info":
                        function_response = NovusWebsiteTool.execute(function_args)
                    else:
                        function_response = {"error": f"Función desconocida: {function_name}"}
                    
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(function_response, ensure_ascii=False)
                    })
                
                logger.info(f" Generando respuesta final con datos del sitio web...")
                final_response = await self.client.chat.completions.create(
                    model=self.deployment,
                    messages=messages,
                    max_tokens=1000,
                    temperature=0.7
                )
                
                bot_response = final_response.choices[0].message.content
            else:
                bot_response = response_message.content
            
            # Actualizar historial
            if images:
                history_message = message if message else f"[{len(images)} imagen(es)]"
                conversation_history.append({"role": "user", "content": history_message})
            else:
                conversation_history.append({"role": "user", "content": message})
            
            conversation_history.append({"role": "assistant", "content": bot_response})
            
            if len(conversation_history) > 20:
                conversation_history = conversation_history[-20:]
            
            self.conversation_histories[user_id] = conversation_history
            
            logger.info(f" Respuesta generada: {len(bot_response)} caracteres")
            return bot_response
            
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)
            return "Disculpa, hubo un error. Intenta de nuevo."
    
    def _should_search_web(self, message: str) -> bool:
        if not message:
            return False
            
        message_lower = message.lower()
        
        # NO buscar en web si es sobre Novus (usará la herramienta)
        if any(word in message_lower for word in ['novus', 'julia']):
            return False
        
        web_triggers = [
            "horario de", "telefono de", "direccion de",
            "noticias", "actualidad",
            "que es", "quien es",
            "clima", "temperatura"
        ]
        
        external_companies = [
            "microsoft", "google", "walmart", "banco"
        ]
        
        for trigger in web_triggers:
            if trigger in message_lower:
                return True
        
        for company in external_companies:
            if company in message_lower:
                return True
        
        return False
    
    def _build_context(self, internal_docs, user_name: str, has_images: bool = False, web_results: list = None):
        context = ""
        
        if web_results:
            context += "\n=== WEB ===\n"
            for i, result in enumerate(web_results, 1):
                context += f"[{i}] {result['title']}\n{result['content'][:400]}\n\n"
        
        if internal_docs:
            context += "\n=== DOCS ===\n"
            for i, doc in enumerate(internal_docs, 1):
                context += f"[{i}] {doc['title']}\n{doc['content'][:400]}\n\n"
        
        if has_images:
            context += "\n=== IMAGEN ===\n"
            context += "Usuario envió imagen.\n"
        
        return context

teams_service = TeamsService()