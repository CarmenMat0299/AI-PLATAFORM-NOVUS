import requests
import logging
from typing import Dict, List
from html import unescape
import re

logger = logging.getLogger(__name__)

class NovusWebsiteTool:
    """Herramienta para obtener información completa y detallada del sitio web de Novus usando WordPress REST API"""
    
    WORDPRESS_API_BASE = "https://www.novuscr.com/wp-json/wp/v2"
    
    @staticmethod
    def get_tool_definition() -> Dict:
        """Retorna la definición de la herramienta para Azure OpenAI"""
        return {
            "type": "function",
            "function": {
                "name": "get_novus_info",
                "description": """Obtiene información COMPLETA y ACTUALIZADA del sitio web oficial de Novus Soluciones. 
                
                USA ESTA HERRAMIENTA cuando el usuario pregunte sobre:
                - Servicios de Novus (desarrollo, consultoría, IA, cloud, etc.)
                - Productos o soluciones que ofrece Novus
                - Información de contacto (teléfono, email, dirección, horarios)
                - Información general de la empresa
                - Blog o noticias de Novus
                - Cualquier información sobre Novus Soluciones
                
                Esta herramienta obtiene la información directamente del sitio web, así que SIEMPRE está actualizada.""",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query_type": {
                            "type": "string",
                            "description": """Tipo de información a buscar:
                            - 'servicios': Servicios, productos, soluciones que ofrece Novus
                            - 'contacto': Información de contacto (email, teléfono, dirección, horarios)
                            - 'general': Información general de la empresa
                            - 'blog': Artículos y noticias del blog
                            - 'todo': Obtener toda la información disponible del sitio""",
                            "enum": ["servicios", "contacto", "general", "blog", "todo"]
                        },
                        "search_keywords": {
                            "type": "string",
                            "description": "Palabras clave opcionales para búsqueda específica (ej: 'inteligencia artificial', 'migración', 'chatbot')"
                        }
                    },
                    "required": ["query_type"]
                }
            }
        }
    
    @classmethod
    def execute(cls, arguments: Dict) -> Dict:
        """Ejecuta la consulta al WordPress REST API de Novus"""
        query_type = arguments.get("query_type", "general")
        search_keywords = arguments.get("search_keywords", "").lower()
        
        try:
            logger.info(f"🌐 Consultando WordPress API de Novus - Tipo: {query_type}, Keywords: {search_keywords or 'ninguna'}")
            
            # Obtener TODAS las páginas del sitio
            pages_url = f"{cls.WORDPRESS_API_BASE}/pages?per_page=100"
            
            headers = {
                'User-Agent': 'JulIA-Chatbot/2.0'
            }
            
            response = requests.get(pages_url, headers=headers, timeout=15)
            response.raise_for_status()
            
            pages_data = response.json()
            logger.info(f" {len(pages_data)} páginas obtenidas del sitio")
            
            # Extraer información relevante con MÁXIMO detalle
            pages_info = []
            
            for page in pages_data:
                # Limpiar título y contenido HTML
                title = cls._clean_html(page.get('title', {}).get('rendered', ''))
                content = cls._clean_html(page.get('content', {}).get('rendered', ''))
                excerpt = cls._clean_html(page.get('excerpt', {}).get('rendered', ''))
                link = page.get('link', '')
                slug = page.get('slug', '')
                
                # Determinar si es relevante según el query_type
                is_relevant = False
                relevance_score = 0
                
                if query_type == "todo":
                    # Obtener TODO el contenido del sitio
                    is_relevant = True
                    relevance_score = 5
                
                elif query_type == "servicios":
                    # Keywords para servicios
                    service_keywords = [
                        'servicio', 'producto', 'solución', 'soluciones',
                        'consultoría', 'desarrollo', 'software', 'aplicación',
                        'inteligencia artificial', 'ia', 'chatbot', 'bot',
                        'migración', 'datos', 'base de datos', 'oracle', 'sql',
                        'nube', 'cloud', 'azure', 'aws',
                        'web', 'móvil', 'mobile', 'app',
                        'soporte', 'mantenimiento', 'implementación',
                        'tecnología', 'digital', 'transformación',
                        'automatización', 'integración', 'api'
                    ]
                    
                    title_lower = title.lower()
                    content_lower = content.lower()
                    slug_lower = slug.lower()
                    
                    # Verificar en título (mayor peso)
                    for keyword in service_keywords:
                        if keyword in title_lower:
                            is_relevant = True
                            relevance_score += 3
                    
                    # Verificar en slug
                    for keyword in service_keywords:
                        if keyword in slug_lower:
                            is_relevant = True
                            relevance_score += 2
                    
                    # Verificar en contenido
                    for keyword in service_keywords:
                        if keyword in content_lower:
                            is_relevant = True
                            relevance_score += 1
                    
                    # Boost si tiene palabras clave específicas del usuario
                    if search_keywords:
                        if search_keywords in title_lower:
                            relevance_score += 5
                        elif search_keywords in content_lower:
                            relevance_score += 3
                
                elif query_type == "contacto":
                    title_lower = title.lower()
                    slug_lower = slug.lower()
                    content_lower = content.lower()
                    
                    contact_keywords = [
                        'contacto', 'contactenos', 'contáctenos', 'contáctanos',
                        'ubicación', 'ubicacion', 'dirección', 'direccion',
                        'donde estamos', 'donde encontrarnos', 'telefono', 'teléfono',
                        'email', 'correo', 'llamanos', 'llámanos',
                        'horario', 'atención', 'oficina'
                    ]
                    
                    # Verificar en título
                    if any(keyword in title_lower for keyword in contact_keywords):
                        is_relevant = True
                        relevance_score += 5
                    
                    # Verificar en slug
                    if any(keyword in slug_lower for keyword in contact_keywords):
                        is_relevant = True
                        relevance_score += 4
                    
                    # Verificar en contenido
                    if any(keyword in content_lower for keyword in contact_keywords):
                        # Verificar que tenga datos de contacto reales
                        if '@' in content or '+506' in content or 'email' in content_lower:
                            is_relevant = True
                            relevance_score += 3
                
                elif query_type == "blog":
                    # Los blogs están en posts, skip pages
                    continue
                
                else:  # general
                    # Para consultas generales, incluir páginas principales
                    main_pages = ['inicio', 'home', 'nosotros', 'sobre', 'about', 'quienes somos']
                    if any(page_name in slug.lower() for page_name in main_pages):
                        is_relevant = True
                        relevance_score = 5
                    elif any(page_name in title.lower() for page_name in main_pages):
                        is_relevant = True
                        relevance_score = 4
                
                # Si es relevante, agregar con MÁXIMO contenido
                if is_relevant and content:
                    # Para servicios, obtener TODO el contenido posible
                    content_limit = 5000 if query_type in ["servicios", "todo"] else 2000
                    
                    page_info = {
                        "titulo": title,
                        "contenido": content[:content_limit],  # Más contenido
                        "resumen": excerpt[:800] if excerpt else "",
                        "url": link,
                        "slug": slug,
                        "relevancia": relevance_score
                    }
                    
                    # Extraer información estructurada adicional
                    if query_type == "servicios":
                        page_info["caracteristicas"] = cls._extract_features(content)
                        page_info["tecnologias"] = cls._extract_technologies(content)
                    
                    pages_info.append(page_info)
            
            # Si se busca blog, consultar posts
            if query_type in ["blog", "todo"]:
                logger.info("📰 Obteniendo posts del blog...")
                posts_url = f"{cls.WORDPRESS_API_BASE}/posts?per_page=20"
                posts_response = requests.get(posts_url, headers=headers, timeout=15)
                
                if posts_response.status_code == 200:
                    posts_data = posts_response.json()
                    logger.info(f" {len(posts_data)} posts obtenidos")
                    
                    for post in posts_data:
                        title = cls._clean_html(post.get('title', {}).get('rendered', ''))
                        content = cls._clean_html(post.get('content', {}).get('rendered', ''))
                        excerpt = cls._clean_html(post.get('excerpt', {}).get('rendered', ''))
                        link = post.get('link', '')
                        date = post.get('date', '')
                        
                        post_info = {
                            "titulo": title,
                            "contenido": content[:2500],  # Posts completos
                            "resumen": excerpt[:500] if excerpt else "",
                            "url": link,
                            "fecha": date,
                            "tipo": "blog_post",
                            "relevancia": 3
                        }
                        pages_info.append(post_info)
            
            # Ordenar por relevancia
            pages_info.sort(key=lambda x: x.get('relevancia', 0), reverse=True)
            
            # Si no encontró páginas relevantes y busca contacto, hacer búsqueda profunda
            if not pages_info and query_type == "contacto":
                logger.info(" Búsqueda profunda de información de contacto...")
                pages_info = cls._deep_search_contact_info(pages_data)
            
            if not pages_info:
                return {
                    "success": False,
                    "message": f"No se encontró información de tipo '{query_type}' en el sitio de Novus",
                    "pages": [],
                    "sugerencia": "Intenta con un tipo diferente de búsqueda o usa 'todo' para obtener toda la información"
                }
            
            logger.info(f" {len(pages_info)} páginas relevantes encontradas (ordenadas por relevancia)")
            
            return {
                "success": True,
                "message": f"Se encontró información completa de Novus ({len(pages_info)} páginas)",
                "pages": pages_info,
                "total": len(pages_info),
                "fuente": "novuscr.com (WordPress REST API)",
                "query_type": query_type,
                "nota": "Información extraída directamente del sitio web oficial"
            }
            
        except requests.RequestException as e:
            logger.error(f" Error en request: {e}")
            return {
                "success": False,
                "message": f"Error al conectar con el sitio de Novus: {str(e)}",
                "pages": []
            }
        except Exception as e:
            logger.error(f" Error procesando datos: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Error procesando información: {str(e)}",
                "pages": []
            }
    
    @classmethod
    def _deep_search_contact_info(cls, pages_data: List[Dict]) -> List[Dict]:
        """Búsqueda profunda de información de contacto en todas las páginas"""
        pages_info = []
        
        for page in pages_data:
            content = cls._clean_html(page.get('content', {}).get('rendered', ''))
            
            # Buscar emails, teléfonos, direcciones en el contenido
            has_contact_info = False
            contact_types = []
            
            if '@' in content or 'email' in content.lower() or 'correo' in content.lower():
                has_contact_info = True
                contact_types.append("email")
            
            if 'teléfono' in content.lower() or 'telefono' in content.lower() or '+506' in content:
                has_contact_info = True
                contact_types.append("teléfono")
            
            if 'dirección' in content.lower() or 'direccion' in content.lower():
                has_contact_info = True
                contact_types.append("dirección")
            
            if 'horario' in content.lower():
                has_contact_info = True
                contact_types.append("horario")
            
            if has_contact_info:
                title = cls._clean_html(page.get('title', {}).get('rendered', ''))
                link = page.get('link', '')
                
                # Extraer fragmento con info de contacto
                contact_snippet = cls._extract_contact_info(content)
                
                if contact_snippet:
                    page_info = {
                        "titulo": f"{title} (Información de Contacto)",
                        "contenido": contact_snippet,
                        "resumen": f"Contiene: {', '.join(contact_types)}",
                        "url": link,
                        "relevancia": 5,
                        "tipos_contacto": contact_types
                    }
                    pages_info.append(page_info)
        
        if pages_info:
            logger.info(f" Encontrada info de contacto en {len(pages_info)} páginas")
        else:
            # Último intento: página principal
            logger.info(" Intentando obtener info de la página principal...")
            try:
                for page in pages_data:
                    slug = page.get('slug', '')
                    if slug in ['inicio', 'home', '']:
                        home_content = cls._clean_html(page.get('content', {}).get('rendered', ''))
                        contact_info = cls._extract_contact_info(home_content)
                        if contact_info:
                            pages_info.append({
                                "titulo": "Información de Contacto (Página Principal)",
                                "contenido": contact_info,
                                "resumen": "Información de contacto de Novus Soluciones",
                                "url": "https://www.novuscr.com",
                                "relevancia": 5
                            })
                            logger.info(" Info de contacto extraída de página principal")
                            break
            except Exception as e:
                logger.error(f"Error en búsqueda de página principal: {e}")
        
        return pages_info
    
    @staticmethod
    def _extract_features(text: str) -> List[str]:
        """Extrae características o beneficios mencionados en el texto"""
        features = []
        
        # Patrones comunes de características
        feature_indicators = [
            r'(?:características?|beneficios?|ventajas?)[:\s]+([^\.]+)',
            r'(?:incluye|ofrece|proporciona)[:\s]+([^\.]+)',
            r'(?:permite|facilita|ayuda a)[:\s]+([^\.]+)'
        ]
        
        for pattern in feature_indicators:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                feature = match.group(1).strip()
                if len(feature) > 10 and len(feature) < 200:
                    features.append(feature)
        
        # Buscar listas con viñetas o números
        list_patterns = [
            r'[\•\-\*]\s*([^\n]+)',
            r'\d+\.\s*([^\n]+)'
        ]
        
        for pattern in list_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                item = match.group(1).strip()
                if len(item) > 10 and len(item) < 200:
                    features.append(item)
        
        return features[:15]  # Top 15 características
    
    @staticmethod
    def _extract_technologies(text: str) -> List[str]:
        """Extrae tecnologías mencionadas en el texto"""
        technologies = []
        
        # Lista de tecnologías comunes
        tech_keywords = [
            'azure', 'aws', 'google cloud', 'oracle', 'sql server', 'mysql', 'postgresql',
            'python', 'java', 'javascript', 'typescript', 'c#', '.net', 'node.js', 'react', 'angular', 'vue',
            'docker', 'kubernetes', 'terraform',
            'openai', 'gpt', 'chatgpt', 'machine learning', 'deep learning', 'ia', 'inteligencia artificial',
            'api', 'rest', 'graphql', 'microservicios',
            'wordpress', 'shopify', 'salesforce', 'dynamics',
            'ios', 'android', 'flutter', 'react native',
            'databricks', 'power bi', 'tableau'
        ]
        
        text_lower = text.lower()
        
        for tech in tech_keywords:
            if tech.lower() in text_lower:
                # Verificar que no esté ya agregada
                if tech.title() not in technologies:
                    technologies.append(tech.title())
        
        return technologies[:20]  # Top 20 tecnologías
    
    @staticmethod
    def _clean_html(html_text: str) -> str:
        """Limpia tags HTML y decodifica entidades"""
        if not html_text:
            return ""
        
        # Decodificar entidades HTML
        text = unescape(html_text)
        
        # Preservar saltos de línea importantes
        text = text.replace('</p>', '\n\n')
        text = text.replace('<br>', '\n')
        text = text.replace('<br/>', '\n')
        text = text.replace('<br />', '\n')
        text = text.replace('</li>', '\n')
        
        # Remover tags HTML
        text = re.sub(r'<[^>]+>', ' ', text)
        
        # Remover múltiples espacios pero preservar saltos de línea
        text = re.sub(r' +', ' ', text)
        text = re.sub(r'\n\n+', '\n\n', text)
        
        # Remover espacios al inicio/final
        text = text.strip()
        
        return text
    
    @staticmethod
    def _extract_contact_info(text: str) -> str:
        """Extrae fragmentos del texto que contienen información de contacto"""
        if not text:
            return ""
        
        # Buscar patrones de contacto con más contexto
        contact_sections = []
        
        # Dividir en líneas para mejor análisis
        lines = text.split('\n')
        
        for i, line in enumerate(lines):
            line_lower = line.lower()
            
            # Verificar si la línea contiene info de contacto
            has_contact = False
            
            # Patterns de contacto
            if any(keyword in line_lower for keyword in [
                'teléfono', 'telefono', 'phone', 'tel:',
                'email', 'correo', '@',
                'dirección', 'direccion', 'address',
                'horario', 'atención', 'oficina',
                '+506', 'contacto', 'ubicación'
            ]):
                has_contact = True
            
            if has_contact:
                # Agregar contexto (línea anterior y siguiente)
                context_lines = []
                if i > 0:
                    context_lines.append(lines[i-1].strip())
                context_lines.append(line.strip())
                if i < len(lines) - 1:
                    context_lines.append(lines[i+1].strip())
                
                section = ' '.join([l for l in context_lines if l])
                if section and len(section) > 5:
                    contact_sections.append(section)
        
        # Remover duplicados manteniendo orden
        seen = set()
        unique_sections = []
        for section in contact_sections:
            if section not in seen:
                seen.add(section)
                unique_sections.append(section)
        
        result = '\n\n'.join(unique_sections[:20])  # Top 20 secciones de contacto
        
        return result if result else ""