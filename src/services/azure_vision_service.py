import os
import aiohttp
from dotenv import load_dotenv
import logging
from .keyvault_service import KeyVaultService

load_dotenv()
logger = logging.getLogger(__name__)

class AzureVisionService:
    def __init__(self):
        kv = KeyVaultService()
        self.endpoint = kv.get_secret('AzureAIEndpoint')
        self.key = kv.get_secret('AzureAIKey')
        self.analyze_url = f"{self.endpoint}/vision/v3.2/analyze"
        self.ocr_url = f"{self.endpoint}/vision/v3.2/ocr"
    
    async def analyze_image_from_bytes(self, image_bytes: bytes):
        """Analizar imagen desde bytes"""
        
        headers = {
            'Ocp-Apim-Subscription-Key': self.key,
            'Content-Type': 'application/octet-stream'
        }
        
        params = {
            'visualFeatures': 'Description,Tags,Objects,Faces',
            'language': 'es'
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.analyze_url, 
                    headers=headers, 
                    params=params, 
                    data=image_bytes
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        return self._parse_analysis(result)
                    else:
                        error_text = await response.text()
                        logger.error(f"Error analyzing image: {error_text}")
                        return None
        
        except Exception as e:
            logger.error(f"Error in analyze_image_from_bytes: {e}")
            return None
    
    async def extract_text_from_bytes(self, image_bytes: bytes):
        """Extraer texto de imagen desde bytes (OCR)"""
        
        headers = {
            'Ocp-Apim-Subscription-Key': self.key,
            'Content-Type': 'application/octet-stream'
        }
        
        params = {
            'language': 'es',
            'detectOrientation': 'true'
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.ocr_url, 
                    headers=headers, 
                    params=params, 
                    data=image_bytes
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        return self._parse_ocr(result)
                    else:
                        logger.error(f"Error in OCR: {response.status}")
                        return None
        
        except Exception as e:
            logger.error(f"Error in extract_text_from_bytes: {e}")
            return None
    
    async def analyze_image(self, image_url):
        """Analizar imagen desde URL (método antiguo - mantener por compatibilidad)"""
        
        headers = {
            'Ocp-Apim-Subscription-Key': self.key,
            'Content-Type': 'application/json'
        }
        
        params = {
            'visualFeatures': 'Description,Tags,Objects,Faces',
            'language': 'es'
        }
        
        body = {
            'url': image_url
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.analyze_url, 
                    headers=headers, 
                    params=params, 
                    json=body
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        return self._parse_analysis(result)
                    else:
                        error_text = await response.text()
                        logger.error(f"Error analyzing image: {error_text}")
                        return None
        
        except Exception as e:
            logger.error(f"Error in analyze_image: {e}")
            return None
    
    async def extract_text_from_image(self, image_url):
        """Extraer texto de imagen desde URL (método antiguo - mantener por compatibilidad)"""
        
        headers = {
            'Ocp-Apim-Subscription-Key': self.key,
            'Content-Type': 'application/json'
        }
        
        params = {
            'language': 'es',
            'detectOrientation': 'true'
        }
        
        body = {
            'url': image_url
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.ocr_url, 
                    headers=headers, 
                    params=params, 
                    json=body
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        return self._parse_ocr(result)
                    else:
                        logger.error(f"Error in OCR: {response.status}")
                        return None
        
        except Exception as e:
            logger.error(f"Error in extract_text: {e}")
            return None
    
    def _parse_analysis(self, result):
        """Parsear resultado del análisis de imagen"""
        
        analysis = {
            'description': '',
            'tags': [],
            'objects': [],
            'has_faces': False,
            'face_count': 0
        }
        
        # Descripción
        if 'description' in result and 'captions' in result['description']:
            captions = result['description']['captions']
            if captions:
                analysis['description'] = captions[0]['text']
        
        # Tags
        if 'tags' in result:
            analysis['tags'] = [tag['name'] for tag in result['tags'][:10]]
        
        # Objetos detectados
        if 'objects' in result:
            analysis['objects'] = [obj['object'] for obj in result['objects']]
        
        # Caras
        if 'faces' in result:
            analysis['has_faces'] = len(result['faces']) > 0
            analysis['face_count'] = len(result['faces'])
        
        return analysis
    
    def _parse_ocr(self, result):
        """Parsear resultado de OCR"""
        
        text_lines = []
        
        if 'regions' in result:
            for region in result['regions']:
                for line in region['lines']:
                    words = [word['text'] for word in line['words']]
                    text_lines.append(' '.join(words))
        
        return '\n'.join(text_lines) if text_lines else None
    
    def create_image_summary(self, analysis, ocr_text):
        """Crear resumen combinado de análisis + OCR"""
        
        summary = []
        
        if analysis:
            if analysis['description']:
                summary.append(f"Descripción: {analysis['description']}")
            
            if analysis['objects']:
                objects_str = ', '.join(analysis['objects'][:5])
                summary.append(f"Objetos detectados: {objects_str}")
            
            if analysis['has_faces']:
                summary.append(f"Se detectaron {analysis['face_count']} persona(s)")
        
        if ocr_text:
            summary.append(f"\nTexto en la imagen:\n{ocr_text}")
        
        return '\n'.join(summary) if summary else "No se pudo analizar la imagen"