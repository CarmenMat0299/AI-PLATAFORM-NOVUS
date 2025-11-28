from botbuilder.core import BotFrameworkAdapter, BotFrameworkAdapterSettings, TurnContext
from botbuilder.schema import Activity, ActivityTypes
from botframework.connector.auth import MicrosoftAppCredentials
from src.services.keyvault_service import KeyVaultService
from src.services.azure_search_service import AzureSearchService
from src.services.web_search_service import WebSearchService
import traceback
import logging
from openai import AsyncAzureOpenAI
import os
import aiohttp
import asyncio
import base64
import re
import requests

logger = logging.getLogger(__name__)

class TeamsService:
    def __init__(self):
        # Cargar credenciales del Key Vault
        kv = KeyVaultService()
        app_id = kv.get_secret("MICROSOFT-APP-ID")
        app_password = kv.get_secret("MICROSOFT-APP-PASSWORD")
        tenant_id = kv.get_secret("MICROSOFT-APP-TENANT-ID")
        
        logger.info(f"App ID cargado: {app_id[:8]}...")
        logger.info(f"Password cargado: {app_password[:8] if app_password else 'None'}...")
        logger.info(f"Tenant ID cargado: {tenant_id[:8]}...")
        logger.info("Inicializando Teams Service para uso interno (RRHH/Administrativo)")
        
        # Configurar adaptador del Bot Framework con Tenant ID
        settings = BotFrameworkAdapterSettings(
            app_id=app_id,
            app_password=app_password,
            channel_auth_tenant=tenant_id  
        )
        
        self.adapter = BotFrameworkAdapter(settings)
        self.adapter.on_turn_error = self._on_error
        
        # Guardar credenciales para descargar imágenes
        self.app_id = app_id
        self.app_password = app_password
        self.tenant_id = tenant_id
        
        # Inicializar servicios
        self.kv = kv
        self.search_service = AzureSearchService()
        self.web_service = WebSearchService()
        self.web_service = WebSearchService()
        
        # Cliente OpenAI
        self.client = AsyncAzureOpenAI(
            azure_endpoint=kv.get_secret('AzureOpenAIEndpoint'),
            api_key=kv.get_secret('AzureOpenAIKey'),
            api_version=os.getenv('AZURE_OPENAI_API_VERSION')
        )
        self.deployment = os.getenv('AZURE_OPENAI_DEPLOYMENT_GPT4')
        
        # Diccionario para mantener historial de conversaciones por usuario
        self.conversation_histories = {}
        
        logger.info("Teams Service inicializado correctamente")
    
    async def _on_error(self, context: TurnContext, error: Exception):
        """Manejador de errores"""
        logger.error(f"Error en Teams bot: {error}", exc_info=True)
        traceback.print_exc()
        try:
            await context.send_activity("Disculpa, ocurrió un error. Por favor intenta de nuevo o contacta a RRHH directamente.")
        except:
            pass
    
    async def process_activity(self, body: dict, auth_header: str):
        """Procesar actividad de Teams"""
        activity = Activity().deserialize(body)
        auth_header = auth_header or ""
        await self.adapter.process_activity(activity, auth_header, self._handle_message)
    
    async def _download_image(self, attachment_url: str, turn_context: TurnContext):
        """Descargar imagen desde Teams y convertirla a base64"""
        try:
            logger.info(f"Descargando imagen desde: {attachment_url[:80]}...")
            
            # Obtener token usando tenant_id correcto
            token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
            token_data = {
                'grant_type': 'client_credentials',
                'client_id': self.app_id,
                'client_secret': self.app_password,
                'scope': 'https://api.botframework.com/.default'
            }
            
            # Obtener token (sincrono con requests como en WhatsApp)
            token_response = requests.post(token_url, data=token_data)
            
            if token_response.status_code != 200:
                logger.error(f"Error obteniendo token: {token_response.status_code}")
                logger.error(f"Response: {token_response.text}")
                return None, None
            
            token_json = token_response.json()
            access_token = token_json.get('access_token')
            
            if not access_token:
                logger.error("No se obtuvo access_token")
                logger.error(f"Response completa: {token_json}")
                return None, None
            
            logger.info("Token obtenido correctamente")
            
            # Descargar imagen con el token (igual que WhatsApp)
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "*/*"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(attachment_url, headers=headers) as response:
                    if response.status == 200:
                        image_data = await response.read()
                        base64_image = base64.b64encode(image_data).decode('utf-8')
                        
                        # Detectar tipo de imagen real basándose en los magic bytes
                        content_type = self._detect_image_type(image_data)
                        
                        logger.info(f"Imagen descargada: {len(image_data)} bytes, tipo: {content_type}")
                        return base64_image, content_type
                    else:
                        logger.error(f"Error descargando imagen: Status {response.status}")
                        error_text = await response.text()
                        logger.error(f"Error: {error_text}")
                        return None, None
            
        except Exception as e:
            logger.error(f"Error al descargar imagen: {e}", exc_info=True)
            return None, None
    
    def _detect_image_type(self, image_bytes: bytes) -> str:
        """Detectar tipo de imagen basándose en magic bytes"""
        if image_bytes[:2] == b'\xff\xd8':
            return 'image/jpeg'
        elif image_bytes[:8] == b'\x89PNG\r\n\x1a\n':
            return 'image/png'
        elif image_bytes[:3] == b'GIF':
            return 'image/gif'
        elif image_bytes[:4] == b'RIFF' and image_bytes[8:12] == b'WEBP':
            return 'image/webp'
        else:
            # Default a jpeg si no se puede detectar
            logger.warning("No se pudo detectar tipo de imagen, usando image/jpeg por defecto")
            return 'image/jpeg'
    
    async def _handle_message(self, turn_context: TurnContext):
        """Manejar mensaje recibido de Teams"""
        
        if turn_context.activity.type == ActivityTypes.message:
            user_message = turn_context.activity.text or ""
            user_id = turn_context.activity.from_property.id
            user_name = turn_context.activity.from_property.name
            user_email = turn_context.activity.from_property.aad_object_id
            
            # Detectar imágenes adjuntas
            images = []
            if turn_context.activity.attachments:
                logger.info(f"Se detectaron {len(turn_context.activity.attachments)} adjuntos")
                
                for attachment in turn_context.activity.attachments:
                    if attachment.content_type and attachment.content_type.startswith('image/'):
                        logger.info(f"Procesando imagen: {attachment.content_type}")
                        
                        base64_image, content_type = await self._download_image(
                            attachment.content_url, 
                            turn_context
                        )
                        
                        if base64_image:
                            images.append({
                                'base64': base64_image,
                                'content_type': content_type,
                                'name': attachment.name or 'imagen'
                            })
                            logger.info(f"Imagen agregada para analisis: {attachment.name}")
            
            if images:
                logger.info(f"Consulta con imagenes - Usuario: {user_name}, Texto: {user_message}, Imagenes: {len(images)}")
            else:
                logger.info(f"Consulta interna - Usuario: {user_name}, Mensaje: {user_message}")
            
            # Enviar indicador de "escribiendo..."
            await turn_context.send_activities([Activity(type=ActivityTypes.typing)])
            
            # Procesar consulta
            response = await self._process_hr_query(user_message, user_id, user_name, images)
            
            # Enviar respuesta
            await turn_context.send_activity(response)
            logger.info(f"Respuesta enviada a {user_name}")
        
        elif turn_context.activity.type == ActivityTypes.conversation_update:
            # Mensaje de bienvenida
            if turn_context.activity.members_added:
                for member in turn_context.activity.members_added:
                    if member.id != turn_context.activity.recipient.id:
                        welcome_message = (
                            "**Bienvenido al Asistente Administrativo de Novus**\n\n"
                            "Estoy aqui para ayudarte con:\n\n"
                            "**Vacaciones y permisos**\n"
                            "   - Politica de vacaciones\n"
                            "   - Dias disponibles\n"
                            "   - Como solicitar permisos\n\n"
                            "**Proyectos**\n"
                            "   - Estado de proyectos\n"
                            "   - Asignaciones de equipo\n"
                            "   - Informacion de clientes\n\n"
                            "**Politicas y procedimientos**\n"
                            "   - Manual de empleado\n"
                            "   - Beneficios\n"
                            "   - Horarios y politicas\n\n"
                            "**Contactos internos**\n"
                            "   - Directorio de empleados\n"
                            "   - Departamentos\n\n"
                            "**Tambien puedo analizar imagenes**\n"
                            "   - Documentos escaneados\n"
                            "   - Capturas de pantalla\n"
                            "   - Diagramas o graficos\n\n"
                            "_Solo preguntame lo que necesites o envia una imagen de un documento._"
                        )
                        await turn_context.send_activity(welcome_message)
                        logger.info(f"Bienvenida enviada a {member.name}")
    
    def _should_search_novus_website(self, message: str) -> bool:
        """Detectar si la consulta es sobre Novus"""
        if not message:
            return False
        
        message_lower = message.lower()
        
        keywords = [
            'novus', 'empresa', 'compañia', 'compania', 'servicios', 'ofrecen', 'hacen',
            'trabajan', 'especialidad', 'especializacion', 'contacto',
            'direccion', 'ubicacion', 'telefono', 'email', 'correo',
            'sitio web', 'pagina web', 'horario', 'clientes', 'proyectos',
            'portafolio', 'casos de exito', 'precios', 'tarifas', 'cotizacion',
            'que hace', 'que hacen', 'dedicarse', 'oferta', 'ofrece'
        ]
        
        found = any(keyword in message_lower for keyword in keywords)
        
        if found:
            logger.info(f"Palabras clave detectadas en: '{message}' - Se buscara en novuscr.com")
        
        return found
    
    def _should_search_web(self, message: str) -> bool:
        """Determinar si necesita busqueda en internet"""
        if not message:
            return False
            
        message_lower = message.lower()
        
        # Si menciona "novus" solo buscar en novuscr.com, no en internet general
        if "novus" in message_lower and not any(word in message_lower for word in ["busca", "buscar", "en internet", "en la web"]):
            return False
        
        # Si pregunta por OTRA empresa (no Novus)
        other_company_indicators = [
            "horario de", "hora de", "telefono de", "direccion de",
            "ubicacion de", "contacto de", "email de", "donde queda",
            "donde esta", "como llegar"
        ]
        
        for indicator in other_company_indicators:
            if indicator in message_lower and "novus" not in message_lower:
                return True
        
        # Palabras que indican necesidad de informacion actual
        web_triggers = [
            "noticias", "actualidad", "hoy", "ayer", "esta semana",
            "precio actual", "ultimo", "ultima", "reciente", "tendencia",
            "que es", "quien es", "como funciona", "definicion de",
            "clima", "tiempo", "temperatura",
            "cotizacion", "tipo de cambio", "dolar"
        ]
        
        # Empresas externas
        external_companies = [
            "microsoft", "google", "amazon", "apple", "meta", "facebook",
            "walmart", "mcdonalds", "banco", "automercado"
        ]
        
        for trigger in web_triggers:
            if trigger in message_lower:
                return True
        
        for company in external_companies:
            if company in message_lower:
                return True
        
        return False
    
    async def _fetch_novus_info(self, query: str) -> str:
        """Buscar informacion actualizada de Novus en su sitio web"""
        try:
            logger.info("Intentando acceder a novuscr.com...")
            
            url = "https://novuscr.com"
            timeout = aiohttp.ClientTimeout(total=15)
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                try:
                    async with session.get(url, headers=headers, ssl=False) as response:
                        if response.status == 200:
                            html = await response.text()
                            logger.info(f"HTML descargado: {len(html)} caracteres")
                            
                            # Extraer texto del HTML de forma más agresiva
                            # Remover scripts, estilos y comentarios
                            text = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
                            text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
                            text = re.sub(r'<!--.*?-->', '', text, flags=re.DOTALL)
                            text = re.sub(r'<noscript[^>]*>.*?</noscript>', '', text, flags=re.DOTALL | re.IGNORECASE)
                            
                            # Remover todos los tags HTML
                            text = re.sub(r'<[^>]+>', ' ', text)
                            
                            # Decodificar entidades HTML
                            text = text.replace('&nbsp;', ' ')
                            text = text.replace('&amp;', '&')
                            text = text.replace('&lt;', '<')
                            text = text.replace('&gt;', '>')
                            text = text.replace('&quot;', '"')
                            
                            # Normalizar espacios y saltos de línea
                            text = re.sub(r'\s+', ' ', text)
                            text = text.strip()
                            
                            logger.info(f"Texto extraido: {len(text)} caracteres")
                            
                            # Limitar tamaño pero mantener más contenido
                            if len(text) > 5000:
                                text = text[:5000] + "..."
                            
                            if text and len(text) > 150:
                                logger.info(f"Informacion obtenida de novuscr.com: {len(text)} caracteres")
                                logger.info(f"Preview: {text[:300]}...")
                                return f"\n=== INFORMACION DEL SITIO WEB NOVUSCR.COM ===\n{text}\n\nUSA ESTA INFORMACION PARA RESPONDER SOBRE LA EMPRESA.\n"
                            else:
                                logger.warning(f"Contenido extraido muy corto: {len(text)} chars")
                                logger.warning(f"Contenido completo: '{text}'")
                                return ""
                        
                        elif response.status == 404:
                            logger.warning("Sitio novuscr.com no encontrado (404)")
                            return ""
                        else:
                            logger.warning(f"No se pudo acceder a novuscr.com: Status {response.status}")
                            return ""
                
                except asyncio.TimeoutError:
                    logger.warning("Timeout al acceder a novuscr.com (15 segundos)")
                    return ""
                except aiohttp.ClientError as e:
                    logger.warning(f"Error de conexion a novuscr.com: {type(e).__name__}")
                    return ""
                except Exception as e:
                    logger.warning(f"Error inesperado accediendo a novuscr.com: {e}")
                    return ""
                    
        except Exception as e:
            logger.error(f"Error en _fetch_novus_info: {e}")
            return ""
    
    async def _process_hr_query(self, message: str, user_id: str, user_name: str, images: list = None):
        """Procesa consultas administrativas de RRHH, vacaciones, proyectos, etc."""
        try:
            conversation_history = self.conversation_histories.get(user_id, [])
            
            # Buscar en novuscr.com si preguntan sobre Novus
            novus_info = ""
            if message and self._should_search_novus_website(message):
                logger.info("Detectada consulta sobre Novus, buscando en sitio web...")
                novus_info = await self._fetch_novus_info(message)
            elif not message and images:
                logger.info("Usuario envio solo imagen(es) sin texto")
            
            # Buscar en documentos internos
            internal_docs = []
            if self.search_service and self.search_service.enabled:
                search_query = message if message else "imagen documento"
                internal_docs = self.search_service.search(search_query, top=5)
                logger.info(f"Documentos encontrados: {len(internal_docs)}")
            
            # Buscar en internet si es necesario
            web_results = []
            if message and self._should_search_web(message):
                try:
                    logger.info(f"Detectada necesidad de busqueda web para: '{message}'")
                    web_results = await self.web_service.search_web(message, num_results=3)
                    logger.info(f"Resultados web encontrados: {len(web_results)}")
                    if web_results:
                        logger.info(f"Primeros titulos: {[r.get('title', 'sin titulo')[:50] for r in web_results[:2]]}")
                except Exception as e:
                    logger.error(f"Error en busqueda web: {e}", exc_info=True)
            else:
                logger.info(f"No se requiere busqueda web para: '{message}'")
            
            # Construir contexto
            context = self._build_hr_context(internal_docs, user_name, has_images=bool(images), novus_info=novus_info, web_results=web_results)
            
            # System prompt
            system_prompt = f"""Eres el Asistente Administrativo virtual de Novus Soluciones S.A.

TU PROPOSITO:
Ayudar a los colaboradores con consultas sobre:
- Vacaciones, permisos y ausencias
- Informacion de proyectos internos
- Politicas y procedimientos de la empresa
- Beneficios y prestaciones
- Contactos internos y directorio
- Horarios y calendario laboral
- Analisis de documentos e imagenes
- Informacion sobre Novus (servicios, clientes, proyectos)
- Informacion general y consultas sobre otras empresas

INFORMACION BASICA DE CONTACTO (usa solo si preguntan):
- Email general: info@novuscr.com
- Email RRHH: rrhh@novuscr.com
- Sitio web: novuscr.com

USUARIO ACTUAL:
- Nombre: {user_name}
- Rol: Colaborador de Novus

{context}

INSTRUCCIONES IMPORTANTES:

1. IDENTIFICAR LA EMPRESA EN LA PREGUNTA:
   - Si preguntan por "Walmart", "Banco Nacional", otra empresa → NO es Novus
   - Si preguntan por "su horario", "ustedes", "la empresa", "Novus" → ES Novus
   
2. SI LA PREGUNTA NO ES SOBRE NOVUS (CRITICO - LEE CON ATENCION):
   - BUSCA en el contexto la seccion "INFORMACION DE INTERNET"
   - Si encuentras esa seccion, USA ESA INFORMACION para responder
   - Responde DIRECTAMENTE con la informacion encontrada
   - NO digas "no puedo navegar" o "no tengo acceso" si la informacion ya esta en el contexto
   - Si NO hay seccion de "INFORMACION DE INTERNET", entonces di: "No encontre informacion sobre [tema]. Necesitas ayuda con algo mas?"

3. SI LA PREGUNTA ES SOBRE NOVUS (SERVICIOS, PROYECTOS, CONTACTO):
   - CRITICO: BUSCA en el contexto la seccion "INFORMACION DEL SITIO WEB NOVUSCR.COM"
   - Si NO encuentras esa seccion, responde EXACTAMENTE: "No tengo acceso a la informacion actualizada del sitio web de Novus en este momento. Te recomiendo visitar novuscr.com o contactar a info@novuscr.com"
   - Si SI encuentras esa seccion:
     * USA UNICAMENTE la informacion que aparece ahi
     * NO agregues ni inventes servicios, contactos o datos que no esten explicitamente en esa seccion
     * Cita textualmente lo que dice el sitio
   - NUNCA uses informacion generica o de tu conocimiento sobre Novus
   - Los UNICOS contactos que puedes mencionar si NO hay info del sitio son: info@novuscr.com y rrhh@novuscr.com

4. POLITICA DE VACACIONES:
   - Busca primero en la documentacion interna
   - Si no hay info especifica, menciona: "Segun la legislacion costarricense, corresponden 2 semanas (14 dias) por año trabajado"
   - Sugiere verificar saldo personal con RRHH

5. SOLICITUD DE VACACIONES/PERMISOS:
   - Indica el proceso documentado
   - Recomienda notificar con anticipacion
   - Menciona que debe coordinarse con el supervisor directo

6. PROYECTOS:
   - Proporciona informacion general disponible en la base de datos
   - Para detalles especificos o confidenciales, sugiere contactar al Project Manager
   - No inventes informacion sobre proyectos

7. POLITICAS Y PROCEDIMIENTOS:
   - Usa SOLO informacion de documentos internos
   - Si no hay informacion disponible, di: "No tengo esa informacion especifica. Te recomiendo contactar a RRHH"
   - Nunca inventes politicas

8. ANALISIS DE IMAGENES:
   - Si el usuario envia una imagen, analizala cuidadosamente
   - Identifica el tipo de documento
   - Extrae informacion relevante
   - Ofrece ayuda segun el contenido
   - Manten confidencialidad con informacion sensible

CUANDO ESCALAR A RRHH:
- Solicitudes que requieren aprobacion formal
- Consultas sobre nomina o pagos
- Problemas laborales o conflictos
- Informacion personal confidencial
- Cualquier consulta que requiera acceso a sistemas de RRHH

DETECCION DE IDIOMA:
- SIEMPRE detecta el idioma en el que el usuario te escribe
- Responde EN EL MISMO IDIOMA que el usuario esta usando
- Si el usuario escribe en español, responde en español
- Si el usuario escribe en ingles, responde en ingles

ESTILO:
- Amigable pero profesional
- Respuestas claras y concisas
- Si no sabes algo, se honesto y ofrece alternativa
- Maximo 4 parrafos por respuesta"""

            messages = [{"role": "system", "content": system_prompt}]
            
            # Agregar historial
            if conversation_history:
                messages.extend(conversation_history[-10:])
            
            # Construir mensaje del usuario
            if images:
                user_content = []
                
                if message:
                    user_content.append({"type": "text", "text": message})
                else:
                    user_content.append({"type": "text", "text": "He adjuntado una imagen. Puedes analizarla y ayudarme con la informacion que contiene?"})
                
                for img in images:
                    user_content.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{img['content_type']};base64,{img['base64']}"
                        }
                    })
                
                messages.append({"role": "user", "content": user_content})
                logger.info(f"Mensaje construido con {len(images)} imagenes")
            else:
                messages.append({"role": "user", "content": message})
            
            # Generar respuesta
            logger.info(f"Llamando a OpenAI con {len(messages)} mensajes...")
            
            response = await self.client.chat.completions.create(
                model=self.deployment,
                messages=messages,
                max_tokens=800,
                temperature=0.3
            )
            
            bot_response = response.choices[0].message.content
            
            # Actualizar historial
            if images:
                history_message = message if message else f"[Usuario envio {len(images)} imagen(es)]"
                conversation_history.append({"role": "user", "content": history_message})
            else:
                conversation_history.append({"role": "user", "content": message})
            
            conversation_history.append({"role": "assistant", "content": bot_response})
            
            if len(conversation_history) > 20:
                conversation_history = conversation_history[-20:]
            
            self.conversation_histories[user_id] = conversation_history
            
            logger.info(f"Respuesta generada: {len(bot_response)} caracteres")
            return bot_response
            
        except Exception as e:
            logger.error(f"Error procesando consulta: {e}", exc_info=True)
            return (
                "Disculpa, hubo un error procesando tu consulta. "
                "Por favor intenta de nuevo o contacta directamente a RRHH."
            )
    
    def _build_hr_context(self, internal_docs, user_name: str, has_images: bool = False, novus_info: str = "", web_results: list = None):
        """Construir contexto para consultas administrativas"""
        context = ""
        
        # Agregar resultados web PRIMERO (info actualizada)
        if web_results:
            context += "\n=== INFORMACION DE INTERNET ===\n"
            context += "Esta es informacion encontrada en internet. Usala cuando la pregunta sea sobre empresas externas, noticias, o informacion actualizada.\n\n"
            
            for i, result in enumerate(web_results, 1):
                context += f"[Fuente {i}]\n"
                context += f"Titulo: {result['title']}\n"
                context += f"Contenido: {result['content']}\n"
                context += "---\n"
            
            logger.info(f"Contexto: agregados {len(web_results)} resultados web")
        
        # Agregar info web de Novus si esta disponible
        if novus_info:
            context += novus_info
            logger.info(f"Contexto: agregada info de novuscr.com ({len(novus_info)} chars)")
            logger.info(f"Preview de novus_info: {novus_info[:200]}...")
        else:
            logger.warning("Contexto: NO hay info de novuscr.com")
        
        if internal_docs:
            context += "\n=== DOCUMENTACION INTERNA DISPONIBLE ===\n"
            context += "Esta informacion proviene de la base de conocimientos oficial de Novus.\n\n"
            
            for i, doc in enumerate(internal_docs, 1):
                context += f"[Documento {i}: {doc['title']}]\n"
                context += f"{doc['content'][:600]}\n"
                if doc.get('category'):
                    context += f"Categoria: {doc['category']}\n"
                context += "---\n"
            
            logger.info(f"Contexto: agregados {len(internal_docs)} documentos internos")
        else:
            context += "\n=== NO SE ENCONTRO DOCUMENTACION ESPECIFICA ===\n"
            context += "No hay documentacion interna disponible para esta consulta.\n"
        
        if has_images:
            context += "\n=== IMAGENES ADJUNTAS ===\n"
            context += "El usuario ha enviado una o mas imagenes. Analizalas cuidadosamente.\n"
        
        logger.info(f"Contexto total construido: {len(context)} caracteres")
        
        return context
    
    def clear_conversation_history(self, user_id: str):
        """Limpiar historial de conversacion"""
        if user_id in self.conversation_histories:
            del self.conversation_histories[user_id]
            logger.info(f"Historial limpiado para usuario: {user_id}")

# Instancia global del servicio
teams_service = TeamsService()