from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.postgresql.database import get_session
from app.postgresql.schema.armada import Karoseri

router = APIRouter(prefix="/karoseri", tags=["karoseri"])


@router.post("/", response_model=Karoseri)
def create_karoseri(karoseri: Karoseri, session: Session = Depends(get_session)):
    session.add(karoseri)
    session.commit()
    session.refresh(karoseri)
    return karoseri


@router.get("/", response_model=List[Karoseri])
def list_karoseri(session: Session = Depends(get_session)):
    return session.exec(select(Karoseri)).all()


@router.get("/{karoseri_id}", response_model=Karoseri)
def get_karoseri(karoseri_id: int, session: Session = Depends(get_session)):
    karoseri = session.get(Karoseri, karoseri_id)
    if not karoseri:
        raise HTTPException(status_code=404, detail="Karoseri tidak ditemukan")
    return karoseri


@router.put("/{karoseri_id}", response_model=Karoseri)
def update_karoseri(karoseri_id: int, data: Karoseri, session: Session = Depends(get_session)):
    karoseri = session.get(Karoseri, karoseri_id)
    if not karoseri:
        raise HTTPException(status_code=404, detail="Karoseri tidak ditemukan")

    update_data = data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in update_data.items():
        setattr(karoseri, key, value)

    session.add(karoseri)
    session.commit()
    session.refresh(karoseri)
    return karoseri


@router.delete("/{karoseri_id}")
def delete_karoseri(karoseri_id: int, session: Session = Depends(get_session)):
    karoseri = session.get(Karoseri, karoseri_id)
    if not karoseri:
        raise HTTPException(status_code=404, detail="Karoseri tidak ditemukan")
    session.delete(karoseri)
    session.commit()