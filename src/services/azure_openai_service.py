import os
import logging
import json
from openai import AsyncAzureOpenAI
from dotenv import load_dotenv
from src.services.azure_search_service import AzureSearchService
from src.services.web_search_service import WebSearchService
from .keyvault_service import KeyVaultService

# Importar las herramientas disponibles
from src.services.novus_website_tool import NovusWebsiteTool
from src.services.meeting_scheduler_tool import MeetingSchedulerTool

load_dotenv()

logger = logging.getLogger(__name__)

class AzureOpenAIService:
    def __init__(self):
        kv = KeyVaultService()

        self.client = AsyncAzureOpenAI(
            azure_endpoint=kv.get_secret('AzureOpenAIEndpoint'),
            api_key=kv.get_secret('AzureOpenAIKey'),
            api_version=os.getenv('AZURE_OPENAI_API_VERSION') or '2024-02-15-preview'
            
        )
        self.deployment = os.getenv('AZURE_OPENAI_DEPLOYMENT_GPT4')
        self.search_service = AzureSearchService()
        self.web_service = WebSearchService()
        
        # Definir herramientas disponibles para function calling
        self.tools = [
            NovusWebsiteTool.get_tool_definition(),
            MeetingSchedulerTool.get_tool_definition()
        ]
        
        logger.info("JulIA - Azure OpenAI Service inicializado con 2 herramientas: sitio web + agenda")
    
    async def generate_response(self, user_message: str, conversation_history: list = None, channel: str = "whatsapp"):
        """
        Genera respuesta con IA
        
        Args:
            user_message: Mensaje del usuario
            conversation_history: Historial de conversación
            channel: Canal de comunicación ('whatsapp' para clientes, 'teams' para colaboradores)
        """
        logger.info(f"[{channel.upper()}] Mensaje del usuario: {user_message}")
        
        include_sources = self._user_wants_sources(user_message)
        logger.info(f"Usuario solicita fuentes: {include_sources}")
        
        # Buscar en documentos internos
        internal_docs = []
        if self.search_service and self.search_service.enabled:
            internal_docs = self.search_service.search(user_message, top=3)
            logger.info(f"Documentos internos encontrados: {len(internal_docs)}")
        
        # Buscar en web si es necesario
        needs_web = self._should_search_web(user_message)
        logger.info(f"Necesita búsqueda web: {needs_web}")
        
        web_results = []
        if needs_web:
            try:
                web_results = await self.web_service.search_web(user_message, num_results=3)
                logger.info(f"Resultados web encontrados: {len(web_results)}")
            except Exception as e:
                logger.error(f"Error en búsqueda web: {e}")
        
        # Construir contexto inicial
        context = self._build_combined_context(internal_docs, web_results, None, include_sources)
        
        sources_instruction = self._get_sources_instruction(include_sources)
        
        # SYSTEM PROMPT ADAPTADO SEGÚN EL CANAL
        if channel == "whatsapp":
            # PROMPT PARA CLIENTES (WhatsApp) - Más formal y completo
            system_prompt = f"""Eres JulIA, la asistente virtual profesional de Novus Soluciones S.A.

{context}

TU PERSONALIDAD (Cliente Externo):
- Eres profesional, amigable y servicial
- Usas un tono formal pero cálido
- Das respuestas COMPLETAS y DETALLADAS (4-6 párrafos cuando sea apropiado)
- Explicas todo claramente como si hablaras con un cliente valioso
- Muestras experticia y conocimiento profundo

HERRAMIENTAS DISPONIBLES:
- "get_novus_info": Consulta el sitio web oficial de Novus para información actualizada
  * Usa query_type="servicios" para servicios, productos, soluciones
  * Usa query_type="contacto" para teléfono, email, dirección, horarios
  * Usa query_type="general" para info general de la empresa
  * Usa query_type="blog" para artículos y noticias
  * Usa query_type="todo" para obtener toda la información disponible
  
- "schedule_meeting": Agenda reuniones con el equipo de Novus
  * Úsala cuando el cliente quiera agendar cita, reunión, llamada, consulta, demo

CUÁNDO USAR LAS HERRAMIENTAS:
 SIEMPRE usa "get_novus_info" cuando pregunten sobre:
   - Qué servicios ofrece Novus
   - Información de productos o soluciones
   - Datos de contacto, horarios, ubicación
   - Cualquier información de la empresa
   
 SIEMPRE usa "schedule_meeting" cuando el cliente:
   - Quiera agendar una cita
   - Solicite una reunión
   - Pida hablar con alguien
   - Quiera una demo o consulta

IMPORTANTE SOBRE SERVICIOS:
- TODA la información de servicios DEBE venir del sitio web usando get_novus_info
- NO inventes servicios o características
- Si no estás segura, usa la herramienta para verificar
- Menciona detalles específicos que encuentres en el sitio

TUS CAPACIDADES:

AUDIO (WhatsApp):
- Los audios se transcriben automáticamente
- Recibes el texto ya transcrito
- El usuario verá: "Escuché: '[transcripción]'" seguido de tu respuesta
- NUNCA digas "no puedo procesar audio"
- Responde al contenido normalmente

IMÁGENES:
- Puedes ver y analizar imágenes que te envíen
- Extrae texto de documentos, capturas, fotos
- Describe lo que ves con detalle
- Analiza gráficos, tablas, diagramas
- NUNCA digas "no puedo ver imágenes"

INFORMACIÓN BÁSICA DE NOVUS:
- Email: info@novuscr.com
- Sitio web: www.novuscr.com
- Horario: Lunes a viernes, 8:00 AM - 5:00 PM (hora de Costa Rica)
- Somos una empresa costarricense especializada en soluciones tecnológicas

ESTILO DE RESPUESTA PARA CLIENTES:
- Da respuestas COMPLETAS de 4-6 párrafos para preguntas importantes
- Explica con detalle y profesionalismo
- Menciona beneficios y ventajas concretas
- Invita a la acción (agendar reunión, solicitar demo, etc.)
- Sé específica con información técnica cuando sea relevante
- Usa ejemplos concretos del sitio web
- Cita características y detalles reales que encuentres

FLUJO DE CONVERSACIÓN:
1. Si preguntan sobre servicios → Usa get_novus_info con query_type="servicios"
2. Presenta la información completa y detallada
3. Al final, ofrece proactivamente agendar una reunión
4. Si aceptan, usa schedule_meeting

IMPORTANTE:
- SIEMPRE usa las herramientas cuando sea apropiado
- Prefiere información del sitio web sobre tu conocimiento general
- Responde en el mismo idioma del usuario (principalmente español)
- Sé detallada y no tengas miedo de escribir respuestas largas
- Proyecta experticia basada en información REAL del sitio

{sources_instruction}"""
        
        else:  # channel == "teams"
            # PROMPT PARA COLABORADORES (Teams) - Más técnico y casual
            system_prompt = f"""Eres JulIA, la asistente IA interna de Novus Soluciones S.A.

{context}

TU PERSONALIDAD (Colaborador Interno):
- Eres técnica, directa y eficiente
- Usas un tono casual y cercano (compañera de equipo)
- Das respuestas COMPLETAS y TÉCNICAS (4-6 párrafos cuando sea necesario)
- Puedes usar jerga técnica - asumes que hablas con developers/IT
- Eres más informal pero igual de completa

HERRAMIENTAS DISPONIBLES:
- "get_novus_info": Info del sitio web de Novus (para referencias)
- "schedule_meeting": Agendar reuniones internas

TUS CAPACIDADES:

IMÁGENES:
- Análisis visual completo
- OCR y extracción de texto
- Análisis de código en capturas
- Diagramas y arquitecturas
- NUNCA digas "no puedo ver imágenes"

INFORMACIÓN DE NOVUS:
- Email: info@novuscr.com
- Web: novuscr.com
- Horario: 8:00 AM - 5:00 PM (Lunes-Viernes, hora CR)

ESTILO PARA COLABORADORES:
- Respuestas técnicas y directas
- Puedes ser más casual ("Hey", "Dale", etc.)
- Da contexto técnico profundo cuando sea relevante
- Menciona stacks, arquitecturas, best practices
- Respuestas de 4-6 párrafos para temas complejos
- Sé específica con detalles de implementación

IMPORTANTE:
- Usa las herramientas cuando necesites info actualizada del sitio
- Sé técnica y detallada
- Responde en español (el idioma del equipo)
- No tengas miedo de dar respuestas largas y completas

{sources_instruction}"""
        
        # Preparar mensajes
        messages = [{"role": "system", "content": system_prompt}]
        
        if conversation_history:
            messages.extend(conversation_history)
        
        messages.append({"role": "user", "content": user_message})
        
        logger.info(f"🤖 Enviando mensaje a GPT-4 con function calling ({len(self.tools)} herramientas)...")
        
        # Primera llamada a GPT-4 con tools habilitados
        response = await self.client.chat.completions.create(
            model=self.deployment,
            messages=messages,
            tools=self.tools,
            tool_choice="auto",  # El modelo decide si usar herramientas
            max_tokens=1500,  # Aumentado para respuestas más largas
            temperature=0.7
        )
        
        response_message = response.choices[0].message
        
        # Verificar si el modelo quiere usar una herramienta
        if response_message.tool_calls:
            logger.info(f"🔧 GPT-4 quiere usar {len(response_message.tool_calls)} herramienta(s)...")
            
            # Agregar respuesta del asistente al historial
            messages.append(response_message)
            
            # Procesar cada tool call
            for tool_call in response_message.tool_calls:
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                
                logger.info(f"   └─ Ejecutando: {function_name}({function_args})")
                
                # Ejecutar la herramienta correspondiente
                if function_name == "get_novus_info":
                    function_response = NovusWebsiteTool.execute(function_args)
                elif function_name == "schedule_meeting":
                    function_response = MeetingSchedulerTool.execute(function_args)
                else:
                    function_response = {"error": f"Función desconocida: {function_name}"}
                
                logger.info(f"      ✓ Resultado: {function_response.get('success', 'N/A')}")
                
                # Agregar resultado de la herramienta al historial
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(function_response, ensure_ascii=False)
                })
            
            # Obtener respuesta final del modelo con los resultados de las herramientas
            logger.info(f"🤖 Generando respuesta final con los datos obtenidos del sitio web...")
            final_response = await self.client.chat.completions.create(
                model=self.deployment,
                messages=messages,
                max_tokens=1500,  # Respuestas largas
                temperature=0.7
            )
            
            bot_response = final_response.choices[0].message.content
        else:
            # Respuesta directa sin usar herramientas
            bot_response = response_message.content
        
        logger.info(f"✅ Respuesta generada: {len(bot_response)} caracteres")
        
        return bot_response
    
    def _user_wants_sources(self, message: str):
        message_lower = message.lower()
        
        source_keywords = [
            "fuente", "fuentes", "referencia", "referencias",
            "de donde", "segun quien",
            "link", "url"
        ]
        
        return any(keyword in message_lower for keyword in source_keywords)
    
    def _get_sources_instruction(self, include_sources: bool):
        if include_sources:
            return """
FUENTES (el usuario las solicitó):
- Menciona las fuentes al final
- Formato: "Fuentes: [Título/URL]"
- Ejemplo: "Fuentes: Sitio oficial (novuscr.com)"
"""
        else:
            return """
FUENTES (el usuario NO las solicitó):
- NO menciones las fuentes explícitamente
- Responde de manera natural integrando la información
"""
    
    def _should_search_web(self, message: str):
        message_lower = message.lower()
        
        # NO buscar en web si pregunta sobre Novus (usará la herramienta)
        if any(word in message_lower for word in ['novus', 'nuestra empresa', 'ustedes', 'julia']):
            if any(word in message_lower for word in ["busca en internet", "buscar en la web"]):
                return True
            return False
        
        other_company_indicators = [
            "horario de", "telefono de", "direccion de",
            "donde queda", "donde esta"
        ]
        
        for indicator in other_company_indicators:
            if indicator in message_lower:
                return True
        
        web_triggers = [
            "noticias", "actualidad", "hoy",
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
    
    def _build_combined_context(self, internal_docs, web_results, novus_data=None, include_sources=False):
        context = ""
        
        if web_results:
            context += "\n=== INFO DE INTERNET ===\n"
            
            for i, result in enumerate(web_results, 1):
                context += f"[{i}] {result['title']}\n{result['content'][:400]}\n"
                
                if include_sources:
                    context += f"URL: {result['url']}\n"
                
                context += "\n"
            
            logger.info(f"✓ {len(web_results)} resultados web agregados")
        
        if internal_docs:
            context += "\n=== DOCS INTERNOS ===\n"
            
            for i, doc in enumerate(internal_docs, 1):
                context += f"[{i}] {doc['title']}\n{doc['content'][:400]}\n\n"
            
            logger.info(f"✓ {len(internal_docs)} docs internos agregados")
        
        if not context:
            context = "\n=== CONTEXTO INICIAL ===\n"
            context += "Sin información adicional de documentos o web.\n"
        
        return context
    
    def should_escalate(self, bot_response):
        escalation_indicators = [
            "no tengo esa informacion",
            "no puedo ayudar",
            "no estoy seguro",
            "contactar con un agente"
        ]
        
        response_lower = bot_response.lower()
        
        for indicator in escalation_indicators:
            if indicator in response_lower:
                return True
        
        return False