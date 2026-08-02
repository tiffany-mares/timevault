#!/usr/bin/env python3
"""
setup_db.py - Cross-platform database setup script for the WW1 Courts Martial project.
Works on Windows, macOS, and Linux.

Usage:
    python setup_db.py

Requirements:
    pip install -r requirements.txt
"""

import os
import sys
import shutil
import subprocess
import platform
from pathlib import Path

# Paths

SCRIPT_DIR = Path(__file__).parent.resolve()
SCHEMA_PATH = SCRIPT_DIR / "src" / "backend" / "database" / "database_schema.sql"
GENERATE_DATA_SCRIPT = SCRIPT_DIR / "src" / "backend" / "database" / "generate_real_data.py"
ENLISTMENT_SQL = SCRIPT_DIR / "src" / "backend" / "database" / "ww1_enlistment_data.sql"
COURT_MARTIAL_SQL = SCRIPT_DIR / "src" / "backend" / "database" / "ww1_courts_martial_data.sql"
GEN_JOINED_SCRIPT = SCRIPT_DIR / "src" / "backend" / "database" / "gen_joined_sql.py"
JOINED_SQL = SCRIPT_DIR / "src" / "backend" / "database" / "joined_courtmartialled_data.sql"
ENV_EXAMPLE = SCRIPT_DIR / ".env.example"
ENV_FILE = SCRIPT_DIR / ".env"

DB_NAME = "ww1_db"

# Helpers

def print_step(msg: str):
    print(f"\n{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}")

def print_ok(msg: str):
    print(f"  {msg}")

def print_err(msg: str):
    print(f"  {msg}", file=sys.stderr)

def get_python():
    """Return the correct python executable name for this platform."""
    return "python" if platform.system() == "Windows" else "python3"

def get_psql_connection_args(db: str = "postgres") -> dict:
    """
    Prompt the user for PostgreSQL connection details and return them as a dict
    suitable for psycopg2.connect().
    """

    print()
    print("  NOTE: If you haven't set a PostgreSQL password yet:")
    if platform.system() == "Windows":
        print("    Windows: The PostgreSQL installer should have prompted you to set a")
        print("    password during installation. If you skipped it, open 'SQL Shell (psql)'")
        print("    from the Start Menu, or run the following in a terminal (requires psql")
        print("    to be added to your PATH during installation):")
        print("      psql -U postgres -c \"ALTER USER postgres PASSWORD 'yourpassword';\"")
    else:
        print("    Linux/Mac: Run the following command to set a password:")
        print("      sudo -u postgres psql -c \"ALTER USER postgres PASSWORD 'yourpassword';\"")
        print("    Then re-run this script.")
    print()

    print("\nEnter your PostgreSQL connection details.")
    print("(Press Enter to accept the default shown in brackets)")

    host = input("  Host [localhost]: ").strip() or "localhost"
    port = input("  Port [5432]: ").strip() or "5432"
    user = input("  Username [postgres]: ").strip() or "postgres"
    password = input("  Password (leave blank if not set yet): ").strip()

    if not password:
        print()
        print("  No password entered. Please set a PostgreSQL password first:")
        if platform.system() == "Windows":
            print("    Open 'SQL Shell (psql)' from the Start Menu, or run (if psql is on PATH):")
            print("      psql -U postgres -c \"ALTER USER postgres PASSWORD 'yourpassword';\"")
        else:
            print("      sudo -u postgres psql -c \"ALTER USER postgres PASSWORD 'yourpassword';\"")
        print("  Then re-run this script.")
        print()
        sys.exit(0)

    return {
        "host": host,
        "port": int(port),
        "user": user,
        "password": password,
        "dbname": db,
    }

REQUIRED_PACKAGES = [
    ("psycopg2", "psycopg2-binary"),
    ("dotenv", "python-dotenv"),
    ("flask", "flask"),
    ("flask_cors", "flask-cors"),
    ("jwt", "PyJWT"),
    ("numpy", "numpy"),
    ("pandas", "pandas"),
    ("sklearn", "scikit-learn"),
]

