import os
from contextlib import contextmanager

import pymysql
from pymysql.cursors import DictCursor
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host":     os.getenv("DB_HOST", "localhost"),
    "port":     int(os.getenv("DB_PORT", "3306")),
    "user":     os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "odin_ems"),
    "charset":  "utf8mb4",
    "cursorclass": DictCursor,
    "autocommit": True,
}


@contextmanager
def get_conn():
    conn = pymysql.connect(**DB_CONFIG)
    try:
        # Match the Node side: store + read everything as Asia/Dhaka
        with conn.cursor() as cur:
            cur.execute("SET time_zone = '+06:00'")
        yield conn
    finally:
        conn.close()
