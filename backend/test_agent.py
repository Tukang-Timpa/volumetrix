import sys
from sqlmodel import Session, select
from app.postgresql.database import get_session
from app.postgresql.schema.pengiriman import Pengiriman, Barang
from app.langgraph.agents.strategist_agent import run_strategist_with_progress

session = next(get_session())

# Provide mock data
barang_data = [
    {
        "id": 1,
        "pengiriman_id": 1,
        "nama_barang": "Mock Item 1",
        "kategori": None,
        "fragility_level": "normal",
        "berat": 10,
        "panjang": 10,
        "lebar": 10,
        "tinggi": 10,
        "quantity": 1,
        "bentuk_barang": None,
        "butuh_pendingin": False,
        "orientable": True,
        "bottom_axis": "tinggi",
    }
]

def on_progress(step, msg):
    print(f"PROGRESS: {step} - {msg}")

try:
    print("Running strategist...")
    result = run_strategist_with_progress(
        pengiriman_id=1,
        barang_data=barang_data,
        db_session=session,
        progress_callback=on_progress
    )
    print("SUCCESS!")
    print(result)
except Exception as e:
    import traceback
    traceback.print_exc()
