from azure.keyvault.secrets import SecretClient
from azure.identity import DefaultAzureCredential
import os

class KeyVaultService:
    def __init__(self):
        vault_url = "https://kv-novus-chatbot.vault.azure.net/"
        credential = DefaultAzureCredential()
        self.client = SecretClient(vault_url=vault_url, credential=credential)
    
    def get_secret(self, secret_name: str) -> str:
        """Obtener secreto del Key Vault"""
        try:
            secret = self.client.get_secret(secret_name)
            return secret.value
        except Exception as e:
            print(f"Error obteniendo secreto {secret_name}: {e}")
            return None