from src.services.azure_search_service import AzureSearchService

def upload_novus_documents():
    """Subir documentos de ejemplo sobre Novus"""
    
    search_service = AzureSearchService()
    
    # Crear el índice primero
    search_service.create_index()
    
    # Subir documentos
    result = search_service.upload_documents(documents)
    
    if result:
        print("Documentos subidos exitosamente")
        print(f"Total: {len(documents)} documentos")
    else:
        print("Error subiendo documentos")

if __name__ == "__main__":
    upload_novus_documents()