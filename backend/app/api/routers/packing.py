import json
import uuid
import queue
import threading

from typing import List, Dict
from pydantic import BaseModel as PydanticBaseModel
from sqlmodel import Session, select
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.postgresql.database import get_session
from app.postgresql.schema.armada import Armada, Karoseri
from app.postgresql.schema.pengiriman import Pengiriman, Barang
from app.postgresql.schema.packing import HasilPacking
from app.py3dbp.p3dbp_service import pack
from app.py3dbp.sorting_engine import build_constraints, sort_packing
from app.langgraph.agents.strategist_agent import run_strategist_with_progress

router = APIRouter(prefix="/pengiriman", tags=["packing"])

class StrategyExecutionRequest(PydanticBaseModel):
    """Request body untuk execute-strategy."""
    strategy_label: str
    armada_sequence: List[int]

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



@router.get("/{pengiriman_id}/strategize")
async def strategize_shipment(
    pengiriman_id: int,
    session: Session = Depends(get_session),
):
    # Validation
    pengiriman = session.get(Pengiriman, pengiriman_id)
    if not pengiriman:
        raise HTTPException(status_code=404, detail="Pengiriman tidak ditemukan")
    
    daftar_barang = session.exec(
        select(Barang).where(Barang.pengiriman_id == pengiriman_id)
    ).all()
    if not daftar_barang:
        raise HTTPException(status_code=400, detail="Belum ada barang di pengiriman ini")
    

    barang_data = [
        {
            "id": b.id,
            "pengiriman_id": b.pengiriman_id,
            "nama_barang": b.nama_barang,
            "kategori": b.kategori,
            "fragility_level": b.fragility_level,
            "berat": b.berat,
            "panjang": b.panjang,
            "lebar": b.lebar,
            "tinggi": b.tinggi,
            "quantity": b.quantity,
            "bentuk_barang": b.bentuk_barang,
            "butuh_pendingin": b.butuh_pendingin,
            "orientable": b.orientable,
        }
        for b in daftar_barang
    ]
    
    async def event_generator():
        progress_queue = queue.Queue()
        result_holder = {}
        error_holder = {}
        
        def run_agent():
            try:
                result = run_strategist_with_progress(
                    pengiriman_id=pengiriman_id,
                    barang_data=barang_data,
                    db_session=session,
                    progress_callback=lambda step, msg: progress_queue.put((step, msg)),
                )
                result_holder["data"] = result
            except Exception as e:
                error_holder["error"] = str(e)
            finally:
                progress_queue.put(("done", None))
        
        thread = threading.Thread(target=run_agent)
        thread.start()
        
        while True:
            try:
                step, message = progress_queue.get(timeout=120)
                if step == "done":
                    if "error" in error_holder:
                        yield f"data: {json.dumps({'step': 'error', 'message': error_holder['error']}, ensure_ascii=False)}\n\n"
                    else:
                        final_data = {
                            "pengiriman_id": pengiriman_id,
                            "total_barang": len(daftar_barang),
                            "total_berat_kg": sum(b.berat * b.quantity for b in daftar_barang),
                            "recommendation": result_holder.get("data", {}),
                        }
                        yield f"data: {json.dumps({'step': 'done', 'data': final_data}, ensure_ascii=False)}\n\n"
                    break
                else:
                    yield f"data: {json.dumps({'step': step, 'message': message}, ensure_ascii=False)}\n\n"
            except queue.Empty:
                yield f"data: {json.dumps({'step': 'timeout', 'message': 'Proses terlalu lama (>2 menit)'}, ensure_ascii=False)}\n\n"
                break
        
        thread.join(timeout=5)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )

