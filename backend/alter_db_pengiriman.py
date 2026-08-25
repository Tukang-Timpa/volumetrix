from app.postgresql.database import engine
from sqlalchemy import text

try:
    with engine.begin() as conn:
        conn.execute(text('ALTER TABLE pengiriman ADD COLUMN asal VARCHAR'))
        conn.execute(text('ALTER TABLE pengiriman ADD COLUMN tujuan VARCHAR'))
        conn.execute(text('ALTER TABLE pengiriman ADD COLUMN jarak_km FLOAT'))
    print("Success")
except Exception as e:
    print(e)
