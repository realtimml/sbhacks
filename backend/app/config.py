from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    """Settings for the application"""
    model_config = SettingsConfigDict(
        env_file = ".env",
        env_file_encoding = "utf-8",
        case_sensitive = True,
        extra = "ignore"
    )

    COMPOSIO_API_KEY: str

    GOOGLE_GENERATIVE_AI_API_KEY: str

    # Redis - Support both local and Upstash
    REDIS_URL: Optional[str] = None
    UPSTASH_REDIS_REST_URL: Optional[str] = None
    UPSTASH_REDIS_REST_TOKEN: Optional[str] = None

    # To link back to the frontend
    FRONTEND_URL: str = "http://localhost:3000"

    # Webhook signature 
    WEBHOOK_SECRET: str

settings = Settings()