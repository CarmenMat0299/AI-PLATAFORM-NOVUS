from src.services.azure_search_service import AzureSearchService

def delete_document(doc_id):
    search_service = AzureSearchService()
    
    try:
        result = search_service.search_client.delete_documents(
            documents=[{"id": doc_id}]
        )
        print(f"Documento {doc_id} eliminado")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    delete_document("PEGA_AQUI_EL_ID")