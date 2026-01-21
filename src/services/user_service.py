import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from src.services.auth_service import AuthService

# Users file path
USERS_FILE = Path("users.json")


class UserService:
    def __init__(self):
        self.auth_service = AuthService()
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

    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Get user by ID"""
        users = self._load_users()
        for user in users:
            if user["id"] == user_id:
                # Return user without sensitive data
                user_data = user.copy()
                user_data.pop("hashed_password", None)
                user_data.pop("password_reset_token", None)
                user_data.pop("password_reset_expires", None)
                return user_data
        return None

    def get_user_by_email(self, email: str) -> Optional[dict]:
        """Get user by email"""
        users = self._load_users()
        for user in users:
            if user["email"] == email:
                # Return user without sensitive data
                user_data = user.copy()
                user_data.pop("hashed_password", None)
                user_data.pop("password_reset_token", None)
                user_data.pop("password_reset_expires", None)
                return user_data
        return None

    def get_all_users(self) -> List[dict]:
        """Get all users without passwords"""
        users = self._load_users()
        result = []
        for user in users:
            user_data = user.copy()
            user_data.pop("hashed_password", None)
            user_data.pop("password_reset_token", None)
            user_data.pop("password_reset_expires", None)
            result.append(user_data)
        return result

    def create_user(self, email: str, password: str, full_name: str, role: str = "user") -> dict:
        """Create a new user"""
        users = self._load_users()

        # Check if email already exists
        for user in users:
            if user["email"] == email:
                raise ValueError("Email already registered")

        # Create new user
        new_user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "full_name": full_name,
            "hashed_password": self.auth_service.get_password_hash(password),
            "role": role,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "last_login": None,
            "password_reset_token": None,
            "password_reset_expires": None
        }

        users.append(new_user)
        self._save_users(users)

        # Return user without sensitive data
        user_data = new_user.copy()
        user_data.pop("hashed_password", None)
        return user_data

    def update_user(self, user_id: str, update_data: dict) -> Optional[dict]:
        """Update user information"""
        users = self._load_users()

        for user in users:
            if user["id"] == user_id:
                # Update allowed fields
                if "email" in update_data:
                    # Check if new email is already in use
                    for u in users:
                        if u["id"] != user_id and u["email"] == update_data["email"]:
                            raise ValueError("Email already in use")
                    user["email"] = update_data["email"]

                if "full_name" in update_data:
                    user["full_name"] = update_data["full_name"]

                if "role" in update_data:
                    user["role"] = update_data["role"]

                if "is_active" in update_data:
                    user["is_active"] = update_data["is_active"]

                self._save_users(users)

                # Return updated user without sensitive data
                user_data = user.copy()
                user_data.pop("hashed_password", None)
                user_data.pop("password_reset_token", None)
                user_data.pop("password_reset_expires", None)
                return user_data

        return None

    def delete_user(self, user_id: str) -> bool:
        """Delete a user"""
        users = self._load_users()
        original_count = len(users)

        users = [user for user in users if user["id"] != user_id]

        if len(users) < original_count:
            self._save_users(users)
            return True

        return False

    def user_exists(self, email: str) -> bool:
        """Check if user exists by email"""
        users = self._load_users()
        return any(user["email"] == email for user in users)
