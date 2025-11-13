import asyncio
import sys
import os

# Agregar el directorio raíz al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.services.web_search_service import WebSearchService

async def test():
    service = WebSearchService()
    
    print("Buscando: 'horario walmart costa rica'")
    results = await service.search_web("horario walmart costa rica", num_results=3)
    
    print(f"\n Resultados encontrados: {len(results)}\n")
    
    if len(results) == 0:
        print("NO SE ENCONTRARON RESULTADOS - El scraping está bloqueado")
    else:
        for i, result in enumerate(results, 1):
            print(f"[{i}] {result['title']}")
            print(f"    {result['content'][:150]}...")
            print(f"    URL: {result['url']}\n")

if __name__ == "__main__":
    asyncio.run(test())