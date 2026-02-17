import json
import logging
from datetime import datetime, timezone
from typing import List, Dict
import os

logger = logging.getLogger(__name__)

class NotificationService:
    """Servicio para gestionar notificaciones del sistema"""

    def __init__(self):
        self.notifications_file = "notifications.json"
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        """Asegurar que el archivo de notificaciones existe"""
        if not os.path.exists(self.notifications_file):
            self._save_notifications([])

    def _load_notifications(self) -> List[Dict]:
        """Cargar notificaciones desde archivo"""
        try:
            with open(self.notifications_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error cargando notificaciones: {e}")
            return []

    def _save_notifications(self, notifications: List[Dict]):
        """Guardar notificaciones en archivo"""
        try:
            with open(self.notifications_file, 'w', encoding='utf-8') as f:
                json.dump(notifications, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error guardando notificaciones: {e}")

    def create_notification(self,
                          notification_type: str,
                          title: str,
                          message: str,
                          data: Dict = None,
                          user_id: str = None) -> Dict:
        """
        Crear una nueva notificación

        Args:
            notification_type: Tipo de notificación (escalation, conversation, system, etc.)
            title: Título de la notificación
            message: Mensaje descriptivo
            data: Datos adicionales asociados
            user_id: ID del usuario (None para notificación global)

        Returns:
            Notificación creada
        """
        notifications = self._load_notifications()

        notification = {
            "id": f"notif_{len(notifications) + 1}_{datetime.now(timezone.utc).timestamp()}",
            "type": notification_type,
            "title": title,
            "message": message,
            "data": data or {},
            "user_id": user_id,  # None = notificación para todos
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "read_at": None
        }

        notifications.insert(0, notification)  # Más recientes primero

        # Mantener solo las últimas 100 notificaciones
        notifications = notifications[:100]

        self._save_notifications(notifications)
        logger.info(f"📬 Notificación creada: {title}")

        return notification

    def get_notifications(self, user_id: str = None, unread_only: bool = False) -> List[Dict]:
        """
        Obtener notificaciones

        Args:
            user_id: ID del usuario (None para obtener todas las globales)
            unread_only: Si True, solo retorna notificaciones no leídas

        Returns:
            Lista de notificaciones
        """
        notifications = self._load_notifications()

        # Filtrar por usuario
        if user_id:
            notifications = [
                n for n in notifications
                if n.get('user_id') is None or n.get('user_id') == user_id
            ]
        else:
            # Solo notificaciones globales
            notifications = [n for n in notifications if n.get('user_id') is None]

        # Filtrar por leídas/no leídas
        if unread_only:
            notifications = [n for n in notifications if not n.get('read', False)]

        return notifications

    def mark_as_read(self, notification_id: str, user_id: str = None) -> bool:
        """
        Marcar notificación como leída

        Args:
            notification_id: ID de la notificación
            user_id: ID del usuario (para validación)

        Returns:
            True si se marcó correctamente
        """
        notifications = self._load_notifications()

        for notification in notifications:
            if notification['id'] == notification_id:
                # Verificar que el usuario tenga permiso
                if user_id and notification.get('user_id') and notification['user_id'] != user_id:
                    return False

                notification['read'] = True
                notification['read_at'] = datetime.now(timezone.utc).isoformat()
                self._save_notifications(notifications)
                logger.info(f"✅ Notificación {notification_id} marcada como leída")
                return True

        return False

    def mark_all_as_read(self, user_id: str = None) -> int:
        """
        Marcar todas las notificaciones como leídas

        Args:
            user_id: ID del usuario (None para todas las globales)

        Returns:
            Número de notificaciones marcadas
        """
        notifications = self._load_notifications()
        count = 0

        for notification in notifications:
            if not notification.get('read', False):
                # Verificar permisos
                if user_id:
                    if notification.get('user_id') is None or notification.get('user_id') == user_id:
                        notification['read'] = True
                        notification['read_at'] = datetime.now(timezone.utc).isoformat()
                        count += 1
                else:
                    if notification.get('user_id') is None:
                        notification['read'] = True
                        notification['read_at'] = datetime.now(timezone.utc).isoformat()
                        count += 1

        if count > 0:
            self._save_notifications(notifications)
            logger.info(f"✅ {count} notificaciones marcadas como leídas")

        return count

    def delete_notification(self, notification_id: str) -> bool:
        """Eliminar una notificación"""
        notifications = self._load_notifications()

        original_len = len(notifications)
        notifications = [n for n in notifications if n['id'] != notification_id]

        if len(notifications) < original_len:
            self._save_notifications(notifications)
            logger.info(f"🗑️ Notificación {notification_id} eliminada")
            return True

        return False

    def get_unread_count(self, user_id: str = None) -> int:
        """Obtener conteo de notificaciones no leídas"""
        notifications = self.get_notifications(user_id=user_id, unread_only=True)
        return len(notifications)

    # Métodos helper para crear notificaciones específicas

    def notify_new_escalation(self, phone: str, message: str):
        """Notificar nueva escalación"""
        return self.create_notification(
            notification_type="escalation",
            title="Nueva Escalación",
            message=f"Nueva solicitud de {phone}",
            data={
                "phone": phone,
                "last_message": message,
                "action_url": "/escalations"
            }
        )

    def notify_escalation_resolved(self, phone: str, resolved_by: str):
        """Notificar escalación resuelta"""
        return self.create_notification(
            notification_type="escalation",
            title="Escalación Resuelta",
            message=f"Escalación de {phone} fue resuelta por {resolved_by}",
            data={
                "phone": phone,
                "resolved_by": resolved_by,
                "action_url": "/escalations"
            }
        )

    def notify_new_conversation(self, phone: str, channel: str):
        """Notificar nueva conversación"""
        return self.create_notification(
            notification_type="conversation",
            title="Nueva Conversación",
            message=f"Nuevo chat desde {channel}: {phone}",
            data={
                "phone": phone,
                "channel": channel,
                "action_url": f"/chat/{phone}"
            }
        )

    def notify_system_alert(self, title: str, message: str, severity: str = "info"):
        """Notificar alerta del sistema"""
        return self.create_notification(
            notification_type="system",
            title=title,
            message=message,
            data={
                "severity": severity
            }
        )
