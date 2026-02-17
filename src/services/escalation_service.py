import os
import logging
from datetime import datetime, timezone
import json

logger = logging.getLogger(__name__)

def get_utc_now():
    """Obtener fecha/hora actual en UTC con formato ISO"""
    return datetime.now(timezone.utc).isoformat()

class EscalationService:
    def __init__(self):
        # Usar ruta absoluta relativa al archivo actual para consistencia
        self.escalations_file = os.path.join(os.path.dirname(__file__), '..', '..', 'escalations.json')
        self.escalated_users = set()

    def _add_to_history(self, escalation: dict, action: str, value: str = None, user: str = None, details: str = None):
        """Agregar entrada al historial de cambios"""
        if 'history' not in escalation:
            escalation['history'] = []

        history_entry = {
            'id': f"hist_{datetime.now(timezone.utc).timestamp()}",
            'action': action,
            'timestamp': get_utc_now(),
        }

        if value:
            history_entry['value'] = value
        if user:
            history_entry['user'] = user
        if details:
            history_entry['details'] = details

        escalation['history'].append(history_entry)
    
    def escalate_to_human(self, user_phone, user_message, conversation_history):
        """Registrar escalamiento a agente humano"""
        now = get_utc_now()

        escalation_data = {
            "timestamp": now,
            "user_phone": user_phone,
            "last_message": user_message,
            "conversation": conversation_history[-5:] if conversation_history else [],
            "status": "pending",
            "resolved": False,
            "history": [{
                'id': f"hist_{datetime.now(timezone.utc).timestamp()}",
                'action': 'created',
                'timestamp': now,
                'details': f'Escalación creada desde WhatsApp'
            }]
        }

        # Guardar en archivo JSON
        self._save_escalation(escalation_data)
        
        # Marcar usuario como escalado
        self.escalated_users.add(user_phone)
        
        # Aquí podrías enviar email/notificación
        self._notify_agent(escalation_data)
        
        logger.info(f" Escalado a humano: {user_phone}")
        
        return True
    
    def _save_escalation(self, data):
        """Guardar escalamiento en archivo"""
        try:
            # Leer escalamientos existentes
            if os.path.exists(self.escalations_file):
                with open(self.escalations_file, 'r', encoding='utf-8') as f:
                    escalations = json.load(f)
            else:
                escalations = []
            
            # Agregar nuevo
            escalations.append(data)
            
            # Guardar
            with open(self.escalations_file, 'w', encoding='utf-8') as f:
                json.dump(escalations, f, indent=2, ensure_ascii=False)
            
            logger.info(" Escalamiento guardado en archivo")
        except Exception as e:
            logger.error(f" Error guardando escalamiento: {e}")
    
    def _notify_agent(self, data):
        """Notificar a un agente (placeholder)"""
        # Aquí podrías:
        # 1. Enviar email
        # 2. Enviar webhook a sistema de tickets
        # 3. Notificar en Slack/Teams
        # 4. Crear ticket en sistema CRM
        
        logger.info(f" Notificación de escalamiento: {data['user_phone']}")
        
        # Ejemplo: Imprimir en consola
        print("\n" + "="*60)
        print(" NUEVA SOLICITUD DE AGENTE HUMANO")
        print("="*60)
        print(f"Usuario: {data['user_phone']}")
        print(f"Hora: {data['timestamp']}")
        print(f"Último mensaje: {data['last_message']}")
        print("="*60 + "\n")
    
    def is_escalated(self, user_phone):
        """Verificar si usuario ya fue escalado"""
        return user_phone in self.escalated_users
    
    def resolve_escalation(self, user_phone: str, resolved_by: str = None) -> bool:
        """Marcar escalamiento como resuelto"""
        try:
            #  Leer archivo JSON
            if not os.path.exists(self.escalations_file):
                logger.warning(f" Archivo de escalaciones no existe")
                return False

            with open(self.escalations_file, 'r', encoding='utf-8') as f:
                escalations = json.load(f)

            #  Buscar y marcar como resuelta
            found = False
            for escalation in escalations:
                if escalation.get('user_phone') == user_phone and not escalation.get('resolved', False):
                    escalation['resolved'] = True
                    escalation['resolved_at'] = get_utc_now()
                    escalation['resolved_by'] = resolved_by
                    escalation['status'] = 'resolved'
                    self._add_to_history(escalation, 'resolved', user=resolved_by)
                    found = True
                    logger.info(f" Escalación marcada como resuelta: {user_phone} por {resolved_by}")
                    break
            
            if not found:
                logger.warning(f" No se encontró escalación pendiente para: {user_phone}")
                return False
            
            #  Guardar archivo actualizado
            with open(self.escalations_file, 'w', encoding='utf-8') as f:
                json.dump(escalations, f, indent=2, ensure_ascii=False)
            
            # Remover del set en memoria
            if user_phone in self.escalated_users:
                self.escalated_users.remove(user_phone)
            
            return True

        except Exception as e:
            logger.error(f" Error resolviendo escalación: {e}")
            return False

    def update_priority(self, user_phone: str, priority: str) -> bool:
        """Actualizar prioridad de escalación"""
        try:
            if not os.path.exists(self.escalations_file):
                return False

            with open(self.escalations_file, 'r', encoding='utf-8') as f:
                escalations = json.load(f)

            found = False
            priority_labels = {'low': 'Baja', 'medium': 'Media', 'high': 'Alta', 'urgent': 'Urgente'}
            for escalation in escalations:
                if escalation.get('user_phone') == user_phone and not escalation.get('resolved', False):
                    old_priority = escalation.get('priority', 'none')
                    escalation['priority'] = priority
                    escalation['priority_updated_at'] = get_utc_now()
                    self._add_to_history(escalation, 'priority_changed', value=priority_labels.get(priority, priority))
                    found = True
                    logger.info(f"Prioridad actualizada para {user_phone}: {priority}")
                    break

            if found:
                with open(self.escalations_file, 'w', encoding='utf-8') as f:
                    json.dump(escalations, f, indent=2, ensure_ascii=False)

            return found

        except Exception as e:
            logger.error(f"Error actualizando prioridad: {e}")
            return False

    def update_note(self, user_phone: str, note: str) -> bool:
        """Agregar nota interna a escalación"""
        try:
            if not os.path.exists(self.escalations_file):
                return False

            with open(self.escalations_file, 'r', encoding='utf-8') as f:
                escalations = json.load(f)

            found = False
            for escalation in escalations:
                if escalation.get('user_phone') == user_phone and not escalation.get('resolved', False):
                    if 'notes' not in escalation:
                        escalation['notes'] = []
                    escalation['notes'].append({
                        'content': note,
                        'timestamp': get_utc_now()
                    })
                    self._add_to_history(escalation, 'note_added', details=note[:100] + ('...' if len(note) > 100 else ''))
                    found = True
                    logger.info(f"Nota agregada para {user_phone}")
                    break

            if found:
                with open(self.escalations_file, 'w', encoding='utf-8') as f:
                    json.dump(escalations, f, indent=2, ensure_ascii=False)

            return found

        except Exception as e:
            logger.error(f"Error agregando nota: {e}")
            return False

    def assign_agent(self, user_phone: str, agent: str) -> bool:
        """Asignar agente a escalación"""
        try:
            if not os.path.exists(self.escalations_file):
                return False

            with open(self.escalations_file, 'r', encoding='utf-8') as f:
                escalations = json.load(f)

            found = False
            for escalation in escalations:
                if escalation.get('user_phone') == user_phone and not escalation.get('resolved', False):
                    old_agent = escalation.get('assigned_agent')
                    escalation['assigned_agent'] = agent
                    escalation['assigned_at'] = get_utc_now() if agent else None

                    if agent:
                        self._add_to_history(escalation, 'assigned', value=agent)
                    elif old_agent:
                        self._add_to_history(escalation, 'unassigned')

                    found = True
                    logger.info(f"Agente asignado para {user_phone}: {agent}")
                    break

            if found:
                with open(self.escalations_file, 'w', encoding='utf-8') as f:
                    json.dump(escalations, f, indent=2, ensure_ascii=False)

            return found

        except Exception as e:
            logger.error(f"Error asignando agente: {e}")
            return False

    def update_status(self, user_phone: str, status: str) -> bool:
        """Actualizar estado de escalación (pending, in_progress, resolved)"""
        try:
            if not os.path.exists(self.escalations_file):
                return False

            with open(self.escalations_file, 'r', encoding='utf-8') as f:
                escalations = json.load(f)

            found = False
            status_labels = {'pending': 'Pendiente', 'in_progress': 'En proceso', 'resolved': 'Resuelto'}
            for escalation in escalations:
                if escalation.get('user_phone') == user_phone and not escalation.get('resolved', False):
                    old_status = escalation.get('status', 'pending')
                    escalation['status'] = status
                    escalation['status_updated_at'] = get_utc_now()
                    self._add_to_history(escalation, 'status_changed', value=status_labels.get(status, status))
                    found = True
                    logger.info(f"Estado actualizado para {user_phone}: {status}")
                    break

            if found:
                with open(self.escalations_file, 'w', encoding='utf-8') as f:
                    json.dump(escalations, f, indent=2, ensure_ascii=False)

            return found

        except Exception as e:
            logger.error(f"Error actualizando estado: {e}")
            return False