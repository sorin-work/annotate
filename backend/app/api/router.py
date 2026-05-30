from fastapi import APIRouter

from app.api.routes import (
    activity,
    auth,
    collections,
    documents,
    export,
    health,
    highlights,
    search,
    stats,
    tags,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(documents.router)
api_router.include_router(highlights.router)
api_router.include_router(tags.router)
api_router.include_router(collections.router)
api_router.include_router(search.router)
api_router.include_router(export.router)
api_router.include_router(stats.router)
api_router.include_router(activity.router)
