from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.postgresql.database import get_session
from app.postgresql.schema.armada import Armada

router = APIRouter(prefix="/armada", tags=["armada"])

@router.post("/", response_model=Armada)
def create_armada(armada: Armada, session: Session = Depends(get_session)):
    session.add(armada)
    session.commit()
    session.refresh(armada)
    return armada

@router.get("/", response_model=List[Armada])
def list_armada(
    status: Optional[str] = None,
    session: Session = Depends(get_session),
):
    query = select(Armada)
    if status:
        query = query.where(Armada.status == status)
    return session.exec(query).all()

@router.get("/{armada_id}", response_model=Armada)
def get_armada(armada_id: int, session: Session = Depends(get_session)):
    armada = session.get(Armada, armada_id)
    if not armada:
        raise HTTPException(status_code=404, detail="Armada tidak ditemukan")
    return armada

@router.put("/{armada_id}", response_model=Armada)
def update_armada(armada_id: int, data: Armada, session: Session = Depends(get_session)):
    armada = session.get(Armada, armada_id)
    if not armada:
        raise HTTPException(status_code=404, detail="Armada tidak ditemukan")

    update_data = data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in update_data.items():
        setattr(armada, key, value)

    session.add(armada)
    session.commit()
    session.refresh(armada)
    return armada

@router.delete("/{armada_id}")
def delete_armada(armada_id: int, session: Session = Depends(get_session)):
    armada = session.get(Armada, armada_id)
    if not armada:
        raise HTTPException(status_code=404, detail="Armada tidak ditemukan")
    session.delete(armada)
    session.commit()