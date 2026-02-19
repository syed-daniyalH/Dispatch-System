import os
from pathlib import Path


def _strip_optional_quotes(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        return value[1:-1]
    return value


def _load_dotenv_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        if line.startswith("export "):
            line = line[len("export "):].strip()

        if "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        if not key:
            continue

        os.environ.setdefault(key, _strip_optional_quotes(value.strip()))


def load_local_env() -> None:
    backend_root = Path(__file__).resolve().parents[2]
    _load_dotenv_file(backend_root / ".env")


load_local_env()


def get_env(name: str, default: str) -> str:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return value


def get_required_env(name: str) -> str:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_env_csv(name: str, default: str) -> list[str]:
    value = get_env(name, default)
    return [item.strip() for item in value.split(",") if item.strip()]


def normalize_database_url(value: str) -> str:
    normalized = value.strip()
    if normalized.startswith("postgresql://"):
        return normalized.replace("postgresql://", "postgresql+psycopg://", 1)
    return normalized


APP_ENV = get_env("APP_ENV", "development").strip().lower()

DATABASE_URL = (
    normalize_database_url(get_env("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sm_dispatch"))
    if APP_ENV == "development"
    else normalize_database_url(get_required_env("DATABASE_URL"))
)

JWT_SECRET_KEY = (
    get_env("JWT_SECRET_KEY", "change-me-dev-only")
    if APP_ENV == "development"
    else get_required_env("JWT_SECRET_KEY")
)
JWT_ALGORITHM = get_env("JWT_ALGORITHM", "HS256")
CORS_ALLOW_ORIGINS = get_env_csv(
    "CORS_ALLOW_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)

if APP_ENV != "development" and JWT_SECRET_KEY.startswith("change-me"):
    raise RuntimeError("JWT_SECRET_KEY must be set to a secure value outside development")
