from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
import uuid
import json
from pathlib import Path

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "clave-super-secreta-cambiar-en-produccion-minimo-32-caracteres")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

# Users file path
USERS_FILE = Path("users.json")


class AuthService:
    def __init__(self):
        self._ensure_users_file()

    def _ensure_users_file(self):
        """Ensure users.json exists"""
        if not USERS_FILE.exists():
            USERS_FILE.write_text("[]")

    def _load_users(self) -> list:
        """Load users from JSON file"""
        try:
            with open(USERS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _save_users(self, users: list):
        """Save users to JSON file"""
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2, ensure_ascii=False, default=str)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Generate password hash"""
        return pwd_context.hash(password)

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    def verify_token(self, token: str) -> Optional[dict]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            return None

    def authenticate_user(self, email: str, password: str) -> Optional[dict]:
        """Authenticate user with email and password"""
        users = self._load_users()

        for user in users:
            if user["email"] == email:
                if not user.get("is_active", True):
                    return None

                if self.verify_password(password, user["hashed_password"]):
                    # Update last login
                    user["last_login"] = datetime.utcnow().isoformat()
                    self._save_users(users)

                    # Return user without password
                    user_data = user.copy()
                    user_data.pop("hashed_password", None)
                    user_data.pop("password_reset_token", None)
                    user_data.pop("password_reset_expires", None)
                    return user_data

        return None

    def create_password_reset_token(self, email: str) -> Optional[str]:
        """Create a password reset token for user"""
        users = self._load_users()

        for user in users:
            if user["email"] == email:
                # Generate reset token
                reset_token = str(uuid.uuid4())
                user["password_reset_token"] = reset_token
                user["password_reset_expires"] = (datetime.utcnow() + timedelta(hours=1)).isoformat()

                self._save_users(users)
                return reset_token

        return None

    def reset_password(self, token: str, new_password: str) -> bool:
        """Reset password using reset token"""
        users = self._load_users()

        for user in users:
            if user.get("password_reset_token") == token:
                # Check if token is expired
                expires = datetime.fromisoformat(user["password_reset_expires"])
                if datetime.utcnow() > expires:
                    return False

                # Update password and clear reset token
                user["hashed_password"] = self.get_password_hash(new_password)
                user["password_reset_token"] = None
                user["password_reset_expires"] = None

                self._save_users(users)
                return True

        return False

    def change_password(self, email: str, current_password: str, new_password: str) -> bool:
        """Change user password"""
        users = self._load_users()

        for user in users:
            if user["email"] == email:
                if self.verify_password(current_password, user["hashed_password"]):
                    user["hashed_password"] = self.get_password_hash(new_password)
                    self._save_users(users)
                    return True
                return False

        return False

    def create_initial_admin(self):
        """Create initial admin user if no users exist"""
        users = self._load_users()

        if not users:
            admin = {
                "id": str(uuid.uuid4()),
                "email": "admin@novus.com",
                "full_name": "Administrador",
                "hashed_password": self.get_password_hash("admin123"),
                "role": "admin",
                "is_active": True,
                "created_at": datetime.utcnow().isoformat(),
                "last_login": None,
                "password_reset_token": None,
                "password_reset_expires": None
            }

            users.append(admin)
            self._save_users(users)
            print("[+] Created initial admin user: admin@novus.com / admin123")