def check_dependencies():
    """Make sure all required packages are installed."""
    print_step("Checking dependencies")
    missing = []

    for module_name, pip_name in REQUIRED_PACKAGES:
        try:
            __import__(module_name)
            print_ok(f"{pip_name} found")
        except ImportError:
            print_err(f"{pip_name} is not installed.")
            missing.append(pip_name)

    if missing:
        print("\n  Please install missing packages by running:")
        print(f"    pip install {' '.join(missing)}")
        print("  Or install all at once with:")
        print("    pip install -r requirements.txt\n")
        sys.exit(1)

def create_database(conn_args: dict):
    """Create the ww1_db database if it doesn't already exist."""
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

    print_step(f"Creating database '{DB_NAME}'")

    conn = psycopg2.connect(**conn_args)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()

    cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
    exists = cursor.fetchone()

    if exists:
        print_ok(f"Database '{DB_NAME}' already exists, skipping creation.")
    else:
        cursor.execute(f"CREATE DATABASE {DB_NAME}")
        print_ok(f"Database '{DB_NAME}' created.")

    cursor.close()
    conn.close()

def drop_tables(conn_args: dict):
    """Drop existing tables so the schema can be applied cleanly."""
    import psycopg2

    print_step("Dropping existing tables")

    db_conn_args = {**conn_args, "dbname": DB_NAME}
    conn = psycopg2.connect(**db_conn_args)
    conn.autocommit = True
    cursor = conn.cursor()

    # Drop joined table first since it depends on ww1_enlistment
    cursor.execute("DROP TABLE IF EXISTS joined_courtmartialled_soldiers;")
    print_ok("Dropped joined_courtmartialled_soldiers")
    cursor.execute("DROP TABLE IF EXISTS ww1_enlistment;")
    print_ok("Dropped ww1_enlistment")
    cursor.execute("DROP TABLE IF EXISTS ww1_court_martial;")
    print_ok("Dropped ww1_court_martial")
    cursor.execute("DROP TABLE IF EXISTS api_request_log;")
    print_ok("Dropped api_request_log")
    # user_reports references app_user, so it must be dropped before app_user
    cursor.execute("DROP TABLE IF EXISTS user_reports;")
    print_ok("Dropped user_reports")
    cursor.execute("DROP TABLE IF EXISTS app_user;")
    print_ok("Dropped app_user")

    cursor.close()
    conn.close()

def run_schema(conn_args: dict):
    """Run the schema SQL file to create the tables."""
    import psycopg2

    print_step("Running schema")

    if not SCHEMA_PATH.exists():
        print_err(f"Schema file not found: {SCHEMA_PATH}")
        sys.exit(1)

    db_conn_args = {**conn_args, "dbname": DB_NAME}
    conn = psycopg2.connect(**db_conn_args)
    conn.autocommit = True
    cursor = conn.cursor()

    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    cursor.execute(schema_sql)
    print_ok("Schema applied successfully.")

    cursor.close()
    conn.close()

