from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.postgresql.database import get_session
from app.postgresql.schema.pengiriman import Pengiriman

router = APIRouter(prefix="/pengiriman", tags=["pengiriman"])

@router.post("/", response_model=Pengiriman)
def create_pengiriman(pengiriman: Pengiriman, session: Session = Depends(get_session)):
    session.add(pengiriman)
    session.commit()
    session.refresh(pengiriman)
    return pengiriman


@router.get("/", response_model=List[Pengiriman])
def list_pengiriman(session: Session = Depends(get_session)):
    return session.exec(select(Pengiriman)).all()


@router.get("/{pengiriman_id}", response_model=Pengiriman)
def get_pengiriman(pengiriman_id: int, session: Session = Depends(get_session)):
    pengiriman = session.get(Pengiriman, pengiriman_id)
    if not pengiriman:
        raise HTTPException(status_code=404, detail="Pengiriman tidak ditemukan")
    return pengiriman


@router.put("/{pengiriman_id}", response_model=Pengiriman)
def update_pengiriman(pengiriman_id: int, data: Pengiriman, session: Session = Depends(get_session)):
    pengiriman = session.get(Pengiriman, pengiriman_id)
    if not pengiriman:
        raise HTTPException(status_code=404, detail="Pengiriman tidak ditemukan")

    update_data = data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in update_data.items():
        setattr(pengiriman, key, value)

    session.add(pengiriman)
    session.commit()
    session.refresh(pengiriman)
    return pengiriman


@router.delete("/{pengiriman_id}")
def delete_pengiriman(pengiriman_id: int, session: Session = Depends(get_session)):
    pengiriman = session.get(Pengiriman, pengiriman_id)
    if not pengiriman:
        raise HTTPException(status_code=404, detail="Pengiriman tidak ditemukan")
    session.delete(pengiriman)
    session.commit()