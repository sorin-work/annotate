from fastapi import APIRouter

from app.api.routes import auth, collections, documents, health, highlights, tags

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(documents.router)
api_router.include_router(highlights.router)
api_router.include_router(tags.router)
api_router.include_router(collections.router)
