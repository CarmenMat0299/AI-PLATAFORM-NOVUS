import re

FAQ_RESPONSES = {
    "servicios": """Novus Soluciones ofrece:
Desarrollo de software a medida
Consultoría tecnológica
Soluciones de inteligencia artificial
Integración de sistemas empresariales

¿Le interesa algún servicio en particular?""",
    
    "contacto": """Puede contactarnos por:
Email: info@novuscr.com
Teléfono: [agregar número]
Web: www.novuscr.com

¿Prefiere que un agente le contacte?""",
    
    "ubicacion": """Estamos ubicados en Costa Rica.
Para reuniones presenciales, contáctenos para coordinar.

¿Necesita agendar una cita?""",
    
    "precio": """Los precios varían según el proyecto y sus necesidades específicas.

Para una cotización personalizada, un agente puede contactarle.
¿Desea que le llamemos?"""
}

def check_faq(message: str):
    """Verificar si el mensaje coincide con una FAQ"""
    message_lower = message.lower()
    
    keywords = {
        "horario": ["horario", "hora", "atienden", "abierto", "cerrado"],
        "servicios": ["servicios", "ofrecen", "hacen", "productos"],
        "contacto": ["contacto", "teléfono", "telefono", "email", "correo", "llamar"],
        "ubicacion": ["ubicación", "ubicacion", "dirección", "direccion", "donde", "oficina"],
        "precio": ["precio", "costo", "cuanto", "cuánto", "cotización", "cotizacion", "tarifa"]
    }
    
    for category, words in keywords.items():
        if any(word in message_lower for word in words):
            return FAQ_RESPONSES.get(category)
    
    return None