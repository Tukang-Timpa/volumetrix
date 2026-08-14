from dataclasses import dataclass
from typing import List

from py3dbp import Packer, Bin, Item as PackerItem

from app.postgresql.schema.armada import Armada, Karoseri
from app.postgresql.schema.pengiriman import Barang
from app.py3dbp.sorting_engine import build_constraints, sort_packing

@dataclass
class ItemPackingResult:
    barang_id: int
    posisi_x: float
    posisi_y: float
    posisi_z: float
    orientasi: int
    muat: bool  # False if the item could not be placed


# Expand items based on their quantity
def _expand_item_by_quantity(daftar_barang: List[Barang]) -> List[Barang]:
    expanded = []
    for barang in daftar_barang:
        for _ in range(barang.quantity):
            expanded.append(barang)
    return expanded


def pack(
    armada: Armada,
    karoseri: Karoseri,
    daftar_barang: List[Barang],
) -> List[ItemPackingResult]:
    packer = Packer()

    packer.add_bin(
        Bin(
            f"karoseri-{karoseri.id}",
            karoseri.panjang,
            karoseri.lebar,
            karoseri.tinggi,
            armada.max_payload or 0,
        )
    )

    expanded_item = _expand_item_by_quantity(daftar_barang)

    constraints = build_constraints(expanded_item)
    sorted_pairs = sort_packing(expanded_item, constraints)

    # Create a unique name for each item to map back to the original item ID after packing
    id_map = {}
    for idx, (barang, constraints) in enumerate(sorted_pairs):
        unique_name = f"{barang.id}::{idx}"
        id_map[unique_name] = barang.id
        packer.add_item(
            PackerItem(
                unique_name,
                barang.panjang,
                barang.lebar,
                barang.tinggi,
                barang.berat,
                loadbear=constraints.loadbear,
                level=constraints.level,
                updown = not barang.orientable,
                number_of_decimals=2
            )
        )

    packer.pack(
        bigger_first=True,
        check_stable=True,
        support_surface_ratio=0.75,
        fix_point=True,
    )

    results = []
    for b in packer.bins:
        for item in b.items:
            original_id = id_map[item.name]
            results.append(
                ItemPackingResult(
                    barang_id=original_id,
                    posisi_x=item.position[0],
                    posisi_y=item.position[1],
                    posisi_z=item.position[2],
                    orientasi=item.rotation_type,
                    muat=True,
                )
            )

        # Add items that could not be placed
        for item in b.unfitted_items:
            original_id = id_map[item.name]
            results.append(
                ItemPackingResult(
                    barang_id=original_id,
                    posisi_x=0.0,
                    posisi_y=0.0,
                    posisi_z=0.0,
                    orientasi=0,
                    muat=False,
                )
            )

    return results