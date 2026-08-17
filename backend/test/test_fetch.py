from app.postgresql.database import Session, engine
from app.postgresql.schema.pengiriman import Pengiriman
from sqlmodel import select

def test_fetch():
    with Session(engine) as session:
        try:
            res = session.exec(select(Pengiriman)).all()
            print(f"Fetched {len(res)} pengiriman")
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_fetch()
