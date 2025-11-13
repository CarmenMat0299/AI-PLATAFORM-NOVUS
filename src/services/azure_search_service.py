import os
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import *
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv
import logging
from .keyvault_service import KeyVaultService

load_dotenv()
logger = logging.getLogger(__name__)

class AzureSearchService:
    def __init__(self):
        try:
            kv = KeyVaultService()
            self.endpoint = kv.get_secret('AzureSearchEndpoint')
            self.key = kv.get_secret('AzureSearchKey')
            self.index_name = os.getenv('AZURE_SEARCH_INDEX_NAME', 'novus-knowledge-base')
            
            if not self.endpoint or not self.key:
                logger.warning("⚠️ Azure Search no configurado")
                self.enabled = False  # ← AGREGAR ESTO
                return
            
            logger.info("✅ Credenciales de Azure Search desde Key Vault")
            
            self.credential = AzureKeyCredential(self.key)
            
            self.index_client = SearchIndexClient(
                endpoint=self.endpoint,
                credential=self.credential
            )
            
            self.search_client = SearchClient(
                endpoint=self.endpoint,
                index_name=self.index_name,
                credential=self.credential
            )
            
            self.enabled = True  # ← AGREGAR ESTO
            
        except Exception as e:
            logger.error(f"❌ Error inicializando Azure Search: {e}")
            self.enabled = False  # ← AGREGAR ESTO
    
    def create_index(self):
        if not self.enabled:
            return False
            
        fields = [
            SimpleField(name="id", type=SearchFieldDataType.String, key=True),
            SearchableField(name="content", type=SearchFieldDataType.String, analyzer_name="es.microsoft"),
            SearchableField(name="title", type=SearchFieldDataType.String),
            SimpleField(name="category", type=SearchFieldDataType.String, filterable=True),
        ]
        index = SearchIndex(name=self.index_name, fields=fields)
        
        try:
            self.index_client.create_or_update_index(index)
            logger.info(f"Índice '{self.index_name}' creado")
            return True
        except Exception as e:
            logger.error(f"Error creando índice: {e}")
            return False
    
    def upload_documents(self, documents):
        if not self.enabled:
            return None
            
        try:
            result = self.search_client.upload_documents(documents=documents)
            logger.info(f"{len(documents)} documentos subidos")
            return result
        except Exception as e:
            logger.error(f"Error subiendo documentos: {e}")
            return None
    
    def search(self, query, top=3):
        if not self.enabled:
            logger.info("Azure Search deshabilitado - retornando lista vacía")
            return []
            
        try:
            results = self.search_client.search(
                search_text=query,
                top=top,
                select=["title", "content", "category"]
            )
            documents = []
            for result in results:
                documents.append({
                    'title': result.get('title', ''),
                    'content': result.get('content', ''),
                    'category': result.get('category', ''),
                    'score': result.get('@search.score', 0)
                })
            return documents
        except Exception as e:
            logger.error(f"Error en búsqueda: {e}")
            return []