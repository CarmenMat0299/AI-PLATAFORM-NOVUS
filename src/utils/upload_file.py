from src.services.azure_search_service import AzureSearchService
import PyPDF2
from docx import Document
import os
import hashlib

class DocumentUploader:
    def __init__(self):
        self.search_service = AzureSearchService()
    
    def extract_text_from_pdf(self, file_path):
        """Extraer texto de PDF"""
        text = ""
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text()
        return text
    
    def extract_text_from_docx(self, file_path):
        """Extraer texto de Word"""
        doc = Document(file_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    
    def extract_text_from_txt(self, file_path):
        """Extraer texto de archivo TXT"""
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    
    def upload_file(self, file_path, category="general"):
        """Subir archivo al índice"""
        
        if not os.path.exists(file_path):
            print(f"Archivo no encontrado: {file_path}")
            return False
        
        file_name = os.path.basename(file_path)
        title = os.path.splitext(file_name)[0]
        extension = os.path.splitext(file_path)[1].lower()
        
        try:
            if extension == '.pdf':
                content = self.extract_text_from_pdf(file_path)
            elif extension == '.docx':
                content = self.extract_text_from_docx(file_path)
            elif extension == '.txt':
                content = self.extract_text_from_txt(file_path)
            else:
                print(f"Tipo de archivo no soportado: {extension}")
                return False
            
            if not content or len(content.strip()) < 10:
                print(f"No se pudo extraer texto del archivo")
                return False
            
            doc_id = hashlib.md5(file_path.encode()).hexdigest()[:10]
            
            document = [{
                "id": doc_id,
                "title": title,
                "category": category,
                "content": content[:10000]
            }]
            
            result = self.search_service.upload_documents(document)
            
            if result:
                print(f" Archivo '{file_name}' subido exitosamente")
                print(f"   Título: {title}")
                print(f"   Categoría: {category}")
                print(f"   Caracteres: {len(content)}")
                return True
            else:
                print(f"Error subiendo archivo")
                return False
                
        except Exception as e:
            print(f"Error procesando archivo: {e}")
            return False

if __name__ == "__main__":
    uploader = DocumentUploader()
    
    # CAMBIA ESTA RUTA por donde está tu archivo
    uploader.upload_file(
        file_path="C:/Users/AnaLuciaMatarritaGra/Documents/Manual de configuración BUSINESS CENTRAL.docx",
        category="manuales"
    )