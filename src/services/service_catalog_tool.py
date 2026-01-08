"""
Herramienta para consultar el catálogo de servicios de Novus
"""

import logging
from typing import Dict, List

logger = logging.getLogger(__name__)

class ServicesCatalogTool:
    """Herramienta para consultar servicios detallados de Novus"""
    
    # Catálogo de servicios de Novus
    SERVICES_CATALOG = {
        "desarrollo_software": {
            "nombre": "Desarrollo de Software",
            "descripcion": "Desarrollo de aplicaciones web, móviles y de escritorio personalizadas según las necesidades del cliente",
            "caracteristicas": [
                "Aplicaciones web responsivas",
                "Aplicaciones móviles (iOS/Android)",
                "Sistemas de gestión empresarial",
                "Integraciones con sistemas existentes",
                "Mantenimiento y soporte continuo"
            ],
            "tecnologias": ["Python", "Java", "JavaScript", "React", "Angular", ".NET"],
            
        },
        "consultoria_ti": {
            "nombre": "Consultoría en Tecnología",
            "descripcion": "Asesoría estratégica para la transformación digital y optimización de procesos tecnológicos",
            "caracteristicas": [
                "Análisis de infraestructura actual",
                "Planificación de arquitectura tecnológica",
                "Evaluación de seguridad",
                "Optimización de procesos",
                "Migración a la nube"
            ],
            "tecnologias": ["Azure", "AWS", "Google Cloud", "On-premise solutions"],
        
        },
        "inteligencia_artificial": {
            "nombre": "Soluciones de Inteligencia Artificial",
            "descripcion": "Implementación de chatbots, asistentes virtuales y soluciones de IA personalizadas",
            "caracteristicas": [
                "Chatbots multicanal (WhatsApp, Teams, Web)",
                "Análisis de datos con ML",
                "Automatización de procesos con IA",
                "Procesamiento de lenguaje natural",
                "Visión por computadora"
            ],
            "tecnologias": ["Azure OpenAI", "GPT-4", "Azure Cognitive Services", "Python", "TensorFlow"],
            "casos_uso": [
                "Atención al cliente 24/7",
                "Automatización de tareas repetitivas",
                "Análisis predictivo",
                "Extracción de información de documentos"
            ]
        },
        "migracion_datos": {
            "nombre": "Migración y Transformación de Datos",
            "descripcion": "Migración segura de bases de datos y transformación de datos entre diferentes plataformas",
            "caracteristicas": [
                "Migración Oracle a SQL Server",
                "Migración a Databricks",
                "ETL y procesamiento de datos",
                "Validación y reconciliación",
                "Minimización de downtime"
            ],
            "tecnologias": ["Oracle", "SQL Server", "Databricks", "Azure Data Factory", "SSIS"]

        },
        "cloud_services": {
            "nombre": "Servicios en la Nube",
            "descripcion": "Implementación, migración y gestión de soluciones en la nube",
            "caracteristicas": [
                "Migración a Azure/AWS",
                "Configuración de infraestructura",
                "Optimización de costos",
                "Seguridad y cumplimiento",
                "Backup y recuperación"
            ],
            "tecnologias": ["Microsoft Azure", "AWS", "Container Apps", "Kubernetes"]
        },
        "soporte_mantenimiento": {
            "nombre": "Soporte y Mantenimiento",
            "descripcion": "Soporte técnico continuo y mantenimiento de sistemas existentes",
            "caracteristicas": [
                "Soporte 8x5 o 24x7",
                "Actualizaciones de software",
                "Monitoreo proactivo",
                "Resolución de incidentes",
                "Optimización de rendimiento"
            ],
            "tecnologias": ["Múltiples plataformas"]
        }
    }
    
    @staticmethod
    def get_tool_definition() -> Dict:
        """Retorna la definición de la herramienta para Azure OpenAI"""
        return {
            "type": "function",
            "function": {
                "name": "get_services_catalog",
                "description": "Consulta el catálogo detallado de servicios de Novus Soluciones. Usa esto cuando el usuario pregunta sobre servicios específicos, tecnologías utilizadas o casos de uso.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "service_type": {
                            "type": "string",
                            "description": "Tipo de servicio a consultar",
                            "enum": [
                                "todos",
                                "desarrollo_software",
                                "consultoria_ti",
                                "inteligencia_artificial",
                                "migracion_datos",
                                "cloud_services",
                                "soporte_mantenimiento"
                            ]
                        },
                        "detail_level": {
                            "type": "string",
                            "description": "Nivel de detalle requerido",
                            "enum": ["resumen", "detallado", "completo"],
                            "default": "detallado"
                        }
                    },
                    "required": ["service_type"]
                }
            }
        }
    
    @classmethod
    def execute(cls, arguments: Dict) -> Dict:
        """Ejecuta la consulta al catálogo de servicios"""
        service_type = arguments.get("service_type", "todos")
        detail_level = arguments.get("detail_level", "detallado")
        
        try:
            logger.info(f"📋 Consultando catálogo de servicios - Tipo: {service_type}, Detalle: {detail_level}")
            
            if service_type == "todos":
                # Retornar resumen de todos los servicios
                services_summary = []
                
                for key, service in cls.SERVICES_CATALOG.items():
                    summary = {
                        "id": key,
                        "nombre": service["nombre"],
                        "descripcion": service["descripcion"]
                    }
                    
                    if detail_level in ["detallado", "completo"]:
                        summary["caracteristicas"] = service["caracteristicas"][:3]  # Primeras 3
                    
                    if detail_level == "completo":
                        summary["tecnologias"] = service["tecnologias"]
                    
                    services_summary.append(summary)
                
                return {
                    "success": True,
                    "message": f"Catálogo completo de servicios de Novus ({len(services_summary)} servicios)",
                    "services": services_summary,
                    "total": len(services_summary)
                }
            
            elif service_type in cls.SERVICES_CATALOG:
                # Retornar servicio específico
                service = cls.SERVICES_CATALOG[service_type].copy()
                
                if detail_level == "resumen":
                    # Solo info básica
                    service = {
                        "nombre": service["nombre"],
                        "descripcion": service["descripcion"],
                    }
                elif detail_level == "detallado":
                    # Info completa sin casos de uso extras
                    if "casos_uso" in service:
                        del service["casos_uso"]
                
                return {
                    "success": True,
                    "message": f"Información del servicio: {service.get('nombre', service_type)}",
                    "service": service,
                    "service_id": service_type
                }
            
            else:
                return {
                    "success": False,
                    "message": f"Servicio '{service_type}' no encontrado en el catálogo",
                    "available_services": list(cls.SERVICES_CATALOG.keys())
                }
            
        except Exception as e:
            logger.error(f" Error consultando catálogo: {e}")
            return {
                "success": False,
                "message": f"Error al consultar el catálogo: {str(e)}"
            }
    
    @classmethod
    def get_service_recommendations(cls, keywords: List[str]) -> Dict:
        """Recomienda servicios basados en palabras clave"""
        recommendations = []
        
        keyword_mapping = {
            "chatbot": ["inteligencia_artificial"],
            "ia": ["inteligencia_artificial"],
            "bot": ["inteligencia_artificial"],
            "app": ["desarrollo_software"],
            "web": ["desarrollo_software", "cloud_services"],
            "movil": ["desarrollo_software"],
            "base de datos": ["migracion_datos"],
            "oracle": ["migracion_datos"],
            "azure": ["cloud_services", "consultoria_ti"],
            "nube": ["cloud_services"],
            "migrar": ["migracion_datos", "cloud_services"],
            "soporte": ["soporte_mantenimiento"],
            "mantener": ["soporte_mantenimiento"]
        }
        
        for keyword in keywords:
            keyword_lower = keyword.lower()
            for key, services in keyword_mapping.items():
                if key in keyword_lower:
                    for service_id in services:
                        if service_id not in recommendations:
                            recommendations.append(service_id)
        
        return recommendations