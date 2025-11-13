from src.utils.upload_file import DocumentUploader
import os

def upload_all_files_in_folder(folder_path, category="documentos"):
    """Subir todos los archivos de una carpeta"""
    
    if not os.path.exists(folder_path):
        print(f"Carpeta no encontrada: {folder_path}")
        return
    
    uploader = DocumentUploader()
    
    # Extensiones soportadas
    supported_extensions = ['.pdf', '.docx', '.txt']
    
    files_uploaded = 0
    files_failed = 0
    
    # Recorrer todos los archivos
    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)
        
        # Solo procesar archivos (no carpetas)
        if os.path.isfile(file_path):
            extension = os.path.splitext(filename)[1].lower()
            
            if extension in supported_extensions:
                print(f"\nProcesando: {filename}")
                success = uploader.upload_file(file_path, category)
                
                if success:
                    files_uploaded += 1
                else:
                    files_failed += 1
    
    print(f"\n{'='*50}")
    print(f"Archivos subidos: {files_uploaded}")
    print(f"Archivos fallidos: {files_failed}")
    print(f"{'='*50}")

if __name__ == "__main__":
    # Reemplaza con la ruta de tu carpeta
    upload_all_files_in_folder(
        folder_path="C:/Users/AnaLuciaMatarritaGra/Documents/documentos_novusManual de configuración BUSINESS CENTRAL",
        category="empresa"
    )