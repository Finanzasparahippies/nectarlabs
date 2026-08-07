"""
Módulo de utilidades comunes y helpers compartidos para el backend de Nectar Labs.
"""
import re

def sanitize_sensitive_info(text: str) -> str:
    """
    Sanitiza cadenas redactando o enmascarando API Keys, tokens OAuth/JWT,
    contraseñas y client secrets para evitar fugas de información sensible en los logs.
    """
    if not text:
        return ""
    text_str = str(text)
    # Redact Bearer tokens / JWT
    text_str = re.sub(r'(Bearer\s+)[A-Za-z0-9\-\._~\+\/]+=*', r'\1[REDACTED_TOKEN]', text_str, flags=re.IGNORECASE)
    # Redact secret/key query params and credentials (key=, secret=, token=, api_key=, password=, client_secret=)
    text_str = re.sub(r'((?:key|secret|token|api_key|client_secret|password)=)[^&\s]+', r'\1[REDACTED]', text_str, flags=re.IGNORECASE)
    return text_str
