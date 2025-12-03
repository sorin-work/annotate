from fastapi import APIRouter

from app.api.routes import auth, documents, health, highlights

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(documents.router)
api_router.include_router(highlights.router)
