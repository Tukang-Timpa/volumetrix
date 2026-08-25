
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

# Schema Karoseri
class Karoseri(SQLModel, table=True):
    __tablename__ = "karoseri"

    id: Optional[int] = Field(default=None, primary_key=True)
    jenis_karoseri: str = Field(index=True)

    # Dimensi Karoseri
    panjang: float  # cm
    lebar: float    # cm
    tinggi: float   # cm

    # Other attributes
    bahan: Optional[str] = None
    warna: Optional[str] = None

    model_3d_template: Optional[str] = None  # path/reference ke model chasis generic

# Schema Armada
class Armada(SQLModel, table=True):
    __tablename__ = "armada"

    # Main attributes
    id: Optional[int] = Field(default=None, primary_key=True)
    nama_kendaraan: str = Field(index=True)
    jenis_armada: Optional[str] = None
    max_payload: float  # in kg

    karoseri_id: Optional[int] = Field(default=None, foreign_key="karoseri.id")

    konsumsi_bahan_bakar: Optional[float] = None  # in liters per km
    jenis_bbm: Optional[str] = None # solar | pertalite | other
    status: str = Field(default="tersedia")  # tersedia | dipakai | maintenance

    img: Optional[str] = None  # path/reference ke gambar kendaraan
    model_3d_template: Optional[str] = None  # path/reference ke model chasis generic
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)