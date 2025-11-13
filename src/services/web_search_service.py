import aiohttp
from bs4 import BeautifulSoup
import urllib.parse
import logging

logger = logging.getLogger(__name__)

class WebSearchService:
    """Búsqueda web gratuita sin API keys"""
    
    async def search_web(self, query: str, num_results: int = 3):
        """Buscar en DuckDuckGo (no requiere API key)"""
        try:
            # URL encode la query
            encoded_query = urllib.parse.quote(query)
            url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            results = []
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        html = await response.text()
                        soup = BeautifulSoup(html, 'html.parser')
                        
                        # Buscar resultados
                        for result in soup.find_all('div', class_='result', limit=num_results):
                            title_elem = result.find('h2', class_='result__title')
                            snippet_elem = result.find('a', class_='result__snippet')
                            url_elem = result.find('a', class_='result__url')
                            
                            if title_elem and snippet_elem:
                                results.append({
                                    'title': title_elem.get_text(strip=True),
                                    'content': snippet_elem.get_text(strip=True),
                                    'url': url_elem.get('href') if url_elem else '',
                                    'source': 'web'
                                })
                        
                        logger.info(f"Encontrados {len(results)} resultados web")
                        return results
                    else:
                        logger.error(f"Error en búsqueda: {response.status}")
                        return []
                        
        except Exception as e:
            logger.error(f"Error buscando en web: {e}")
            return []

    async def search_news(self, query: str):
        """Buscar noticias recientes"""
        # Agregar "noticias" o "news" a la query para resultados más recientes
        return await self.search_web(f"{query} noticias 2024 2025", num_results=3)