import os
import logging
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class EscalationService:
    def __init__(self):
        self.escalations_file = "escalations.json"
        self.escalated_users = set()
    
    def escalate_to_human(self, user_phone, user_message, conversation_history):
        """Registrar escalamiento a agente humano"""
        
        escalation_data = {
            "timestamp": datetime.now().isoformat(),
            "user_phone": user_phone,
            "last_message": user_message,
            "conversation": conversation_history[-5:] if conversation_history else [],
            "status": "pending",
            "resolved": False  #  Agregar campo resolved
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
    
    def resolve_escalation(self, user_phone: str) -> bool:
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
                    escalation['resolved_at'] = datetime.now().isoformat()
                    escalation['status'] = 'resolved'
                    found = True
                    logger.info(f" Escalación marcada como resuelta: {user_phone}")
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