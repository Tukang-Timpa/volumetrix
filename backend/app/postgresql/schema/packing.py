from datetime import datetime
from typing import Optional, Any, Dict, List
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON

# Schema for packing results
class HasilPacking(SQLModel, table=True):
    __tablename__ = "hasil_packing"

    # Primary key
    id: Optional[int] = Field(default=None, primary_key=True)
    pengiriman_id: int = Field(foreign_key="pengiriman.id")
    barang_id: int = Field(foreign_key="barang.id") 

    # Packing result fields
    posisi_x: float
    posisi_y: float
    posisi_z: float
    orientasi: int = Field(default=0)  # kode rotasi barang
    urutan_susun: Optional[int] = None

# TODO: Add more schemas for LLM based constraints

# TODO: Add more schemas for LLM based recommendations
