from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    DATABASE_URL: str
    MAIL_FROM: str = "ainas08786@gmail.com"
    MAIL_FROM_NAME: str = "Jennifer Sam"

    RESEND_API_KEY: str = ""

    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()
