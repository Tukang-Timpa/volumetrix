import sys
from app.py3dbp.p3dbp_service import pack
from app.postgresql.schema.armada import Armada, Karoseri
from app.postgresql.schema.pengiriman import Barang

class MockConstraint:
    def __init__(self, r=0.8):
        self.support_surface_ratio = r

armada = Armada(max_payload=1000)
karoseri = Karoseri(id=1, panjang=100, lebar=100, tinggi=100)

b_unmapped = Barang(id=1, pengiriman_id=1, nama_barang="Unmapped", panjang=50, lebar=30, tinggi=20, berat=10)
b_mapped = Barang(id=2, pengiriman_id=1, nama_barang="Mapped", panjang=50, lebar=30, tinggi=20, berat=10, bottom_axis="panjang")

# Pack unmapped
res_unmapped = pack(armada, karoseri, [(b_unmapped, MockConstraint())])
print(f"Unmapped muat: {res_unmapped[0].muat}")

# Pack mapped
res_mapped = pack(armada, karoseri, [(b_mapped, MockConstraint())])
print(f"Mapped muat: {res_mapped[0].muat}")

