import json
import os
import logging
from datetime import datetime, date
from typing import List, Dict, Optional
from datetime import datetime, date, timezone
import pytz

logger = logging.getLogger(__name__)

CR_TZ = pytz.timezone('America/Costa_Rica')

def get_utc_now():
    """Obtener fecha/hora actual en UTC con formato ISO"""
    return datetime.now(timezone.utc).isoformat()

def get_today_cr():
    """Obtener la fecha de hoy en zona horaria de Costa Rica"""
    return datetime.now(CR_TZ).date().isoformat()

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
    
    def save_message(self, phone: str, message: str, role: str = "user", channel: str = "whatsapp", user_name: str = None) -> bool:
        """
        Guardar un mensaje en la conversación
        
        Args:
            phone: Número de teléfono o email del usuario
            message: Contenido del mensaje
            role: "user" o "assistant"
            channel: "whatsapp" o "teams"
            user_name: Nombre del usuario (opcional)
        
        Returns:
            True si se guardó correctamente, False si hubo error
        """
        try:
            # Leer conversaciones existentes
            all_conversations = self._load_conversations()
            
            # Obtener fecha actual
            today = get_today_cr()
            
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
                    "user_name": user_name or phone,  # 🆕 Guardar nombre del usuario
                    "date": today,
                    "channel": channel,
                    "started_at": datetime.now(CR_TZ).isoformat(),
                    "last_message_at": datetime.now(CR_TZ).isoformat(),
                    "messages": [],
                    "message_count": 0
                }
                all_conversations.append(user_conv)
                logger.info(f"✅ Nueva conversación creada para {user_name or phone}")
            else:
                # 🆕 Actualizar nombre si se proporcionó uno nuevo
                if user_name:
                    user_conv["user_name"] = user_name
            
            # Agregar mensaje
            user_conv["messages"].append({
                "role": role,
                "content": message,
                "timestamp": datetime.now(CR_TZ).isoformat()
            })
            user_conv["last_message_at"] = datetime.now(CR_TZ).isoformat()
            user_conv["message_count"] = len(user_conv["messages"])
            
            # Guardar todo
            self._save_conversations(all_conversations)
            
            logger.info(f"✅ Mensaje guardado - {user_name or phone} ({role})")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error guardando mensaje: {e}", exc_info=True)
            return False
    
    def get_today_conversations(self) -> List[Dict]:
        """
        Obtener todas las conversaciones del día actual

        Returns:
            Lista de conversaciones
        """
        try:
            all_conversations = self._load_conversations()
            today = get_today_cr()

            # Filtrar solo del día actual
            today_conversations = [
                conv for conv in all_conversations
                if conv.get('date') == today
            ]

            logger.info(f"📋 {len(today_conversations)} conversaciones de hoy")
            return today_conversations

        except Exception as e:
            logger.error(f"❌ Error obteniendo conversaciones: {e}")
            return []

    def get_all_conversations(self) -> List[Dict]:
        """
        Obtener todas las conversaciones (sin filtrar por fecha)

        Returns:
            Lista de todas las conversaciones
        """
        try:
            all_conversations = self._load_conversations()
            logger.info(f"📋 {len(all_conversations)} conversaciones totales")
            return all_conversations

        except Exception as e:
            logger.error(f"❌ Error obteniendo conversaciones: {e}")
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
    
    def clear_old_conversations(self, save_metrics: bool = True) -> int:
        """
        Limpiar conversaciones de días anteriores

        Args:
            save_metrics: Si True, guarda snapshot de métricas antes de limpiar

        Returns:
            Número de conversaciones eliminadas
        """
        try:
            all_conversations = self._load_conversations()
            today = get_today_cr()

            # Obtener conversaciones de días anteriores
            old_conversations = [
                conv for conv in all_conversations
                if conv.get('date') != today
            ]

            # Guardar métricas de días anteriores antes de eliminar
            if save_metrics and old_conversations:
                self._save_metrics_snapshots(old_conversations)

            # Mantener solo las de hoy
            today_conversations = [
                conv for conv in all_conversations
                if conv.get('date') == today
            ]

            self._save_conversations(today_conversations)

            old_count = len(old_conversations)
            if old_count > 0:
                logger.info(f"🧹 {old_count} conversaciones antiguas eliminadas")

            return old_count

        except Exception as e:
            logger.error(f"Error limpiando conversaciones: {e}")
            return 0

    def _save_metrics_snapshots(self, conversations: List[Dict]) -> None:
        """
        Guardar snapshots de métricas para días anteriores

        Args:
            conversations: Lista de conversaciones a procesar
        """
        try:
            from .metrics_history_service import MetricsHistoryService

            metrics_service = MetricsHistoryService()

            # Agrupar conversaciones por día
            conversations_by_day = {}
            for conv in conversations:
                day = conv.get('date')
                if day:
                    if day not in conversations_by_day:
                        conversations_by_day[day] = []
                    conversations_by_day[day].append(conv)

            # Guardar snapshot para cada día
            for day, day_convs in conversations_by_day.items():
                # Calcular métricas del día
                total_conversations = len(day_convs)
                whatsapp_convs = len([c for c in day_convs if c.get('channel') == 'whatsapp'])
                teams_convs = len([c for c in day_convs if c.get('channel') == 'teams'])

                total_messages = sum(c.get('message_count', 0) for c in day_convs)
                unique_users = len(set(c.get('phone') for c in day_convs if c.get('phone')))

                # Calcular tiempo promedio de respuesta
                response_times = []
                for conv in day_convs:
                    messages = conv.get('messages', [])
                    for i in range(len(messages) - 1):
                        if messages[i].get('role') == 'user' and messages[i+1].get('role') == 'assistant':
                            try:
                                user_time = datetime.fromisoformat(messages[i]['timestamp'])
                                bot_time = datetime.fromisoformat(messages[i+1]['timestamp'])

                                if user_time.tzinfo is None:
                                    user_time = CR_TZ.localize(user_time)
                                if bot_time.tzinfo is None:
                                    bot_time = CR_TZ.localize(bot_time)

                                diff_seconds = (bot_time - user_time).total_seconds()
                                if 0 < diff_seconds < 600:
                                    response_times.append(diff_seconds)
                            except:
                                pass

                avg_response_time = sum(response_times) / len(response_times) if response_times else None

                # Cargar escalaciones del día
                escalations_file = os.path.join(os.path.dirname(__file__), '..', '..', 'escalations.json')
                escalations_created = 0
                escalations_resolved = 0

                if os.path.exists(escalations_file):
                    with open(escalations_file, 'r', encoding='utf-8') as f:
                        all_escalations = json.load(f)

                    for esc in all_escalations:
                        esc_date = esc.get('timestamp', '')[:10]  # YYYY-MM-DD
                        if esc_date == day:
                            escalations_created += 1
                            if esc.get('resolved', False):
                                escalations_resolved += 1

                # Guardar snapshot
                metrics_service.save_daily_snapshot(
                    date_str=day,
                    total_conversations=total_conversations,
                    whatsapp_conversations=whatsapp_convs,
                    teams_conversations=teams_convs,
                    total_messages=total_messages,
                    unique_users=unique_users,
                    escalations_created=escalations_created,
                    escalations_resolved=escalations_resolved,
                    avg_response_time_seconds=avg_response_time
                )

                logger.info(f"📊 Snapshot guardado para {day}")

        except Exception as e:
            logger.error(f"Error guardando snapshots de métricas: {e}", exc_info=True)