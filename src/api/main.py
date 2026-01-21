from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import json
import logging
import os
import tempfile
from datetime import datetime, date
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

        if not phone:
            return JSONResponse(
                content={"error": "Phone number required"},
                status_code=400
            )

        result = escalation_service.resolve_escalation(phone)

        if result:
            logger.info(f"Escalacion resuelta para {phone}")
            return {
                "success": True,
                "message": f"Escalacion resuelta para {phone}",
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
        logger.error(f"Error resolviendo escalacion: {e}")
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
            "timestamp": datetime.now().isoformat()
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
            "timestamp": datetime.now().isoformat()
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
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Error obteniendo logs: {e}")
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
