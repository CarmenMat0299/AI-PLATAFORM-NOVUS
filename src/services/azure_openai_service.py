import os
import logging
from openai import AsyncAzureOpenAI
from dotenv import load_dotenv
from src.services.azure_search_service import AzureSearchService
from src.services.web_search_service import WebSearchService
from .keyvault_service import KeyVaultService

load_dotenv()

logger = logging.getLogger(__name__)

class AzureOpenAIService:
    def __init__(self):
        kv = KeyVaultService()

        self.client = AsyncAzureOpenAI(
            azure_endpoint=kv.get_secret('AzureOpenAIEndpoint'),
            api_key=kv.get_secret('AzureOpenAIKey'),
            api_version=os.getenv('AZURE_OPENAI_API_VERSION')
        )
        self.deployment = os.getenv('AZURE_OPENAI_DEPLOYMENT_GPT4')
        self.search_service = AzureSearchService()
        self.web_service = WebSearchService()
    
    async def generate_response(self, user_message: str, conversation_history: list = None):
        """Genera respuesta usando GPT-4"""
        
        logger.info(f"Mensaje del usuario: {user_message}")
        
        # NUEVO: Detectar si pide fuentes
        include_sources = self._user_wants_sources(user_message)
        logger.info(f"Usuario solicita fuentes: {include_sources}")
        
        # 1. Buscar en documentos internos
        internal_docs = []
        if self.search_service and self.search_service.enabled:
            internal_docs = self.search_service.search(user_message, top=3)
            logger.info(f"Documentos internos encontrados: {len(internal_docs)}")
        else:
            logger.info("Azure Search deshabilitado - sin búsqueda en docs internos")
        
        # 2. Determinar si necesita búsqueda web
        needs_web = self._should_search_web(user_message)
        logger.info(f"Necesita busqueda web: {needs_web}")
        
        web_results = []
        
        if needs_web:
            try:
                # 3. Buscar en la web
                web_results = await self.web_service.search_web(user_message, num_results=3)
                logger.info(f"Resultados web encontrados: {len(web_results)}")
                
                if web_results:
                    logger.info(f"Primeros titulos: {[r['title'][:50] for r in web_results[:2]]}")
            except Exception as e:
                logger.error(f"Error en busqueda web: {e}")
        
        # 4. Construir contexto combinado (ahora con flag de fuentes)
        context = self._build_combined_context(internal_docs, web_results, include_sources)
        logger.info(f"Contexto construido: {len(context)} caracteres")
        
        # Log del inicio del contexto para ver si tiene info web
        if "INFORMACION DE INTERNET" in context:
            logger.info("Contexto incluye informacion de INTERNET")
        else:
            logger.warning("Contexto NO incluye informacion de internet")
        
        # 5. Prompt mejorado con instrucciones sobre fuentes
        sources_instruction = self._get_sources_instruction(include_sources)
        
        system_prompt = f"""Eres el asistente virtual de Novus Soluciones S.A., empresa costarricense de tecnologia.

INFORMACION BASICA DE NOVUS (usala SOLO cuando pregunten especificamente por Novus):
- Nombre: Novus Soluciones S.A.
- Ubicacion: Costa Rica
- Servicios: Soluciones de TI, desarrollo de software, consultoria tecnologica
- Email: info@novuscr.com

{context}

TUS CAPACIDADES MULTIMEDIA - LEE CON ATENCION:

AUDIO:
- Cuando un usuario envia un audio por WhatsApp, el sistema lo transcribe AUTOMATICAMENTE usando Azure Speech Service
- Tu recibes el mensaje YA TRANSCRITO como texto normal
- El usuario vera: "Escuche: '[transcripcion]'" seguido de tu respuesta
- NUNCA digas "no puedo procesar audio" o "no tengo capacidad de escuchar audio"
- Simplemente responde al contenido transcrito como si fuera un mensaje de texto normal

IMAGENES:
- Cuando un usuario envia una imagen, el sistema la analiza AUTOMATICAMENTE usando Azure Vision
- Tu recibiras la descripcion y texto extraido de la imagen
- Responde basandote en esa informacion como si hubieras visto la imagen
- NUNCA digas "no puedo ver imagenes" o "no puedo analizar imagenes"

INSTRUCCIONES CRITICAS - LEE CON ATENCION:
1. IDENTIFICA LA EMPRESA EN LA PREGUNTA:
   - Si preguntan por "Walmart", "Banco Nacional", etc. → NO es Novus
   - Si preguntan por "su horario", "ustedes", "su empresa" → ES Novus
   
2. SI LA PREGUNTA NO ES SOBRE NOVUS:
   - USA UNICAMENTE la informacion de la seccion "INFORMACION DE INTERNET"
   - NUNCA uses el horario de Novus para responder sobre otra empresa
   - Si no hay informacion web, di: "No tengo informacion sobre el horario de [empresa]. Te gustaria que busque otra cosa?"

3. SI LA PREGUNTA ES SOBRE NOVUS:
   - Puedes usar la informacion basica de arriba
   - Preferiblemente usa informacion de internet si esta disponible (es mas actualizada)

{sources_instruction}

ESTILO: Profesional, amigable, espanol de Costa Rica, maximo 3 parrafos"""
        
        messages = [{"role": "system", "content": system_prompt}]
        
        if conversation_history:
            messages.extend(conversation_history)
        
        messages.append({"role": "user", "content": user_message})
        
        logger.info(f"Enviando {len(messages)} mensajes a GPT-4")
        
        response = await self.client.chat.completions.create(
            model=self.deployment,
            messages=messages,
            max_tokens=400,
            temperature=0.4
        )
        
        bot_response = response.choices[0].message.content
        logger.info(f"Respuesta generada: {len(bot_response)} caracteres")
        
        return bot_response
    
    def _user_wants_sources(self, message: str):
        """Detectar si el usuario solicita fuentes o referencias"""
        message_lower = message.lower()
        
        source_keywords = [
            "fuente", "fuentes", "referencia", "referencias",
            "de donde", "segun quien", "segun que",
            "cita la fuente", "incluye fuentes", "con fuentes",
            "link", "enlaces", "url", "articulo", "pagina",
            "dame la fuente", "muestra la fuente", "proporciona fuentes",
            "dame las fuentes", "muestra las fuentes", "proporciona las fuentes"
        ]
        
        return any(keyword in message_lower for keyword in source_keywords)
    
    def _get_sources_instruction(self, include_sources: bool):
        """Generar instruccion sobre manejo de fuentes"""
        if include_sources:
            return """
4. INSTRUCCIONES SOBRE FUENTES (EL USUARIO LAS SOLICITO):
   - SIEMPRE menciona las fuentes al final de tu respuesta
   - Formato: "Fuentes: [Titulo/URL]" 
   - Si usaste informacion web, incluye los enlaces
   - Si usaste documentos internos, menciona "Base de conocimientos de Novus"
   - Ejemplo: "Fuentes: Walmart Costa Rica (www.walmart.cr), Base de conocimientos de Novus"
"""
        else:
            return """
4. INSTRUCCIONES SOBRE FUENTES (EL USUARIO NO LAS SOLICITO):
   - NO menciones las fuentes a menos que sea absolutamente necesario para la credibilidad
   - Responde de manera natural y directa
   - Solo si la informacion es muy especifica o controversial, puedes decir "segun informacion actualizada" sin dar detalles
   - NO incluyas URLs ni titulos de fuentes al final
"""
    
    def _should_search_web(self, message: str):
        """Determinar si necesita busqueda en internet - MEJORADO"""
        message_lower = message.lower()
        
        # Si menciona "novus" pero pide buscar en web explicitamente
        if any(word in message_lower for word in ["busca", "buscar", "busqueda", "en internet", "en la web", "online"]):
            return True
        
        # Si pregunta por OTRA empresa (no Novus)
        other_company_indicators = [
            "horario de", "hora de", "telefono de", "direccion de",
            "ubicacion de", "contacto de", "email de", "donde queda",
            "donde esta", "como llegar"
        ]
        
        for indicator in other_company_indicators:
            if indicator in message_lower and "novus" not in message_lower:
                return True  # Es sobre otra empresa, buscar en web
        
        # Palabras que indican necesidad de informacion actual
        web_triggers = [
            "noticias", "actualidad", "hoy", "ayer", "esta semana",
            "precio actual", "ultimo", "ultima", "reciente", "tendencia",
            "que es", "quien es", "como funciona", "definicion de",
            "clima", "tiempo", "temperatura",
            "cotizacion", "tipo de cambio", "dolar"
        ]
        
        # Empresas externas comunes en Costa Rica
        external_companies = [
            "microsoft", "google", "amazon", "apple", "meta", "facebook",
            "openai", "anthropic", "tesla", "nvidia", "walmart", "mcdonalds",
            "banco", "bac", "nacional", "popular", "scotiabank",
            "automercado", "mas x menos", "pricesmart", "pequeño mundo"
        ]
        
        # Buscar triggers
        for trigger in web_triggers:
            if trigger in message_lower:
                return True
        
        # Buscar empresas externas
        for company in external_companies:
            if company in message_lower:
                return True
        
        # Si pregunta algo general (no especifico de Novus)
        if "?" in message and "novus" not in message_lower:
            # Probablemente es una pregunta general
            return True
        
        return False
    
    def _build_combined_context(self, internal_docs, web_results, include_sources=False):
        """Construir contexto combinando ambas fuentes - MEJORADO"""
        context = ""
        
        # Agregar resultados web PRIMERO (mayor prioridad para info actualizada)
        if web_results:
            context += "\n=== INFORMACION DE INTERNET (PRIORIDAD ALTA) ===\n"
            context += "Esta es informacion EXTERNA encontrada en internet. Usala cuando la pregunta sea sobre:\n"
            context += "- Otras empresas o negocios (NO Novus)\n"
            context += "- Informacion actualizada que el usuario solicita explicitamente de internet\n"
            context += "- Datos recientes o tendencias\n\n"
            
            for i, result in enumerate(web_results, 1):
                context += f"[Fuente {i}]\n"
                context += f"Titulo: {result['title']}\n"
                context += f"Contenido: {result['content']}\n"
                
                # Solo incluir URL en el contexto si el usuario pidio fuentes
                if include_sources:
                    context += f"URL: {result['url']}\n"
                
                context += "---\n"
        
        # Agregar documentos internos DESPUES
        if internal_docs:
            context += "\n=== INFORMACION DE LA BASE DE CONOCIMIENTOS INTERNA ===\n"
            context += "Esta es informacion OFICIAL de Novus Soluciones. Usala SOLO cuando pregunten especificamente sobre Novus.\n\n"
            
            for i, doc in enumerate(internal_docs, 1):
                context += f"[Documento {i}]\n"
                context += f"Titulo: {doc['title']}\n"
                context += f"Contenido: {doc['content'][:500]}\n"
                if doc.get('category'):
                    context += f"Categoria: {doc['category']}\n"
                context += "---\n"
        
        if not context:
            context = "\n=== NO SE ENCONTRO INFORMACION ESPECIFICA ===\n"
            context += "No hay informacion en la base de datos interna ni en internet para esta consulta.\n"
            context += "Responde honestamente que no tienes esa informacion y ofrece ayuda alternativa.\n"
        
        return context
    
    def should_escalate(self, bot_response):
        """Detectar si la respuesta indica que el bot no sabe"""
        escalation_indicators = [
            "no tengo esa informacion",
            "no tengo informacion",
            "no puedo ayudar",
            "no estoy seguro",
            "no encuentro",
            "no dispongo",
            "contactar con un agente",
            "hablar con una persona",
            "necesitas hablar con",
        ]
        
        response_lower = bot_response.lower()
        
        for indicator in escalation_indicators:
            if indicator in response_lower:
                return True
        
        return False