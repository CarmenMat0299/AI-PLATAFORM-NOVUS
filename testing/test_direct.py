import asyncio
import sys
import os

# Agregar path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Forzar reiniciar imports
if 'src.services.azure_openai_service' in sys.modules:
    del sys.modules['src.services.azure_openai_service']

from src.services.azure_openai_service import AzureOpenAIService
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

async def test():
    print("\n" + "="*60)
    print("TEST DIRECTO - Sin API, sin cache")
    print("="*60 + "\n")
    
    service = AzureOpenAIService()
    response = await service.generate_response("¿Cuál es el horario de Walmart?", [])
    
    print("\n" + "="*60)
    print("RESPUESTA FINAL:")
    print("="*60)
    print(response)
    print("\n")

if __name__ == "__main__":
    asyncio.run(test())