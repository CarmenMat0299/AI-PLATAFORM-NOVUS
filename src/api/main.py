from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import json
import logging
import os
import tempfile
from src.services.azure_openai_service import AzureOpenAIService
from src.services.whatsapp_service import WhatsAppService
from src.services.escalation_service import EscalationService
from src.services.azure_vision_service import AzureVisionService
from src.services.azure_speech_service import AzureSpeechService
from src.utils.faq_handler import check_faq
from fastapi import Request, Response
from src.services.teams_service import teams_service  # ← CORRECCIÓN AQUÍ

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Novus AI Chatbot")

# Inicializar servicios
openai_service = AzureOpenAIService()
whatsapp_service = WhatsAppService()
escalation_service = EscalationService()
vision_service = AzureVisionService()
speech_service = AzureSpeechService()

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
    Verificación del webhook de WhatsApp (Meta Cloud API)
    Este endpoint se llama UNA VEZ cuando configuras el webhook en Meta
    """
    try:
        # Meta envía estos parámetros para verificar
        mode = request.query_params.get('hub.mode')
        token = request.query_params.get('hub.verify_token')
        challenge = request.query_params.get('hub.challenge')
        
        verify_token = os.getenv('WHATSAPP_VERIFY_TOKEN', 'novus-chatbot-2024')
        
        logger.info(f"🔐 Verificación webhook - mode: {mode}, token: {token}")
        
        if mode == 'subscribe' and token == verify_token:
            logger.info(" Webhook verificado exitosamente")
            # Devolver el challenge tal cual lo envía Meta
            return JSONResponse(content=int(challenge), status_code=200)
        else:
            logger.warning(" Verificación fallida")
            return JSONResponse(content={"error": "Verification failed"}, status_code=403)
            
    except Exception as e:
        logger.error(f"Error en verificación: {e}")
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
        
        logger.info(f"📩 Webhook recibido de Meta")
        
        # Estructura de webhook de Meta WhatsApp Cloud API
        # Referencia: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
        
        if 'entry' not in webhook_data:
            logger.warning(" Webhook sin 'entry', ignorando")
            return JSONResponse(content={"status": "ignored"}, status_code=200)
        
        for entry in webhook_data['entry']:
            if 'changes' not in entry:
                continue
                
            for change in entry['changes']:
                if change.get('field') != 'messages':
                    continue
                
                value = change.get('value', {})
                
                # Verificar si hay mensajes
                if 'messages' not in value:
                    # Puede ser un status update, ignore
                    logger.info(" Webhook sin mensajes (posiblemente status), ignorando")
                    continue
                
                messages = value.get('messages', [])
                
                for message in messages:
                    message_id = message.get('id')
                    from_phone = message.get('from')
                    message_type = message.get('type')
                    timestamp = message.get('timestamp')
                    
                    logger.info(f" Mensaje tipo '{message_type}' de {from_phone}")
                    
                    # Marcar como leído
                    await whatsapp_service.mark_message_as_read(message_id)
                    
                    # ===== VERIFICAR SI USUARIO YA FUE ESCALADO =====
                    if escalation_service.is_escalated(from_phone):
                        escalation_msg = """Ya hemos registrado tu solicitud de atención con un agente humano.
                        
Un miembro de nuestro equipo te contactará pronto. 

