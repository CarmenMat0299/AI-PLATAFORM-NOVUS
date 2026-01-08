import logging
import json
import os
from datetime import datetime, timedelta
from typing import Dict
import re

logger = logging.getLogger(__name__)

class MeetingSchedulerTool:
    """Herramienta para agendar reuniones con Novus"""
    
    # Horario laboral de Novus
    BUSINESS_HOURS = {
        "start": 8,  # 8:00 AM
        "end": 17,   # 5:00 PM
        "timezone": "America/Costa_Rica"
    }
    
    BUSINESS_DAYS = [0, 1, 2, 3, 4]  # Lunes a Viernes (0=Monday, 6=Sunday)
    
    # Tipos de reunión disponibles
    MEETING_TYPES = {
        "consulta_inicial": {
            "nombre": "Consulta Inicial",
            "duracion_minutos": 30,
            "descripcion": "Primera reunión para entender sus necesidades"
        },
        "demo_producto": {
            "nombre": "Demostración de Producto",
            "duracion_minutos": 45,
            "descripcion": "Presentación de nuestras soluciones y capacidades"
        },
        "consultoria_tecnica": {
            "nombre": "Consultoría Técnica",
            "duracion_minutos": 60,
            "descripcion": "Sesión técnica detallada sobre arquitectura y soluciones"
        },
        "seguimiento": {
            "nombre": "Seguimiento",
            "duracion_minutos": 30,
            "descripcion": "Reunión de seguimiento de proyecto o propuesta"
        }
    }
    
    @staticmethod
    def get_tool_definition() -> Dict:
        """Retorna la definición de la herramienta para Azure OpenAI"""
        return {
            "type": "function",
            "function": {
                "name": "schedule_meeting",
                "description": "Agenda una reunión con el equipo de Novus Soluciones. Usa esto cuando el usuario quiere agendar una cita, reunión, llamada o consulta con Novus.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "meeting_type": {
                            "type": "string",
                            "description": "Tipo de reunión solicitada",
                            "enum": ["consulta_inicial", "demo_producto", "consultoria_tecnica", "seguimiento"]
                        },
                        "preferred_date": {
                            "type": "string",
                            "description": "Fecha preferida en formato YYYY-MM-DD. Si el usuario dice 'mañana', 'próxima semana', calcula la fecha."
                        },
                        "preferred_time": {
                            "type": "string",
                            "description": "Hora preferida en formato HH:MM (24 horas). Ejemplo: '09:00', '14:30'"
                        },
                        "contact_name": {
                            "type": "string",
                            "description": "Nombre completo de la persona que agenda"
                        },
                        "contact_phone": {
                            "type": "string",
                            "description": "Teléfono de contacto"
                        },
                        "contact_email": {
                            "type": "string",
                            "description": "Email de contacto (opcional)"
                        },
                        "topic": {
                            "type": "string",
                            "description": "Tema o motivo de la reunión"
                        }
                    },
                    "required": ["meeting_type", "contact_name", "contact_phone"]
                }
            }
        }
    
    @classmethod
    def execute(cls, arguments: Dict) -> Dict:
        """Ejecuta la solicitud de agendamiento"""
        try:
            logger.info(f" Procesando solicitud de reunión...")
            
            meeting_type = arguments.get("meeting_type")
            preferred_date = arguments.get("preferred_date")
            preferred_time = arguments.get("preferred_time")
            contact_name = arguments.get("contact_name")
            contact_phone = arguments.get("contact_phone")
            contact_email = arguments.get("contact_email", "")
            topic = arguments.get("topic", "No especificado")
            
            # Validar tipo de reunión
            if meeting_type not in cls.MEETING_TYPES:
                return {
                    "success": False,
                    "message": f"Tipo de reunión inválido: {meeting_type}",
                    "available_types": list(cls.MEETING_TYPES.keys())
                }
            
            meeting_info = cls.MEETING_TYPES[meeting_type]
            
            # Validar fecha y hora si fueron proporcionadas
            validation_result = cls._validate_datetime(preferred_date, preferred_time)
            
            if not validation_result["valid"]:
                return {
                    "success": False,
                    "message": validation_result["message"],
                    "suggestion": validation_result.get("suggestion")
                }
            
            # Crear solicitud de reunión
            meeting_request = {
                "id": cls._generate_meeting_id(),
                "tipo": meeting_type,
                "tipo_nombre": meeting_info["nombre"],
                "duracion_minutos": meeting_info["duracion_minutos"],
                "fecha_solicitada": preferred_date if preferred_date else "Por confirmar",
                "hora_solicitada": preferred_time if preferred_time else "Por confirmar",
                "contacto": {
                    "nombre": contact_name,
                    "telefono": contact_phone,
                    "email": contact_email
                },
                "tema": topic,
                "estado": "pendiente_confirmacion",
                "fecha_solicitud": datetime.now().isoformat(),
                "canal": "whatsapp"
            }
            
            # Guardar solicitud
            cls._save_meeting_request(meeting_request)
            
            logger.info(f" Solicitud de reunión creada: {meeting_request['id']}")
            
            # Preparar respuesta
            response = {
                "success": True,
                "message": "Solicitud de reunión registrada exitosamente",
                "meeting_id": meeting_request["id"],
                "details": {
                    "tipo": meeting_info["nombre"],
                    "duracion": f"{meeting_info['duracion_minutos']} minutos",
                    "fecha_solicitada": meeting_request["fecha_solicitada"],
                    "hora_solicitada": meeting_request["hora_solicitada"],
                    "contacto": contact_name,
                    "telefono": contact_phone
                },
                "next_steps": [
                    "Nuestro equipo revisará su solicitud",
                    "Recibirá confirmación dentro de 24 horas hábiles",
                    "Le contactaremos al número proporcionado",
                    "Recibirá un recordatorio antes de la reunión"
                ],
                "horario_atencion": "Lunes a Viernes, 8:00 AM - 5:00 PM (hora Costa Rica)"
            }
            
            # Sugerir horarios si no se especificó
            if not preferred_date or not preferred_time:
                response["available_slots"] = cls._get_available_slots()
            
            return response
            
        except Exception as e:
            logger.error(f" Error agendando reunión: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Error al procesar la solicitud: {str(e)}",
                "contact_support": "Por favor contacte a info@novuscr.com o llame al horario de oficina"
            }
    
    @classmethod
    def _validate_datetime(cls, date_str: str, time_str: str) -> Dict:
        """Valida que la fecha y hora sean válidas y dentro del horario laboral"""
        if not date_str and not time_str:
            return {
                "valid": True,
                "message": "Fecha y hora no especificadas, se coordinarán con el cliente"
            }
        
        try:
            # Validar fecha
            if date_str:
                try:
                    requested_date = datetime.strptime(date_str, "%Y-%m-%d")
                except ValueError:
                    return {
                        "valid": False,
                        "message": "Formato de fecha inválido. Use YYYY-MM-DD (ejemplo: 2024-12-25)"
                    }
                
                # Verificar que no sea en el pasado
                if requested_date.date() < datetime.now().date():
                    return {
                        "valid": False,
                        "message": "No se pueden agendar reuniones en fechas pasadas"
                    }
                
                # Verificar que sea día hábil
                if requested_date.weekday() not in cls.BUSINESS_DAYS:
                    return {
                        "valid": False,
                        "message": "Solo se pueden agendar reuniones de Lunes a Viernes",
                        "suggestion": "Por favor seleccione un día entre semana"
                    }
            
            # Validar hora
            if time_str:
                try:
                    time_parts = time_str.split(':')
                    hour = int(time_parts[0])
                    minute = int(time_parts[1]) if len(time_parts) > 1 else 0
                except (ValueError, IndexError):
                    return {
                        "valid": False,
                        "message": "Formato de hora inválido. Use HH:MM en formato 24 horas (ejemplo: 09:00, 14:30)"
                    }
                
                # Verificar horario laboral
                if hour < cls.BUSINESS_HOURS["start"] or hour >= cls.BUSINESS_HOURS["end"]:
                    return {
                        "valid": False,
                        "message": f"La hora debe estar entre {cls.BUSINESS_HOURS['start']}:00 y {cls.BUSINESS_HOURS['end']}:00",
                        "suggestion": "Nuestro horario es de Lunes a Viernes, 8:00 AM - 5:00 PM"
                    }
            
            return {
                "valid": True,
                "message": "Fecha y hora válidas"
            }
            
        except Exception as e:
            return {
                "valid": False,
                "message": f"Error validando fecha/hora: {str(e)}"
            }
    
    @classmethod
    def _get_available_slots(cls) -> list:
        """Genera horarios disponibles para los próximos 3 días hábiles"""
        available = []
        current = datetime.now()
        days_checked = 0
        slots_found = 0
        
        while slots_found < 6 and days_checked < 10:  # Máximo 6 slots o 10 días
            current += timedelta(days=1)
            days_checked += 1
            
            # Solo días hábiles
            if current.weekday() not in cls.BUSINESS_DAYS:
                continue
            
            # Horarios típicos: 9:00, 11:00, 14:00, 16:00
            for hour in [9, 11, 14, 16]:
                if hour < cls.BUSINESS_HOURS["end"]:
                    available.append({
                        "fecha": current.strftime("%Y-%m-%d"),
                        "hora": f"{hour:02d}:00",
                        "dia_semana": current.strftime("%A")
                    })
                    slots_found += 1
                    if slots_found >= 6:
                        break
        
        return available
    
    @staticmethod
    def _generate_meeting_id() -> str:
        """Genera un ID único para la reunión"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        return f"MTG-{timestamp}"
    
    @staticmethod
    def _save_meeting_request(meeting_request: Dict):
        """Guarda la solicitud de reunión en un archivo JSON"""
        try:
            filename = "meeting_requests.json"
            
            # Leer requests existentes
            if os.path.exists(filename):
                with open(filename, 'r', encoding='utf-8') as f:
                    requests = json.load(f)
            else:
                requests = []
            
            # Agregar nueva solicitud
            requests.append(meeting_request)
            
            # Guardar
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(requests, f, indent=2, ensure_ascii=False)
            
            logger.info(f" Solicitud guardada en {filename}")
            
        except Exception as e:
            logger.error(f" Error guardando solicitud: {e}")