import sqlite3
from pathlib import Path


# Location of the database folder
DATABASE_DIR = Path(__file__).parent

# SQLite database file
DATABASE_PATH = DATABASE_DIR / "eternal.db"

# SQL schema file
SCHEMA_PATH = DATABASE_DIR / "schema.sql"


def get_connection():
    """
    Create and return a connection to the ETERNAL SQLite database.
    """

    connection = sqlite3.connect(DATABASE_PATH)

    # Allows SQLite to return rows like dictionaries
    connection.row_factory = sqlite3.Row

    # Enable foreign key relationships
    connection.execute("PRAGMA foreign_keys = ON")

    return connection


def initialize_database():
    """
    Create the ETERNAL database and all required tables.
    """

    if not SCHEMA_PATH.exists():
        raise FileNotFoundError(
            f"Schema file not found: {SCHEMA_PATH}"
        )

    schema = SCHEMA_PATH.read_text(encoding="utf-8")

    with get_connection() as connection:
        connection.executescript(schema)

    print("ETERNAL database initialized successfully.")


if __name__ == "__main__":
    initialize_database()