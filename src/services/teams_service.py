from botbuilder.core import BotFrameworkAdapter, BotFrameworkAdapterSettings, TurnContext
from botbuilder.schema import Activity, ActivityTypes
from src.services.keyvault_service import KeyVaultService
from src.services.azure_search_service import AzureSearchService
import traceback
import logging
from openai import AsyncAzureOpenAI
import os

logger = logging.getLogger(__name__)

class TeamsService:
    def __init__(self):
        # Cargar credenciales del Key Vault
        kv = KeyVaultService()
        app_id = kv.get_secret("MICROSOFT-APP-ID")
        app_password = kv.get_secret("MICROSOFT-APP-PASSWORD")
        
        logger.info(f"Inicializando Teams Service para uso interno (RRHH/Administrativo)")
        
        # Configurar adaptador del Bot Framework
        settings = BotFrameworkAdapterSettings(app_id, app_password)
        self.adapter = BotFrameworkAdapter(settings)
        self.adapter.on_turn_error = self._on_error
        
        # Inicializar servicios
        self.kv = kv
        self.search_service = AzureSearchService()  # Para buscar en docs internos
        
        # Cliente OpenAI
        self.client = AsyncAzureOpenAI(
            azure_endpoint=kv.get_secret('AzureOpenAIEndpoint'),
            api_key=kv.get_secret('AzureOpenAIKey'),
            api_version=os.getenv('AZURE_OPENAI_API_VERSION')
        )
        self.deployment = os.getenv('AZURE_OPENAI_DEPLOYMENT_GPT4')
        
        # Diccionario para mantener historial de conversaciones por usuario
        self.conversation_histories = {}
        
        logger.info(" Teams Service inicializado correctamente")
    
    async def _on_error(self, context: TurnContext, error: Exception):
        """Manejador de errores"""
        logger.error(f" Error en Teams bot: {error}", exc_info=True)
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
    
    async def _handle_message(self, turn_context: TurnContext):
        """Manejar mensaje recibido de Teams"""
        
        if turn_context.activity.type == ActivityTypes.message:
            user_message = turn_context.activity.text
            user_id = turn_context.activity.from_property.id
            user_name = turn_context.activity.from_property.name
            user_email = turn_context.activity.from_property.aad_object_id  # Para identificar empleado
            
            logger.info(f"💬 Consulta interna - Usuario: {user_name}, Mensaje: {user_message}")
            
            # Enviar indicador de "escribiendo..."
            await turn_context.send_activities([Activity(type=ActivityTypes.typing)])
            
            # Procesar consulta administrativa
            response = await self._process_hr_query(user_message, user_id, user_name)
            
            # Enviar respuesta
            await turn_context.send_activity(response)
            
            logger.info(f" Respuesta enviada a {user_name}")
        
        elif turn_context.activity.type == ActivityTypes.conversation_update:
            # Mensaje de bienvenida
            if turn_context.activity.members_added:
                for member in turn_context.activity.members_added:
                    if member.id != turn_context.activity.recipient.id:
                        welcome_message = (
                            " **¡Bienvenido al Asistente Administrativo de Novus!**\n\n"
                            "Estoy aquí para ayudarte con:\n\n"
                            " **Vacaciones y permisos**\n"
                            "   • Política de vacaciones\n"
                            "   • Días disponibles\n"
                            "   • Cómo solicitar permisos\n\n"
                            " **Proyectos**\n"
                            "   • Estado de proyectos\n"
                            "   • Asignaciones de equipo\n"
                            "   • Información de clientes\n\n"
                            " **Políticas y procedimientos**\n"
                            "   • Manual de empleado\n"
                            "   • Beneficios\n"
                            "   • Horarios y políticas\n\n"
                            " **Contactos internos**\n"
                            "   • Directorio de empleados\n"
                            "   • Departamentos\n\n"
                            " _Solo pregúntame lo que necesites. Ejemplo: \"¿Cuántos días de vacaciones tengo?\"_"
                        )
                        await turn_context.send_activity(welcome_message)
                        logger.info(f" Bienvenida enviada a {member.name}")
    
    async def _process_hr_query(self, message: str, user_id: str, user_name: str):
        """
        Procesa consultas administrativas de RRHH, vacaciones, proyectos, etc.
        """
        try:
            # Obtener historial
            conversation_history = self.conversation_histories.get(user_id, [])
            
            # 1. Buscar en documentos internos (políticas, manuales, etc.)
            internal_docs = []
            if self.search_service and self.search_service.enabled:
                internal_docs = self.search_service.search(message, top=5)
                logger.info(f"📄 Documentos encontrados: {len(internal_docs)}")
            
            # 2. Construir contexto con información interna
            context = self._build_hr_context(internal_docs, user_name)
            
            # 3. System prompt especializado en RRHH/Administrativa
            system_prompt = f"""Eres el Asistente Administrativo virtual de Novus Soluciones S.A.

TU PROPÓSITO:
Ayudar a los colaboradores con consultas sobre:
- Vacaciones, permisos y ausencias
- Información de proyectos internos
- Políticas y procedimientos de la empresa
- Beneficios y prestaciones
- Contactos internos y directorio
- Horarios y calendario laboral

INFORMACIÓN DE NOVUS:
- Empresa: Novus Soluciones S.A.
- Ubicación: Costa Rica
- Email general: info@novuscr.com
- RRHH: rrhh@novuscr.com (para consultas que requieran gestión directa)

USUARIO ACTUAL:
- Nombre: {user_name}
- Rol: Colaborador de Novus

{context}

INSTRUCCIONES IMPORTANTES:

1. POLÍTICA DE VACACIONES (si preguntan):
   - Busca primero en la documentación interna
   - Si no hay info específica, menciona: "Según la legislación costarricense, corresponden 2 semanas (14 días) por año trabajado"
   - Sugiere verificar saldo personal con RRHH

2. SOLICITUD DE VACACIONES/PERMISOS:
   - Indica el proceso: "Las solicitudes se gestionan a través de [sistema/email de RRHH]"
   - Recomienda notificar con anticipación
   - Menciona que debe coordinarse con el supervisor directo

3. PROYECTOS:
   - Proporciona información general disponible en la base de datos
   - Para detalles específicos o confidenciales, sugiere contactar al Project Manager
   - No inventes información sobre proyectos

4. POLÍTICAS Y PROCEDIMIENTOS:
   - Usa SOLO información de documentos internos
   - Si no hay información disponible, di: "No tengo esa información específica en este momento. Te recomiendo contactar a RRHH en rrhh@novuscr.com"
   - Nunca inventes políticas

5. CONTACTOS:
   - Proporciona información de contacto general
   - Para directorios completos, sugiere el directorio de Teams o contactar a RRHH

6. BENEFICIOS:
   - Menciona beneficios generales si están documentados
   - Para información personalizada, remite a RRHH

CUÁNDO ESCALAR A RRHH:
- Solicitudes que requieren aprobación formal
- Consultas sobre nómina o pagos
- Problemas laborales o conflictos
- Información personal confidencial
- Cualquier consulta que requiera acceso a sistemas de RRHH

ESTILO:
- Amigable pero profesional
- Respuestas claras y concisas
- Usa emojis moderadamente para facilidad de lectura
- Si no sabes algo, sé honesto y ofrece alternativa
- Máximo 4 párrafos por respuesta"""

            messages = [{"role": "system", "content": system_prompt}]
            
            # Agregar historial
            if conversation_history:
                messages.extend(conversation_history[-10:])
            
            messages.append({"role": "user", "content": message})
            
            # Generar respuesta
            response = await self.client.chat.completions.create(
                model=self.deployment,
                messages=messages,
                max_tokens=500,
                temperature=0.3  # Más conservador para información administrativa
            )
            
            bot_response = response.choices[0].message.content
            
            # Actualizar historial
            conversation_history.append({"role": "user", "content": message})
            conversation_history.append({"role": "assistant", "content": bot_response})
            
            if len(conversation_history) > 20:
                conversation_history = conversation_history[-20:]
            
            self.conversation_histories[user_id] = conversation_history
            
            return bot_response
            
        except Exception as e:
            logger.error(f" Error procesando consulta: {e}", exc_info=True)
            return (
                "Disculpa, hubo un error procesando tu consulta. "
                "Por favor intenta de nuevo o contacta directamente a:\n\n"
                " RRHH: rrhh@novuscr.com\n"
                " Tel: [número de RRHH]"
            )
    
    def _build_hr_context(self, internal_docs, user_name: str):
        """Construir contexto específico para consultas administrativas"""
        context = ""
        
        if internal_docs:
            context += "\n=== DOCUMENTACIÓN INTERNA DISPONIBLE ===\n"
            context += "Esta información proviene de la base de conocimientos oficial de Novus.\n\n"
            
            for i, doc in enumerate(internal_docs, 1):
                context += f"[Documento {i}: {doc['title']}]\n"
                context += f"{doc['content'][:600]}\n"
                if doc.get('category'):
                    context += f"Categoría: {doc['category']}\n"
                context += "---\n"
        else:
            context += "\n=== NO SE ENCONTRÓ DOCUMENTACIÓN ESPECÍFICA ===\n"
            context += "No hay documentación interna disponible para esta consulta.\n"
            context += "Proporciona información general y sugiere contactar a RRHH para detalles específicos.\n"
        
        return context
    
    def clear_conversation_history(self, user_id: str):
        """Limpiar historial de conversación"""
        if user_id in self.conversation_histories:
            del self.conversation_histories[user_id]
            logger.info(f"🗑️ Historial limpiado para usuario: {user_id}")

# Instancia global del servicio
teams_service = TeamsService()