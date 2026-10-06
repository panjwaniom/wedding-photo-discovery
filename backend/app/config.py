from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    immich_url: str = "http://immich-server:2283"
    immich_api_key: str = ""
    immich_ml_url: str = "http://immich_machine_learning:3003"

    db_host: str = "immich_postgres"
    db_port: int = 5432
    db_name: str = "immich"
    db_user: str = "postgres"
    db_password: str = "postgres"

    face_match_threshold: float = 0.55
    min_detection_score: float = 0.3
    # Comma-separated person IDs (from Immich) who also see unassigned photos
    couple_person_ids: str = ""
    max_upload_mb: int = 10
    search_session_minutes: int = 30
    backend_port: int = 8000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
