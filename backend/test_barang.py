from typing import Optional
from sqlmodel import SQLModel, Field

class Pengiriman(SQLModel, table=True):
    __tablename__ = "pengiriman"
    id: Optional[int] = Field(default=None, primary_key=True)

class Barang(SQLModel, table=True):
    __tablename__ = "barang"
    id: Optional[int] = Field(default=None, primary_key=True)
    pengiriman_id: int = Field(foreign_key="pengiriman.id")
    nama_barang: str
    panjang: float
    lebar: float
    tinggi: float
    berat: float
    quantity: int = Field(default=1)

print("Instantiating without pengiriman_id...")
try:
    b = Barang(
        id=1, nama_barang="test", berat=10,
        panjang=10, lebar=10, tinggi=10
    )
    print("Success!")
except Exception as e:
    print(f"Error: {e}")
