"""
Servicio para registrar y recuperar actividad reciente del sistema
"""

import json
import os
from datetime import datetime
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class ActivityService:
    """Servicio para gestionar la actividad reciente del sistema"""
    
    def __init__(self, max_activities: int = 50):
        # Ruta al archivo de actividades
        self.activities_file = os.path.join(
            os.path.dirname(__file__), 
            '..', 
            '..', 
            'activities.json'
        )
        self.max_activities = max_activities
        logger.info(f"ActivityService inicializado - archivo: {self.activities_file}")
    
    def log_activity(self, activity_type: str, message: str, details: str = "", phone: str = None):
        """
        Registrar una nueva actividad
        
        Args:
            activity_type: Tipo de actividad (conversation, escalation, tool, system)
            message: Mensaje principal
            details: Detalles adicionales
            phone: Número de teléfono (opcional)
        """
        try:
            activities = self._load_activities()
            
            new_activity = {
                "type": activity_type,
                "message": message,
                "details": details,
                "phone": phone,
                "timestamp": datetime.now().isoformat()
            }
            
            # Agregar al inicio de la lista
            activities.insert(0, new_activity)
            
            # Mantener solo las últimas N actividades
            activities = activities[:self.max_activities]
            
            self._save_activities(activities)
            logger.debug(f"✅ Actividad registrada: {activity_type} - {message}")
            
        except Exception as e:
            logger.error(f"❌ Error registrando actividad: {e}")
    
    def get_recent_activities(self, limit: int = 10) -> List[Dict]:
        """
        Obtener las actividades más recientes
        
        Args:
            limit: Número máximo de actividades a retornar
        
        Returns:
            Lista de actividades
        """
        try:
            activities = self._load_activities()
            return activities[:limit]
        except Exception as e:
            logger.error(f"❌ Error obteniendo actividades: {e}")
            return []
    
    def _load_activities(self) -> List[Dict]:
        """Cargar actividades desde el archivo JSON"""
        try:
            if os.path.exists(self.activities_file):
                with open(self.activities_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                return []
        except Exception as e:
            logger.error(f"Error leyendo archivo de actividades: {e}")
            return []
    
    def _save_activities(self, activities: List[Dict]) -> bool:
        """Guardar actividades en el archivo JSON"""
        try:
            with open(self.activities_file, 'w', encoding='utf-8') as f:
                json.dump(activities, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            logger.error(f"Error guardando actividades: {e}")
            return False