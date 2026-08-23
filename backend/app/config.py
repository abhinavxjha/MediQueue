import os
from pydantic_settings import BaseSettings, SettingsConfigDict

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")

class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://root:arsh1234@127.0.0.1:3306/querly"
    SECRET_KEY: str = "change-this-development-secret"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    CORS_ORIGINS: str = "http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:8000,http://localhost:8000,http://127.0.0.1:3000,http://localhost:3000"
    model_config = SettingsConfigDict(env_file=[".env", "backend/.env", env_path], extra="ignore")

settings = Settings()
