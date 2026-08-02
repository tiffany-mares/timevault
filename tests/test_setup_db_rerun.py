import os
import sys

import pytest

# setup_db.py lives at the repo root, one level up from tests/.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import setup_db  # noqa: E402

# A disposable database name. MUST differ from the live DB so this test can
# never touch real data.
TEST_DB = "ww1_db_rerun_test"

EXPECTED_TABLES = {
    "ww1_enlistment",
    "ww1_court_martial",
    "app_user",
    "user_reports",
    "api_request_log",
    "joined_courtmartialled_soldiers",
}


def _conn_args():
    """psycopg2 args from .env, pointed at the 'postgres' maintenance DB
    (create_database connects there, then issues CREATE DATABASE)."""
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
    pw = os.getenv("DB_PASSWORD", "")
    if not pw:
        pytest.skip("No DB_PASSWORD in .env - skipping live-DB re-runnability test")
    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "user": os.getenv("DB_USER", "postgres"),
        "password": pw,
        "dbname": "postgres",
    }


def _can_connect(conn_args):
    import psycopg2

    try:
        psycopg2.connect(**conn_args).close()
        return True
    except Exception:
        return False


def _drop_test_db(conn_args):
    """Drop the throwaway DB, terminating any lingering connections first."""
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

    conn = psycopg2.connect(**conn_args)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    cur.execute(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
        "WHERE datname = %s AND pid <> pg_backend_pid()",
        (TEST_DB,),
    )
    cur.execute(f"DROP DATABASE IF EXISTS {TEST_DB}")
    cur.close()
    conn.close()


def _table_names(conn_args):
    import psycopg2

    conn = psycopg2.connect(**{**conn_args, "dbname": TEST_DB})
    cur = conn.cursor()
    cur.execute(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    )
    names = {r[0] for r in cur.fetchall()}
    cur.close()
    conn.close()
    return names


def test_setup_db_reruns_cleanly(monkeypatch):
    conn_args = _conn_args()
    if not _can_connect(conn_args):
        pytest.skip("PostgreSQL not reachable - skipping live-DB re-runnability test")

    # Point the REAL setup_db functions at a throwaway database, never ww1_db.
    monkeypatch.setattr(setup_db, "DB_NAME", TEST_DB)
    assert setup_db.DB_NAME != "ww1_db"  # defensive guard against touching live data

    import psycopg2

    _drop_test_db(conn_args)  # clean slate even if a previous run aborted
    try:
        # ---- Run 1: fresh setup ----
        setup_db.create_database(conn_args)   # creates TEST_DB
        setup_db.drop_tables(conn_args)       # no-op on the empty DB
        setup_db.run_schema(conn_args)        # creates all 6 tables + the FK
        assert _table_names(conn_args) == EXPECTED_TABLES

        # Populate the FK so the second drop must handle a referenced parent
        # (app_user) that has a live child row (user_reports).
        conn = psycopg2.connect(**{**conn_args, "dbname": TEST_DB})
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO app_user (username, password_hash, role) "
            "VALUES ('rerun_admin', 'x', 'admin') RETURNING id"
        )
        uid = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO user_reports (user_id, name, type) VALUES (%s, 'r', 't')",
            (uid,),
        )
        cur.close()
        conn.close()

        # ---- Run 2: the regression check ----
        # Exactly what a second `python setup_db.py` does. With the wrong drop
        # order (app_user before user_reports) this raises
        # psycopg2.errors.DependentObjectsStillExist.
        setup_db.drop_tables(conn_args)
        setup_db.run_schema(conn_args)
        assert _table_names(conn_args) == EXPECTED_TABLES

        # ---- Run 3: drop once more; teardown must be idempotent ----
        setup_db.drop_tables(conn_args)
        assert _table_names(conn_args) == set()
    finally:
        _drop_test_db(conn_args)
