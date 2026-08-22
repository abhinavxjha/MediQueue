from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://root:password@127.0.0.1:3306/querly"
    SECRET_KEY: str = "change-this-development-secret"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    CORS_ORIGINS: str = "http://127.0.0.1:5500,http://localhost:5500"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
