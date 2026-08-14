from typing import List
from sqlmodel import Session, select
from fastapi import APIRouter, Depends, HTTPException

from app.postgresql.database import get_session
from app.postgresql.schema.armada import Armada, Karoseri
from app.postgresql.schema.pengiriman import Pengiriman, Barang
from app.postgresql.schema.packing import HasilPacking
from app.py3dbp.p3dbp_service import pack

router = APIRouter(prefix="/pengiriman", tags=["packing"])

# Helper function to calculate the dimensions of a box after rotation based on the orientation.
def _dimension_after_rotation(length: float, width: float, height: float, orientation: int):
    # py3dbp rotation_type follows the WHD permutations.
    w, h, d = length, width, height
    permutations = {
        0: (w, h, d),  # WHD
        1: (h, w, d),  # HWD
        2: (h, d, w),  # HDW
        3: (d, h, w),  # DHW
        4: (d, w, h),  # DWH
        5: (w, d, h),  # WDH
    }
    return permutations.get(orientation, (w, h, d))

@router.post("/{pengiriman_id}/run-packing", response_model=List[HasilPacking])
def run_packing(pengiriman_id: int, session: Session = Depends(get_session)):
    pengiriman = session.get(Pengiriman, pengiriman_id)
    if not pengiriman:
        raise HTTPException(status_code=404, detail="Pengiriman tidak ditemukan")
    if not pengiriman.armada_id:
        raise HTTPException(
            status_code=400,
            detail="Pengiriman ini belum ditetapkan armadanya",
        )

    armada = session.get(Armada, pengiriman.armada_id)
    if not armada or not armada.karoseri_id:
        raise HTTPException(
            status_code=400,
            detail="Armada belum punya karoseri terpasang, packing tidak bisa dihitung",
        )

    karoseri = session.get(Karoseri, armada.karoseri_id)

    daftar_barang = session.exec(
        select(Barang).where(Barang.pengiriman_id == pengiriman_id)
    ).all()
    if not daftar_barang:
        raise HTTPException(status_code=400, detail="Belum ada barang di pengiriman ini")

    results = pack(armada, karoseri, daftar_barang)

    # Delete old packing results for this shipment before saving the new ones
    old_results = session.exec(
        select(HasilPacking).where(HasilPacking.pengiriman_id == pengiriman_id)
    ).all()
    for row in old_results:
        session.delete(row)

    saved = []
    for item in results:
        row = HasilPacking(
            pengiriman_id=pengiriman_id,
            barang_id=item.barang_id,
            posisi_x=item.posisi_x,
            posisi_y=item.posisi_y,
            posisi_z=item.posisi_z,
            orientasi=item.orientasi,
        )
        session.add(row)
        saved.append(row)

    pengiriman.status = "packed"
    session.add(pengiriman)

    session.commit()
    for row in saved:
        session.refresh(row)
    return saved

@router.get("/{pengiriman_id}/packing-results", response_model=List[HasilPacking])
def get_packing_results(pengiriman_id: int, session: Session = Depends(get_session)):
    results = session.exec(
        select(HasilPacking).where(HasilPacking.pengiriman_id == pengiriman_id)
    ).all()
    if not results:
        raise HTTPException(status_code=404, detail="Hasil packing tidak ditemukan")
    return results

@router.get("/{pengiriman_id}/visualisation")
def get_visualisation(pengiriman_id: int, session: Session = Depends(get_session)):
    pengiriman = session.get(Pengiriman, pengiriman_id)
    if not pengiriman:
        raise HTTPException(status_code=404, detail="Pengiriman tidak ditemukan")

    if not pengiriman.armada_id:
        raise HTTPException(status_code=400, detail="Pengiriman belum memiliki armada")

    armada = session.get(Armada, pengiriman.armada_id)
    if not armada:
        raise HTTPException(status_code=404, detail="Armada tidak ditemukan")
    if not armada.karoseri_id:
        raise HTTPException(status_code=400, detail="Armada belum memiliki karoseri")

    karoseri = session.get(Karoseri, armada.karoseri_id)
    if not karoseri:
        raise HTTPException(status_code=404, detail="Karoseri tidak ditemukan")

    hasil = session.exec(
        select(HasilPacking).where(HasilPacking.pengiriman_id == pengiriman_id)
    ).all()

    items = []
    for item in hasil:
        barang = session.get(Barang, item.barang_id)

        if barang:
            p_rendered, l_rendered, h_rendered = _dimension_after_rotation(
                barang.panjang, barang.lebar, barang.tinggi, item.orientasi
            )

            items.append({
                "barang_id": barang.id,
                "nama_barang": barang.nama_barang,
                "panjang": p_rendered,
                "lebar": l_rendered,
                "tinggi": h_rendered,
                "posisi_x": item.posisi_x,
                "posisi_y": item.posisi_y,
                "posisi_z": item.posisi_z,
                "orientasi": item.orientasi,
                "is_fragile": barang.is_fragile,
            })
    return {
        "karoseri": {
            "panjang": karoseri.panjang,
            "lebar": karoseri.lebar,
            "tinggi": karoseri.tinggi,
        },
        "items": items,
    }
