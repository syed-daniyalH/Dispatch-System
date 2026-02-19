import argparse
import pathlib
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable

import psycopg
from sqlalchemy.engine import make_url

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import DATABASE_URL


@dataclass(frozen=True)
class Migration:
    filename: str
    seed: bool = False


MIGRATIONS: list[Migration] = [
    Migration("001_technician_module.sql"),
    Migration("002_admin_technician_profile.sql"),
    Migration("003_technician.sql", seed=True),
    Migration("004_dealerships.sql"),
    Migration("005_normalize_zone_names.sql"),
    Migration("006_technician_signup_requests.sql"),
]

# When adopting a manually-bootstrapped database that predates migration tracking,
# only mark the original technician baseline migrations as applied.
# Newer migrations (e.g. dealerships) must still execute.
BASELINE_CORE_MIGRATIONS: tuple[str, ...] = (
    "001_technician_module.sql",
    "002_admin_technician_profile.sql",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run SM2 backend SQL migrations")
    parser.add_argument(
        "--with-seed",
        action="store_true",
        help="also run development seed migrations (e.g. 003_technician.sql)",
    )
    return parser.parse_args()


def migration_dir() -> pathlib.Path:
    return pathlib.Path(__file__).resolve().parents[1] / "migrations"


def ensure_migration_table(cur) -> None:
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )


def load_applied_versions(cur) -> set[str]:
    cur.execute("SELECT version FROM schema_migrations")
    return {row[0] for row in cur.fetchall()}


def schema_is_already_bootstrapped(cur) -> bool:
    cur.execute(
        """
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema='public'
              AND table_name IN (
                'technicians',
                'zones',
                'skills',
                'technician_zones',
                'technician_skills',
                'technician_working_hours',
                'technician_time_off'
              )
            GROUP BY table_schema
            HAVING COUNT(*) = 7
        )
        """
    )
    return bool(cur.fetchone()[0])


def mark_versions_applied(cur, versions: Iterable[str]) -> None:
    now = datetime.now(timezone.utc)
    for version in versions:
        cur.execute(
            """
            INSERT INTO schema_migrations (version, applied_at)
            VALUES (%s, %s)
            ON CONFLICT (version) DO NOTHING
            """,
            (version, now),
        )


def run() -> None:
    args = parse_args()
    selected = [m for m in MIGRATIONS if args.with_seed or not m.seed]

    url = make_url(DATABASE_URL)
    conn = psycopg.connect(
        host=url.host or "localhost",
        port=url.port or 5432,
        user=url.username,
        password=url.password,
        dbname=url.database,
    )
    conn.autocommit = False

    try:
        with conn.cursor() as cur:
            ensure_migration_table(cur)
            applied = load_applied_versions(cur)

            if not applied and schema_is_already_bootstrapped(cur):
                # Adopt existing schema for teams that previously ran SQL manually.
                baseline = list(BASELINE_CORE_MIGRATIONS)
                mark_versions_applied(cur, baseline)
                conn.commit()
                applied = load_applied_versions(cur)
                print(f"Adopted existing schema and marked applied: {', '.join(baseline)}")

            for migration in selected:
                if migration.filename in applied:
                    print(f"SKIP {migration.filename} (already applied)")
                    continue

                path = migration_dir() / migration.filename
                if not path.exists():
                    raise FileNotFoundError(f"Missing migration file: {path}")

                sql = path.read_text(encoding="utf-8").lstrip("\ufeff")
                print(f"APPLY {migration.filename}")
                cur.execute(sql)
                cur.execute(
                    "INSERT INTO schema_migrations (version) VALUES (%s)",
                    (migration.filename,),
                )
                conn.commit()
                print(f"DONE  {migration.filename}")

    finally:
        conn.close()


if __name__ == "__main__":
    run()
