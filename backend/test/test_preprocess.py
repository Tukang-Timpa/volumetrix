from app.postgresql.database import Session, engine
from app.postgresql.schema.pengiriman import Pengiriman, Barang
from sqlmodel import select
from app.py3dbp.sorting_engine import build_constraints, sort_packing
import traceback

def test_preprocess():
    with Session(engine) as session:
        pengiriman_id = 19
        daftar_barang = session.exec(
            select(Barang).where(Barang.pengiriman_id == pengiriman_id)
        ).all()
        
        print(f"Total barang in DB for pengiriman 19: {len(daftar_barang)}")
        
        expanded = []
        for b in daftar_barang:
            for _ in range(b.quantity):
                expanded.append(b)
        
        try:
            print("Building constraints...")
            constraints = build_constraints(expanded)
            print("Sorting...")
            sorted_pairs = sort_packing(expanded, constraints)
            print("Success")
        except Exception as e:
            print("Error:")
            traceback.print_exc()

if __name__ == "__main__":
    test_preprocess()
