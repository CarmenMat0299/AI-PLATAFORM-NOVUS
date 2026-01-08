import json
import os
import logging
from datetime import datetime, date
from typing import List, Dict, Optional
from datetime import datetime, date, timezone
import pytz

logger = logging.getLogger(__name__)

CR_TZ = pytz.timezone('America/Costa_Rica')

class ConversationService:
    """Servicio para gestionar conversaciones diarias"""
    
    def __init__(self):
        # Ruta al archivo de conversaciones (en la raíz del proyecto)
        self.conversations_file = os.path.join(
            os.path.dirname(__file__), 
            '..', 
            '..', 
            'conversations.json'
        )
        logger.info(f"ConversationService inicializado - archivo: {self.conversations_file}")
    
    def save_message(self, phone: str, message: str, role: str = "user", channel: str = "whatsapp") -> bool:
        """
        Guardar un mensaje en la conversación
        
        Args:
            phone: Número de teléfono o email del usuario
            message: Contenido del mensaje
            role: "user" o "assistant"
            channel: "whatsapp" o "teams"
        
        Returns:
            True si se guardó correctamente, False si hubo error
        """
        try:
            # Leer conversaciones existentes
            all_conversations = self._load_conversations()
            
            # Obtener fecha actual
            today = date.today().isoformat()
            
            # Limpiar conversaciones de días anteriores
            all_conversations = [
                conv for conv in all_conversations 
                if conv.get('date') == today
            ]
            
            # Buscar conversación del usuario de hoy
            user_conv = None
            for conv in all_conversations:
                if conv.get('phone') == phone and conv.get('date') == today:
                    user_conv = conv
                    break
            
            # Si no existe, crear nueva conversación
            if not user_conv:
                user_conv = {
                    "phone": phone,
                    "date": today,
                    "channel": channel,
                    "started_at": datetime.now(CR_TZ).isoformat(),
                    "last_message_at": datetime.now(CR_TZ).isoformat(),
                    "messages": [],
                    "message_count": 0
                }
                all_conversations.append(user_conv)
                logger.info(f" Nueva conversación creada para {phone}")
            
            # Agregar mensaje
            user_conv["messages"].append({
                "role": role,
                "content": message[:500],  # Limitar longitud
                "timestamp": datetime.now(CR_TZ).isoformat()
            })
            user_conv["last_message_at"] = datetime.now(CR_TZ).isoformat()
            user_conv["message_count"] = len(user_conv["messages"])
            
            # Guardar todo
            self._save_conversations(all_conversations)
            
            logger.info(f" Mensaje guardado - {phone} ({role})")
            return True
            
        except Exception as e:
            logger.error(f" Error guardando mensaje: {e}", exc_info=True)
            return False
    
    def get_today_conversations(self) -> List[Dict]:
        """
        Obtener todas las conversaciones del día actual
        
        Returns:
            Lista de conversaciones
        """
        try:
            all_conversations = self._load_conversations()
            today = date.today().isoformat()
            
            # Filtrar solo del día actual
            today_conversations = [
                conv for conv in all_conversations 
                if conv.get('date') == today
            ]
            
            logger.info(f" {len(today_conversations)} conversaciones de hoy")
            return today_conversations
            
        except Exception as e:
            logger.error(f" Error obteniendo conversaciones: {e}")
            return []
    
    def get_conversation_count(self) -> int:
        """
        Obtener número de conversaciones del día
        
        Returns:
            Número de conversaciones
        """
        return len(self.get_today_conversations())
    
    def get_conversation_by_phone(self, phone: str) -> Optional[Dict]:
        """
        Obtener conversación de un usuario específico
        
        Args:
            phone: Número de teléfono o email
        
        Returns:
            Conversación o None si no existe
        """
        conversations = self.get_today_conversations()
        
        for conv in conversations:
            if conv.get('phone') == phone:
                return conv
        
        return None
    
    def _load_conversations(self) -> List[Dict]:
        """Cargar conversaciones desde el archivo JSON"""
        try:
            if os.path.exists(self.conversations_file):
                with open(self.conversations_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                return []
        except Exception as e:
            logger.error(f"Error leyendo archivo: {e}")
            return []
    
    def _save_conversations(self, conversations: List[Dict]) -> bool:
        """Guardar conversaciones en el archivo JSON"""
        try:
            with open(self.conversations_file, 'w', encoding='utf-8') as f:
                json.dump(conversations, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            logger.error(f"Error guardando archivo: {e}")
            return False
    
    def clear_old_conversations(self) -> int:
        """
        Limpiar conversaciones de días anteriores
        
        Returns:
            Número de conversaciones eliminadas
        """
        try:
            all_conversations = self._load_conversations()
            today = date.today().isoformat()
            
            # Contar cuántas se van a eliminar
            old_count = len([
                conv for conv in all_conversations 
                if conv.get('date') != today
            ])
            
            # Mantener solo las de hoy
            today_conversations = [
                conv for conv in all_conversations 
                if conv.get('date') == today
            ]
            
            self._save_conversations(today_conversations)
            
            if old_count > 0:
                logger.info(f" {old_count} conversaciones antiguas eliminadas")
            
            return old_count
            
        except Exception as e:
            logger.error(f"Error limpiando conversaciones: {e}")
            return 0