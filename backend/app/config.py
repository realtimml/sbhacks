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

    GMAIL_AUTH_CONFIG_ID: str
    NOTION_AUTH_CONFIG_ID: str
    SLACK_AUTH_CONFIG_ID: str
    USER_ID: str

    GOOGLE_GENERATIVE_AI_API_KEY: Optional[str] = None

    # Redis - Support both local and Upstash
    REDIS_URL: Optional[str] = None
    UPSTASH_REDIS_REST_URL: Optional[str] = None
    UPSTASH_REDIS_REST_TOKEN: Optional[str] = None

    # To link back to the frontend
    FRONTEND_URL: str = "http://localhost:5173"

    # Webhook signature 
    WEBHOOK_SECRET: Optional[str] = None

settings = Settings()