Si deseas continuar con el asistente automático, escribe "volver al bot"."""
                        
                        if message_type == 'text':
                            user_text = message.get('text', {}).get('body', '').lower()
                            if "volver al bot" in user_text or "continuar" in user_text:
                                escalation_service.resolve_escalation(from_phone)
                                await whatsapp_service.send_message(
                                    from_phone, 
                                    "Perfecto, continuemos. ¿En qué puedo ayudarte?"
                                )
                                continue
                        
                        await whatsapp_service.send_message(from_phone, escalation_msg)
                        continue
                    
                    # ===== MANEJO DE TEXTO =====
                    if message_type == 'text':
                        user_message = message.get('text', {}).get('body', '')
                        logger.info(f"💬 Mensaje de texto: {user_message}")
                        
                        # Verificar FAQ
                        faq_response = check_faq(user_message)
                        if faq_response:
                            await whatsapp_service.send_message(from_phone, faq_response)
                            logger.info(" Respuesta FAQ enviada")
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
                            
Un miembro de nuestro equipo te contactará en breve.

Horario de atención: Lunes a Viernes, 8:00 AM - 5:00 PM"""
                            
                            await whatsapp_service.send_message(from_phone, escalation_msg)
                            logger.info(" Escalado a agente humano")
                            continue
                        
                        # Generar respuesta con IA
                        history = conversations.get(from_phone, [])[-MAX_HISTORY:]
                        bot_response = await openai_service.generate_response(user_message, history)
                        
                        # Verificar si necesita escalación
                        if openai_service.should_escalate(bot_response):
                            escalation_service.escalate_to_human(from_phone, user_message, history)
                            bot_response += """\n\n¿Te gustaría hablar con un agente humano? Responde "sí" o "hablar con agente"."""
                        
                        # Guardar en historial
                        history.append({"role": "user", "content": user_message})
                        history.append({"role": "assistant", "content": bot_response})
                        conversations[from_phone] = history[-MAX_HISTORY:]
                        
                        # Enviar respuesta
                        await whatsapp_service.send_message(from_phone, bot_response)
                        logger.info(f" Respuesta enviada a {from_phone}")
                    
                    # ===== MANEJO DE IMÁGENES =====
                    elif message_type == 'image':
                        image_data = message.get('image', {})
                        media_id = image_data.get('id')
                        caption = image_data.get('caption', '')
                        
                        logger.info(f" Procesando imagen - Media ID: {media_id}")
                        
                        if media_id:
                            # Descargar imagen
                            media_bytes, mime_type = await whatsapp_service.download_media(media_id)
                            
                            if media_bytes and len(media_bytes) > 0:
                                logger.info(f" Imagen descargada: {len(media_bytes)} bytes")
                                
                                # Analizar imagen con Azure Vision
                                analysis = await vision_service.analyze_image_from_bytes(media_bytes)
                                ocr_text = await vision_service.extract_text_from_bytes(media_bytes)
                                image_summary = vision_service.create_image_summary(analysis, ocr_text)
                                
                                logger.info(f" Análisis completado")
                                
                                # Construir mensaje para la IA
                                user_message = f"El usuario envió una imagen por WhatsApp."
                                if caption:
                                    user_message += f"\n\nMensaje del usuario: '{caption}'"
                                user_message += f"\n\nAnálisis de la imagen:\n{image_summary}\n\nResponde de manera útil basándote en lo que ves en la imagen."
                                
                                # Generar respuesta con IA
                                history = conversations.get(from_phone, [])[-MAX_HISTORY:]
                                bot_response = await openai_service.generate_response(user_message, history)
                                
                                history.append({"role": "user", "content": user_message})
                                history.append({"role": "assistant", "content": bot_response})
                                conversations[from_phone] = history[-MAX_HISTORY:]
                                
                                await whatsapp_service.send_message(from_phone, bot_response)
                                logger.info(f" Respuesta a imagen enviada")
                            else:
                                await whatsapp_service.send_message(
                                    from_phone, 
                                    "No pude descargar la imagen. Por favor, inténtalo de nuevo."
                                )
                        else:
                            await whatsapp_service.send_message(
                                from_phone, 
                                "No pude acceder a la imagen. Por favor, inténtalo de nuevo."
                            )
                    
                    # ===== MANEJO DE AUDIO =====
                    elif message_type == 'audio':
                        audio_data = message.get('audio', {})
                        media_id = audio_data.get('id')
                        
                        logger.info(f" Procesando audio - Media ID: {media_id}")
                        
                        if media_id:
                            # Descargar audio
                            media_bytes, mime_type = await whatsapp_service.download_media(media_id)
                            
                            if media_bytes and len(media_bytes) > 0:
                                logger.info(f" Audio descargado: {len(media_bytes)} bytes")
                                
                                # Guardar temporalmente para transcribir
                                import tempfile
                                with tempfile.NamedTemporaryFile(delete=False, suffix='.ogg') as temp_file:
                                    temp_file.write(media_bytes)
                                    temp_path = temp_file.name
                                
                                try:
                                    # Transcribir audio
                                    transcribed_text = speech_service.speech_to_text(temp_path)
                                    
                                    if transcribed_text:
                                        logger.info(f" Audio transcrito: {transcribed_text}")
                                        
                                        # Verificar FAQ
                                        faq_response = check_faq(transcribed_text)
                                        if faq_response:
                                            await whatsapp_service.send_message(
                                                from_phone, 
                                                f"Escuché: '{transcribed_text}'\n\n{faq_response}"
                                            )
                                            continue
                                        
                                        # Detectar solicitud de agente humano
                                        human_request_keywords = [
                                            "hablar con una persona", "hablar con alguien",
                                            "agente humano", "representante", "operador",
                                            "persona real", "hablar con agente"
                                        ]
                                        
                                        if any(keyword in transcribed_text.lower() for keyword in human_request_keywords):
                                            history = conversations.get(from_phone, [])
                                            escalation_service.escalate_to_human(from_phone, transcribed_text, history)
                                            escalation_msg = """Entendido. Te voy a conectar con un agente humano.
                                            
Un miembro de nuestro equipo te contactará en breve.

Horario de atención: Lunes a Viernes, 8:00 AM - 5:00 PM"""
                                            
                                            await whatsapp_service.send_message(from_phone, escalation_msg)
                                            continue
                                        
                                        # Generar respuesta con IA
                                        history = conversations.get(from_phone, [])[-MAX_HISTORY:]
                                        bot_response = await openai_service.generate_response(transcribed_text, history)
                                        
                                        if openai_service.should_escalate(bot_response):
                                            escalation_service.escalate_to_human(from_phone, transcribed_text, history)
                                            bot_response += """\n\n¿Te gustaría hablar con un agente humano? Responde "sí" o "hablar con agente"."""
                                        
                                        history.append({"role": "user", "content": f"[Audio]: {transcribed_text}"})
                                        history.append({"role": "assistant", "content": bot_response})
                                        conversations[from_phone] = history[-MAX_HISTORY:]
                                        
                                        await whatsapp_service.send_message(
                                            from_phone, 
                                            f"Escuché: '{transcribed_text}'\n\n{bot_response}"
                                        )
                                        logger.info(f" Respuesta a audio enviada")
                                    else:
                                        await whatsapp_service.send_message(
                                            from_phone, 
                                            "Lo siento, no pude entender el audio. ¿Podrías escribir tu mensaje?"
                                        )
                                finally:
                                    # Limpiar archivo temporal
                                    try:
                                        os.unlink(temp_path)
                                    except:
                                        pass
                            else:
                                await whatsapp_service.send_message(
                                    from_phone, 
                                    "No pude descargar el audio. Por favor, inténtalo de nuevo."
                                )
                        else:
                            await whatsapp_service.send_message(
                                from_phone, 
                                "No pude acceder al audio. Por favor, inténtalo de nuevo."
                            )
                    
                    # ===== OTROS TIPOS DE MENSAJES =====
                    else:
                        await whatsapp_service.send_message(
                            from_phone, 
                            "Lo siento, solo puedo procesar mensajes de texto, imágenes y audios por ahora."
                        )
                        logger.warning(f" Tipo de mensaje no soportado: {message_type}")
        
        return JSONResponse(content={"status": "success"}, status_code=200)
    
    except Exception as e:
        logger.error(f" Error en webhook: {e}", exc_info=True)
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
            return {
                "user_message": message,
                "bot_response": faq_response,
                "type": "faq",
                "conversation_id": conversation_id
            }
        
        history = conversations.get(conversation_id, [])[-MAX_HISTORY:]
        response = await openai_service.generate_response(message, history)
        
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
        # Obtener body y auth header
        body = await request.json()
        auth_header = request.headers.get("Authorization", "")
        
        # Procesar con el servicio de Teams
        await teams_service.process_activity(body, auth_header)
        
        return Response(status_code=200)
        
    except Exception as e:
        print(f"Error en endpoint /api/messages: {e}")
        return Response(status_code=500)

@app.get("/api/escalations")
async def get_escalations():
    """Ver todas las solicitudes de agente humano"""
    try:
        if os.path.exists("escalations.json"):
            with open("escalations.json", 'r', encoding='utf-8') as f:
                escalations = json.load(f)
            return {"escalations": escalations, "count": len(escalations)}
        else:
            return {"escalations": [], "count": 0}
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/stats")
async def get_stats():
    """Estadísticas básicas del chatbot"""
    try:
        total_conversations = len(conversations)
        total_escalations = 0
        
        if os.path.exists("escalations.json"):
            with open("escalations.json", 'r', encoding='utf-8') as f:
                escalations = json.load(f)
                total_escalations = len(escalations)
        
        return {
            "active_conversations": total_conversations,
            "total_escalations": total_escalations,
            "status": "running"
        }
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)