def generate_data():
    """Run the generate_real_data.py script to produce the SQL files."""
    print_step("Generating data SQL files")

    if not GENERATE_DATA_SCRIPT.exists():
        print_err(f"Data generation script not found: {GENERATE_DATA_SCRIPT}")
        sys.exit(1)

    python = get_python()
    result = subprocess.run(
        [python, str(GENERATE_DATA_SCRIPT)],
        cwd=str(SCRIPT_DIR),
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print_err("Data generation failed:")
        print(result.stderr)
        sys.exit(1)

    print_ok("Data SQL files generated successfully.")

def load_sql_file(conn_args: dict, sql_path: Path, label: str):
    """Execute a SQL file against the ww1_db database."""
    import psycopg2

    if not sql_path.exists():
        print_err(f"SQL file not found: {sql_path}")
        sys.exit(1)

    db_conn_args = {**conn_args, "dbname": DB_NAME}
    conn = psycopg2.connect(**db_conn_args)
    conn.autocommit = True
    cursor = conn.cursor()

    with open(sql_path, "r", encoding="utf-8") as f:
        sql = f.read()

    cursor.execute(sql)
    print_ok(f"{label} loaded successfully.")

    cursor.close()
    conn.close()

def populate_database(conn_args: dict):
    """Load the enlistment and court martial data into the database."""
    print_step("Populating database")
    load_sql_file(conn_args, ENLISTMENT_SQL, "ww1_enlistment_data.sql")
    load_sql_file(conn_args, COURT_MARTIAL_SQL, "ww1_courts_martial_data.sql")

def populate_joined_table(conn_args: dict):
    """Populate joined_courtmartialled_soldiers after enlistment and court martial data is loaded."""
    import psycopg2

    print_step("Populating joined_courtmartialled_soldiers table")

    db_conn_args = {**conn_args, "dbname": DB_NAME}
    conn = psycopg2.connect(**db_conn_args)
    conn.autocommit = True
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO joined_courtmartialled_soldiers
        SELECT DISTINCT e.* FROM ww1_enlistment e
        JOIN ww1_court_martial c ON e.LName = c.LName
        AND (
            (c.Rank IN ('Lieutenant', 'Captain', 'Major', 'Colonel', 'General')
                AND e.FName = c.FName)
            OR e.Regiment_number = c.Regiment_number
        )
    """)

    cursor.close()
    conn.close()
    print_ok("joined_courtmartialled_soldiers populated successfully.")

def create_admin(conn_args: dict):
    """Create the default admin account if it does not already exist."""
    import psycopg2
    from werkzeug.security import generate_password_hash

    print_step("Creating admin account")

    db_conn_args = {**conn_args, "dbname": DB_NAME}
    conn = psycopg2.connect(**db_conn_args)
    conn.autocommit = True
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM app_user WHERE username = %s", ("TimeVaultAdmin",))
    if cursor.fetchone():
        print_ok("Admin account already exists, skipping.")
    else:
        password_hash = generate_password_hash("Grape!")
        cursor.execute(
            "INSERT INTO app_user (username, password_hash, role) VALUES (%s, %s, %s)",
            ("TimeVaultAdmin", password_hash, "admin")
        )
        print_ok("Admin account created (username: TimeVaultAdmin).")

    cursor.close()
    conn.close()

def setup_env(conn_args: dict):
    """Copy .env.example to .env and fill in the connection details."""
    print_step("Setting up .env file")

    if not ENV_EXAMPLE.exists():
        print_err(f".env.example not found at {ENV_EXAMPLE}")
        print("  Skipping .env setup - please create it manually.")
        return

    if ENV_FILE.exists():
        overwrite = input("  .env already exists. Overwrite? (y/N): ").strip().lower()
        if overwrite != "y":
            print_ok(".env left unchanged.")
            return

    shutil.copy(ENV_EXAMPLE, ENV_FILE)

    import re
    with open(ENV_FILE, "r", encoding="utf-8") as f:
        env_content = f.read()

    substitutions = {
        "DB_HOST": conn_args["host"],
        "DB_PORT": str(conn_args["port"]),
        "DB_USER": conn_args["user"],
        "DB_PASSWORD": conn_args["password"],
        "DB_NAME": DB_NAME,
        "JWT_SECRET": "ww1-timevault-jwt-secret-2026-g6",
    }

    for key, value in substitutions.items():
        env_content = re.sub(rf"^{key}=.*$", f"{key}={value}", env_content, flags=re.MULTILINE)

    with open(ENV_FILE, "w", encoding="utf-8") as f:
        f.write(env_content)

    print_ok(".env file created and filled in.")

def main():
    print("\nWW1 Courts Martial - Database Setup")
    print("=====================================")
    print(f"Platform: {platform.system()} {platform.release()}")

    check_dependencies()

    conn_args = get_psql_connection_args(db="postgres")

    try:
        create_database(conn_args)
        drop_tables(conn_args)
        run_schema(conn_args)
        generate_data()
        populate_database(conn_args)
        populate_joined_table(conn_args)
        create_admin(conn_args)
        setup_env(conn_args)
    except Exception as e:
        print_err(f"Setup failed: {e}")
        sys.exit(1)

    print("\n" + "="*60)
    print("  Setup complete!")
    print("  You can now start the backend with:")
    print("    python src/backend/route.py   (or python3 src/backend/route.py on Mac/Linux)")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
