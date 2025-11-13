import os
import azure.cognitiveservices.speech as speechsdk
from dotenv import load_dotenv
import logging
import tempfile
import aiohttp
from pydub import AudioSegment
from .keyvault_service import KeyVaultService

load_dotenv()
logger = logging.getLogger(__name__)

class AzureSpeechService:
    def __init__(self):
        kv = KeyVaultService()
        speech_key = kv.get_secret('AzureAIKey')
        
        # Obtener región directamente del Key Vault
        try:
            region = kv.get_secret('AzureAIRegion')
            logger.info(f"✅ Región obtenida del Key Vault: {region}")
        except:
            # Fallback a eastus2 si no existe
            region = "eastus2"
            logger.warning(f"⚠️ AzureAIRegion no encontrado, usando fallback: {region}")
        
        logger.info(f"Speech Service inicializando con región: {region}")
        
        self.speech_config = speechsdk.SpeechConfig(
            subscription=speech_key,
            region=region
        )
        
        # Configuración para español
        self.speech_config.speech_recognition_language = "es-ES"
        self.speech_config.speech_synthesis_language = "es-ES"
        self.speech_config.speech_synthesis_voice_name = "es-ES-ElviraNeural"
    
    async def download_audio(self, audio_url):
        """Descargar audio de WhatsApp"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(audio_url) as response:
                    if response.status == 200:
                        return await response.read()
                    else:
                        logger.error(f"Error downloading audio: {response.status}")
                        return None
        except Exception as e:
            logger.error(f"Error in download_audio: {e}")
            return None
    
    def speech_to_text(self, audio_file_path):
        """Convertir audio a texto - con soporte para OGG"""
        try:
            logger.info(f"Iniciando transcripcion de: {audio_file_path}")
            
            # Si es OGG, convertir a WAV primero
            wav_path = None
            if audio_file_path.endswith('.ogg'):
                logger.info("Detectado formato OGG, convirtiendo a WAV...")
                
                # Cargar OGG
                audio = AudioSegment.from_file(audio_file_path, format="ogg")
                
                # Crear archivo WAV temporal
                wav_path = audio_file_path.replace('.ogg', '.wav')
                
                # Exportar como WAV mono 16kHz (formato optimo para Speech Service)
                audio = audio.set_frame_rate(16000).set_channels(1)
                audio.export(wav_path, format="wav")
                
                logger.info(f"Audio convertido a: {wav_path}")
                audio_file_path = wav_path
            
            # Configurar reconocimiento
            audio_config = speechsdk.audio.AudioConfig(filename=audio_file_path)
            speech_recognizer = speechsdk.SpeechRecognizer(
                speech_config=self.speech_config,
                audio_config=audio_config
            )
            
            # Reconocimiento
            result = speech_recognizer.recognize_once()
            
            if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                logger.info(f"Texto reconocido: {result.text}")
                return result.text
            elif result.reason == speechsdk.ResultReason.NoMatch:
                logger.warning("No se pudo reconocer el audio - No Match")
                logger.warning(f"Detalles: {result.no_match_details}")
                return None
            elif result.reason == speechsdk.ResultReason.Canceled:
                cancellation = result.cancellation_details
                logger.error(f"Reconocimiento cancelado: {cancellation.reason}")
                logger.error(f"Error details: {cancellation.error_details}")
                return None
            
            return None
            
        except Exception as e:
            logger.error(f"Error en speech-to-text: {e}", exc_info=True)
            return None
        finally:
            # Limpiar archivo WAV temporal si existe
            if wav_path and os.path.exists(wav_path):
                try:
                    os.unlink(wav_path)
                    logger.info(f"Archivo temporal WAV eliminado: {wav_path}")
                except Exception as e:
                    logger.warning(f"No se pudo eliminar archivo temporal: {e}")
    
    def text_to_speech(self, text, output_file=None):
        """Convertir texto a audio (opcional)"""
        try:
            if output_file:
                audio_config = speechsdk.audio.AudioOutputConfig(filename=output_file)
            else:
                audio_config = speechsdk.audio.AudioOutputConfig(use_default_speaker=True)
            
            speech_synthesizer = speechsdk.SpeechSynthesizer(
                speech_config=self.speech_config,
                audio_config=audio_config
            )
            
            # SSML para mejor control de la voz
            ssml = f"""
            <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='es-ES'>
                <voice name='es-ES-ElviraNeural'>
                    <prosody rate='medium' pitch='medium'>
                        {text}
                    </prosody>
                </voice>
            </speak>
            """
            
            result = speech_synthesizer.speak_ssml_async(ssml).get()
            
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                logger.info("Audio sintetizado correctamente")
                return result.audio_data
            else:
                logger.error(f"Error en sintesis: {result.reason}")
                return None
                
        except Exception as e:
            logger.error(f"Error en text-to-speech: {e}")
            return None
    
    async def process_audio_message(self, audio_url):
        """Procesar mensaje de audio completo"""
        
        # 1. Descargar el audio
        audio_data = await self.download_audio(audio_url)
        
        if not audio_data:
            return None
        
        # 2. Guardar temporalmente
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            temp_file.write(audio_data)
            temp_path = temp_file.name
        
        # 3. Convertir a texto
        try:
            text = self.speech_to_text(temp_path)
            return text
        finally:
            # 4. Limpiar archivo temporal
            try:
                os.unlink(temp_path)
            except:
                pass