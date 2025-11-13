import asyncio
import sys
import os
import logging

# Configurar logging PRIMERO
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s: %(message)s'
)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.services.azure_openai_service import AzureOpenAIService

async def test():
    service = AzureOpenAIService()
    
    message = "¿Cuál es el horario de Walmart?"
    print(f"\n Probando: {message}\n")
    print("="*60)
    
    response = await service.generate_response(message, conversation_history=[])
    
    print("="*60)
    print(f"\n RESPUESTA FINAL DEL BOT:\n{response}\n")

if __name__ == "__main__":
    asyncio.run(test())