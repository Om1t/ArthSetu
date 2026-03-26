import hashlib

def encrypt_user_pii(sensitive_data: str):
    """
    Simulates AES-256 Hashing for User Identity Protection.
    This ensures that PII (Personally Identifiable Information) 
    is never stored in plain text.
    """
    # SHA-256 generates a 256-bit (32-byte) signature
    hash_object = hashlib.sha256(sensitive_data.encode())
    return hash_object.hexdigest()