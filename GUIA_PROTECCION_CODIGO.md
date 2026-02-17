# 🔒 Guía: Proteger TODO el Código de Julia

## 🎯 Objetivo

Ofuscar/encriptar **TODO el código Python** para que nadie pueda leerlo o copiarlo.

---

## ⚡ Método Rápido (Windows)

### **Paso 1: Proteger el código**

Doble click en:
```
proteger-y-desplegar.bat
```

Esto:
- ✅ Ofusca TODO el código de la carpeta `src/`
- ✅ Crea carpeta `src_protected/` con código encriptado
- ✅ Construye imagen Docker con código protegido

### **Paso 2: Desplegar a Azure**

Doble click en:
```
desplegar-a-azure.bat
```

Esto:
- ✅ Sube la imagen a Azure Container Registry
- ✅ Actualiza el Container App con código protegido

---

## 🔍 ¿Qué es la ofuscación?

**Código ORIGINAL** (legible):
```python
def create_user(email, password):
    """Crear un nuevo usuario"""
    user = {
        "email": email,
        "password": hash_password(password)
    }
    return user
```

**Código OFUSCADO** (ilegible):
```python
from pyarmor_runtime_000000 import __pyarmor__
__pyarmor__(__name__, __file__, b'\x50\x59...')
```

❌ **Imposible de entender**
❌ **No se puede copiar**
✅ **Funciona exactamente igual**

---

## 🛡️ Nivel de Protección

### **Qué protege:**
- ✅ **100% del código Python** está encriptado
- ✅ No se puede leer el código fuente
- ✅ No se pueden ver los algoritmos
- ✅ No se puede copiar la lógica de negocio
- ✅ Dificulta ingeniería inversa

### **Qué NO protege:**
- ⚠️ Archivos JSON (users.json, etc.) - están sin encriptar
- ⚠️ Variables de entorno
- ⚠️ Logs del sistema

---

## 📋 Proceso Manual (sin scripts .bat)

Si prefieres hacerlo paso a paso:

### **1. Instalar PyArmor**
```bash
cd C:\Users\AnaLuciaMatarritaGra\Documents\ai-platform-novus
venv\Scripts\activate
pip install pyarmor
```

### **2. Ofuscar el código**
```bash
# Limpiar ofuscación anterior
rmdir /s /q src_protected

# Ofuscar todo
pyarmor gen -O src_protected src/
```

### **3. Verificar que funcionó**
```bash
dir src_protected
```

Deberías ver:
- ✅ Todas las carpetas de `src/` (api, services, utils, etc.)
- ✅ Archivos `.py` pero con código encriptado
- ✅ Carpeta `pyarmor_runtime_000000/`

### **4. Construir imagen Docker**
```bash
docker build -f Dockerfile.protected -t acrnovus.azurecr.io/chatbot-novus:latest .
```

### **5. Login a Azure**
```bash
az login
az acr login --name acrnovus
```

### **6. Subir a Azure**
```bash
docker push acrnovus.azurecr.io/chatbot-novus:latest
```

### **7. Actualizar Container App**
```bash
az containerapp update \
  --name app-chatbot-novus \
  --resource-group novus-rg \
  --image acrnovus.azurecr.io/chatbot-novus:latest
```

---

## ✅ Verificar que el código está protegido

### **Opción 1: Inspeccionar localmente**

```bash
# Ver un archivo ofuscado
type src_protected\api\main.py
```

Deberías ver código ilegible como:
```
from pyarmor_runtime_000000 import __pyarmor__
__pyarmor__(__name__, __file__, b'\x50\x59...')
```

### **Opción 2: Verificar en el contenedor**

```bash
# Entrar al contenedor en Azure
az containerapp exec \
  --name app-chatbot-novus \
  --resource-group novus-rg \
  --command "/bin/bash"

# Dentro del contenedor:
cat src/api/main.py
```

El código debe estar ofuscado.

---

## 🔄 Actualizar código en el futuro

Cada vez que modifiques el código:

1. ✅ Modifica archivos en `src/` (código normal)
2. ✅ Ejecuta `proteger-y-desplegar.bat`
3. ✅ Ejecuta `desplegar-a-azure.bat`

**NUNCA** modifiques archivos en `src_protected/` directamente.

---

## 📝 Notas Importantes

### **Para la DEMO:**
- ✅ El código está 100% protegido
- ✅ Nadie puede ver la lógica de Julia
- ✅ Funciona exactamente igual que antes

### **Archivos que NO se ofuscan:**
- `users.json`, `conversations.json`, etc. - Son datos, no código
- Si quieres proteger datos sensibles, usa Azure Key Vault

### **Rendimiento:**
- La ofuscación añade un overhead mínimo (~1-2%)
- No afecta significativamente la velocidad

### **Licencia de PyArmor:**
- Gratis para proyectos pequeños/medianos
- Si vendés a empresa grande, verifica licencia

---

## 🆘 Problemas Comunes

### **Error: "pyarmor no encontrado"**
```bash
pip install pyarmor
```

### **Error: "No such file or directory: src_protected"**
```bash
# Ejecutar primero:
pyarmor gen -O src_protected src/
```

### **Error: Docker build falla**
```bash
# Verificar que src_protected existe:
dir src_protected

# Reconstruir:
docker build -f Dockerfile.protected -t acrnovus.azurecr.io/chatbot-novus:latest .
```

### **El código no funciona después de ofuscar**
- Verifica que todas las dependencias estén en requirements.txt
- PyArmor puede tener problemas con imports dinámicos

---

## 💡 Seguridad Adicional

### **1. Proteger secretos (API Keys, Passwords):**
```bash
# Usar Azure Key Vault para:
- AZURE_OPENAI_KEY
- WHATSAPP_TOKEN
- TEAMS_APP_PASSWORD
```

### **2. No incluir archivos sensibles en el contenedor:**
Agregar a `.dockerignore`:
```
.env
*.key
*.pem
secrets/
```

### **3. Limitar acceso al Container App:**
- Solo permitir acceso desde IPs específicas
- Usar Azure Private Endpoints

---

## 📊 Comparación

| Aspecto | Sin Protección | Con PyArmor |
|---------|---------------|-------------|
| Código visible | ✅ Sí | ❌ No |
| Se puede copiar | ✅ Sí | ❌ No |
| Funcionalidad | ✅ 100% | ✅ 100% |
| Velocidad | ✅ Normal | ⚠️ -1~2% |
| Costo | Gratis | Gratis |

---

## ✅ Listo para la Demo

Con el código ofuscado:
- ✅ Puedes mostrar Julia sin preocuparte
- ✅ El cliente no puede ver tu código
- ✅ Tu propiedad intelectual está protegida
- ✅ Funciona perfectamente

---

**¿Dudas? Ejecuta `proteger-y-desplegar.bat` y todo se hace automáticamente.** 🚀
