import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import get_settings
from app.errors import register_error_handlers
from app.middleware import REQUEST_ID_HEADER, RequestLogMiddleware
from app.ratelimit import SlidingWindowLimiter


def create_app() -> FastAPI:
    settings = get_settings()
    logging.basicConfig(level=settings.log_level.upper())

    app = FastAPI(
        title="annotate", version="0.2.0", docs_url="/api/docs", openapi_url="/api/openapi.json"
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition", REQUEST_ID_HEADER],
    )
    app.add_middleware(RequestLogMiddleware)
    # Per app instance, so every test client starts with clean counts.
    app.state.login_limiter = SlidingWindowLimiter(
        settings.login_attempts, settings.login_window_minutes * 60
    )
    app.state.register_limiter = SlidingWindowLimiter(settings.registrations_per_hour, 3600)
    register_error_handlers(app)
    app.include_router(api_router)
    return app


app = create_app()
