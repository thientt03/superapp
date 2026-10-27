import os
import threading
from pathlib import Path

import psycopg_pool
from psycopg.rows import dict_row

MIGRATIONS = Path(__file__).parent / "migrations"
_pool: psycopg_pool.ConnectionPool | None = None
_lock = threading.Lock()


def pool() -> psycopg_pool.ConnectionPool:
    global _pool
    with _lock:
        if _pool is None:
            url = os.environ.get("DATABASE_URL")
            if not url:
                raise RuntimeError("Thiếu biến môi trường DATABASE_URL")
            p = psycopg_pool.ConnectionPool(url, kwargs={"row_factory": dict_row}, open=True)
            try:
                with p.connection() as conn:
                    migrate(conn)
            except Exception:
                p.close()
                raise
            _pool = p
        return _pool


def migrate(conn) -> None:
    conn.execute("SELECT pg_advisory_xact_lock(727001)")
    conn.execute("CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY)")
    done = {r["version"] for r in conn.execute("SELECT version FROM schema_migrations")}
    for f in sorted(MIGRATIONS.glob("*.sql")):
        if f.name in done:
            continue
        with conn.transaction():
            conn.execute(f.read_text(encoding="utf-8"))
            conn.execute("INSERT INTO schema_migrations (version) VALUES (%s)", (f.name,))
