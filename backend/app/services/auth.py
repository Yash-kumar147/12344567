"""
Authentication, Password Hashing and RBAC for CIT Campus Scheduling Platform.
Roles: Admin, Department Coordinator, Faculty, Club Representative.
"""

import os
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import HTTPException, Security, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db.mongo import db_manager

SECRET_KEY = os.getenv("SECRET_KEY", "cit-super-secret-scheduling-key-2025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> dict:
    token = None
    # Check Authorization header
    if credentials:
        token = credentials.credentials
    # Or check httpOnly cookie
    if not token and "access_token" in request.cookies:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired or invalid")

    users_col = db_manager.get_collection("users")
    user = await users_col.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def require_role(allowed_roles: List[str]):
    def role_checker(user: dict = Depends(get_current_user)) -> dict:
        role = user.get("role")
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {allowed_roles}, got '{role}'"
            )
        return user
    return role_checker