@router.post("/{pengiriman_id}/execute-strategy")
def execute_strategy(
    pengiriman_id: int, 
    body: StrategyExecutionRequest, 
    session: Session = Depends(get_session)
):
    """
    Eksekusi strategi yang disarankan AI.
    Menerima urutan armada (armada_sequence).
    Backend akan otomatis mengisi armada pertama, jika penuh lanjut ke armada kedua, dst.
    """
    pengiriman = session.get(Pengiriman, pengiriman_id)
    if not pengiriman:
        raise HTTPException(status_code=404, detail="Pengiriman tidak ditemukan")
    
    # Ambil semua barang dari pengiriman utama
    daftar_barang = session.exec(
        select(Barang).where(Barang.pengiriman_id == pengiriman_id)
    ).all()
    
    if not daftar_barang:
        raise HTTPException(status_code=400, detail="Belum ada barang di pengiriman ini")
        
    # Pre-process: expand + constraint + sort
    expanded_barang = []
    for b in daftar_barang:
        for _ in range(b.quantity):
            expanded_barang.append(b)
            
    from app.py3dbp.sorting_engine import build_constraints, sort_packing
    constraints = build_constraints(expanded_barang)
    sorted_pairs = sort_packing(expanded_barang, constraints)
    
    remaining_pairs = sorted_pairs.copy()
    is_multi = len(body.armada_sequence) > 1
    results_per_armada = []
    
    for armada_id in body.armada_sequence:
        if not remaining_pairs:
            break # Semua barang sudah muat
            
        armada = session.get(Armada, armada_id)
        if not armada or not armada.karoseri_id:
            raise HTTPException(
                status_code=400, 
                detail=f"Armada {armada_id} tidak valid atau belum punya karoseri"
            )
        karoseri = session.get(Karoseri, armada.karoseri_id)
        
        target_pengiriman_id = pengiriman_id
        
        if is_multi:
            # Buat sub-pengiriman
            sub_kode = f"{pengiriman.kode_pengiriman}-{armada.nama_kendaraan[:10]}-{uuid.uuid4().hex[:4]}"
            sub_pengiriman = Pengiriman(
                kode_pengiriman=sub_kode,
                armada_id=armada_id,
                parent_id=pengiriman_id,  # PERBAIKAN: parent_id, bukan parent_pengiriman_id
                tanggal_pengiriman=pengiriman.tanggal_pengiriman,
                status="packed",
            )
            session.add(sub_pengiriman)
            session.flush()
            target_pengiriman_id = sub_pengiriman.id
        else:
            pengiriman.armada_id = armada_id
            session.add(pengiriman)
            
        # Pack sisa barang ke armada ini
        packing_results = pack(armada, karoseri, remaining_pairs)
        
        # Simpan hasil packing yang MUAT
        old = session.exec(
            select(HasilPacking).where(HasilPacking.pengiriman_id == target_pengiriman_id)
        ).all()
        for row in old:
            session.delete(row)
            
        fitted_counts = {}
        fitted_results = []
        unfitted_pairs = []
        
        # mapping original_id ke object
        # packing_results berurutan dengan remaining_pairs
        for i, item in enumerate(packing_results):
            b_obj, c_obj = remaining_pairs[i]
            
            if item.muat:
                # Simpan HasilPacking
                row = HasilPacking(
                    pengiriman_id=target_pengiriman_id,
                    barang_id=item.barang_id,
                    posisi_x=item.posisi_x,
                    posisi_y=item.posisi_y,
                    posisi_z=item.posisi_z,
                    orientasi=item.orientasi,
                )
                session.add(row)
                fitted_results.append(row)
                fitted_counts[item.barang_id] = fitted_counts.get(item.barang_id, 0) + 1
            else:
                unfitted_pairs.append((b_obj, c_obj))
                
        # Jika is_multi, buat Barang baru di sub-pengiriman sesuai jumlah yang muat
        if is_multi:
            for bid, qty in fitted_counts.items():
                original = session.get(Barang, bid)
                if original:
                    sub_barang = Barang(
                        pengiriman_id=target_pengiriman_id,
                        nama_barang=original.nama_barang,
                        bentuk_barang=original.bentuk_barang,
                        panjang=original.panjang,
                        lebar=original.lebar,
                        tinggi=original.tinggi,
                        berat=original.berat,
                        quantity=qty,
                        kategori=original.kategori,
                        fragility_level=original.fragility_level,
                        butuh_pendingin=original.butuh_pendingin,
                        orientable=original.orientable,
                    )
                    session.add(sub_barang)
            session.flush()
            
            # NOTE: Update ID di HasilPacking dengan ID sub_barang baru
            # (Jika frontend butuh relasi yang valid).
            # Karena ini cukup kompleks, untuk prototype kita biarkan HasilPacking
            # mengarah ke original barang_id, tapi di get_visualisation harus hati2.
            # get_visualisation mencari barang dari database.
            
        results_per_armada.append({
            "armada_id": armada_id,
            "armada_nama": armada.nama_kendaraan,
            "pengiriman_id": target_pengiriman_id,
            "is_sub_pengiriman": is_multi,
            "fitted": len(fitted_results),
            "unfitted": len(unfitted_pairs),
            "visualisation_url": f"/pengiriman/{target_pengiriman_id}/visualisation",
        })
        
        # Sisa barang diproses di armada selanjutnya
        remaining_pairs = unfitted_pairs
        
    pengiriman.status = "packed" if not remaining_pairs else "partially_packed"
    session.add(pengiriman)
    session.commit()

    return {
        "message": f"Strategi '{body.strategy_label}' diterapkan. {len(remaining_pairs)} item gagal dimuat.",
        "details": results_per_armada
    }


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

    expanded_barang = []
    for b in daftar_barang:
        for _ in range(b.quantity):
            expanded_barang.append(b)

    constraints = build_constraints(expanded_barang)
    sorted_pairs = sort_packing(expanded_barang, constraints)
    
    results = pack(armada, karoseri, sorted_pairs)

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
                "is_fragile": barang.fragility_level != "normal",
            })
    return {
        "karoseri": {
            "panjang": karoseri.panjang,
            "lebar": karoseri.lebar,
            "tinggi": karoseri.tinggi,
        },
        "items": items,
    }
