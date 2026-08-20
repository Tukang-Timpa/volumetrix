from app.postgresql.database import engine
from sqlalchemy import text

try:
    with engine.begin() as conn:
        conn.execute(text('ALTER TABLE armada ADD COLUMN jenis_bbm VARCHAR'))
    print("Success")
except Exception as e:
    print(e)
