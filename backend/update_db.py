from sqlmodel import Session, text
from app.postgresql.database import engine

def main():
    with Session(engine) as session:
        try:
            session.exec(text("ALTER TABLE barang ADD COLUMN bottom_axis VARCHAR;"))
            session.commit()
            print("Column added successfully.")
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    main()
