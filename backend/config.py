from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    database_url: str = "postgresql://appuser:apppassword@postgres:5432/appdb"
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()