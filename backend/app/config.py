from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, read from the environment (or a local .env file)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://annotate:annotate@localhost:5433/annotate"
    jwt_secret: str = "local-development-secret-change-me-0123456789"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60 * 24 * 7

    # Comma separated list of origins allowed to call the API from a browser.
    cors_origins: str = "http://localhost:5173,http://localhost:5174"

    # Failed sign-ins allowed per email and client address, and sign-ups per
    # address, within the window. 0 turns the limit off.
    login_attempts: int = 10
    login_window_minutes: int = 15
    registrations_per_hour: int = 5

    max_upload_mb: int = 10
    log_level: str = "info"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
