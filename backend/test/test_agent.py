import os
import json
from app.postgresql.database import Session, engine
from app.postgresql.schema.pengiriman import Pengiriman, Barang
from app.langgraph.agents.strategist_agent import run_strategist_with_progress
from sqlmodel import select

def test_agent():
    with Session(engine) as session:
        pengiriman_id = 19
        daftar_barang = session.exec(
            select(Barang).where(Barang.pengiriman_id == pengiriman_id)
        ).all()
        
        barang_data = [
            {
                "id": b.id,
                "pengiriman_id": b.pengiriman_id,
                "nama_barang": b.nama_barang,
                "kategori": b.kategori,
                "fragility_level": b.fragility_level,
                "berat": b.berat,
                "panjang": b.panjang,
                "lebar": b.lebar,
                "tinggi": b.tinggi,
                "quantity": b.quantity,
                "bentuk_barang": b.bentuk_barang,
                "butuh_pendingin": b.butuh_pendingin,
                "orientable": b.orientable,
            }
            for b in daftar_barang
        ]
        
        def on_progress(step, msg):
            print(f"[{step}] {msg}")
            
        print("Running agent...")
        try:
            res = run_strategist_with_progress(
                pengiriman_id=pengiriman_id,
                barang_data=barang_data,
                db_session=session,
                progress_callback=on_progress
            )
            print("Done!")
            print(json.dumps(res, indent=2))
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_agent()
