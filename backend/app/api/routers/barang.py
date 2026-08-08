from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.postgresql.database import get_session
from app.postgresql.schema.pengiriman import Barang

router = APIRouter(prefix="/barang", tags=["barang"])


@router.post("/", response_model=Barang)
def create_barang(barang: Barang, session: Session = Depends(get_session)):
    session.add(barang)
    session.commit()
    session.refresh(barang)
    return barang


@router.get("/", response_model=List[Barang])
def list_barang(session: Session = Depends(get_session)):
    return session.exec(select(Barang)).all()


@router.get("/{barang_id}", response_model=Barang)
def get_barang(barang_id: int, session: Session = Depends(get_session)):
    barang = session.get(Barang, barang_id)
    if not barang:
        raise HTTPException(status_code=404, detail="Barang tidak ditemukan")
    return barang


@router.put("/{barang_id}", response_model=Barang)
def update_barang(barang_id: int, data: Barang, session: Session = Depends(get_session)):
    barang = session.get(Barang, barang_id)
    if not barang:
        raise HTTPException(status_code=404, detail="Barang tidak ditemukan")

    update_data = data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in update_data.items():
        setattr(barang, key, value)

    session.add(barang)
    session.commit()
    session.refresh(barang)
    return barang


@router.delete("/{barang_id}")
def delete_barang(barang_id: int, session: Session = Depends(get_session)):
    barang = session.get(Barang, barang_id)
    if not barang:
        raise HTTPException(status_code=404, detail="Barang tidak ditemukan")
    session.delete(barang)
    session.commit()