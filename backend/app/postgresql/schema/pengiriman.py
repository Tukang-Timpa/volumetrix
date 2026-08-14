from datetime import datetime, date
from typing import Optional
from sqlmodel import SQLModel, Field

# Schema Pengiriman
class Pengiriman(SQLModel, table=True):
    __tablename__ = "pengiriman"

    # Identifier
    id: Optional[int] = Field(default=None, primary_key=True)
    parent_id: Optional[int] = Field(default=None, foreign_key="pengiriman.id")

    kode_pengiriman: str = Field(index=True, unique=True)
    armada_id: Optional[int] = Field(default=None, foreign_key="armada.id")

    tanggal_pengiriman: Optional[date] = None
    status: str = Field(default="draft")  # draft | diproses | sudah_disusun | terkirim

    total_berat: Optional[float] = None
    total_volume: Optional[float] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

# Schema Barang
class Barang(SQLModel, table=True):
    __tablename__ = "barang"

    id: Optional[int] = Field(default=None, primary_key=True)
    pengiriman_id: int = Field(foreign_key="pengiriman.id")

    # Attributes
    nama_barang: str
    bentuk_barang: Optional[str] = None  # e.g., kotak, silinder, bola, dll
    panjang: float  # cm
    lebar: float    # cm
    tinggi: float   # cm
    berat: float    # kg
    quantity: int = Field(default=1)

    kategori: Optional[str] = None
    fragility_level: int = Field(default=1)
    butuh_pendingin: bool = Field(default=False)
    orientable: bool = Field(default=False)