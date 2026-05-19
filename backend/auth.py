import os

import jwt
from fastapi import Header, HTTPException, status

JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALGORITHM = "HS256"


def authenticate(authorization: str | None = Header(default=None)) -> dict:
    """FastAPI dependency: decode the ODIN EMS JWT and return the payload."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No token provided")
    token = authorization.split(" ", 1)[1].strip()
    if not JWT_SECRET:
        raise HTTPException(status_code=500, detail="JWT_SECRET not configured on server")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if "userId" not in payload:
        raise HTTPException(status_code=401, detail="Malformed token")
    return payload  # { userId, username, iat, exp }
