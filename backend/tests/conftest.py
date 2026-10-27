import os

import pytest

_url = os.environ.get("TEST_DATABASE_URL")
if not _url:
    pytest.exit("Cần TEST_DATABASE_URL, chạy: docker compose up -d postgres")
os.environ["DATABASE_URL"] = _url


@pytest.fixture(autouse=True)
def clean_tasks():
    from app import db

    with db.pool().connection() as conn:
        conn.execute("TRUNCATE tasks RESTART IDENTITY")
        conn.execute("TRUNCATE approval_requests, approval_flow_steps RESTART IDENTITY CASCADE")
