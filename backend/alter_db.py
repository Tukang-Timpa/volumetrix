from app.postgresql.database import engine
from sqlalchemy import text

try:
    with engine.begin() as conn:
        conn.execute(text('ALTER TABLE barang ADD COLUMN bottom_face_index INTEGER'))
    print("Success")
except Exception as e:
    print(e)
