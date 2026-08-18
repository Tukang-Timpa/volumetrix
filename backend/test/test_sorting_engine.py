"""
Test Sorting Engine
===================
Jalankan: python test_sorting_engine.py
"""
import sys
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.postgresql.schema.pengiriman import Barang
from app.py3dbp.sorting_engine import build_constraints, sort_packing

# ============================================================
# TEST DATA — Skenario logistik campuran
# ============================================================

test_items = [
    Barang(
        id=1, pengiriman_id=1, nama_barang="Sak Semen 50kg",
        panjang=60, lebar=40, tinggi=15, berat=50, quantity=1,
        fragility_level="normal", orientable=True,       # normal
    ),
    Barang(
        id=2, pengiriman_id=1, nama_barang="Kulkas 2 Pintu",
        panjang=60, lebar=65, tinggi=170, berat=75, quantity=1,
        fragility_level="normal", orientable=False,       # fragile + tidak boleh digulingkan
    ),
    Barang(
        id=3, pengiriman_id=1, nama_barang="TV LED 55 Inch",
        panjang=125, lebar=12, tinggi=75, berat=15, quantity=1,
        fragility_level="fragile", orientable=False,       # fragile
    ),
    Barang(
        id=4, pengiriman_id=1, nama_barang="Kardus Baju",
        panjang=40, lebar=30, tinggi=30, berat=3, quantity=1,
        fragility_level="normal", orientable=True,        # normal
    ),
    Barang(
        id=5, pengiriman_id=1, nama_barang="Aquarium Kaca Besar",
        panjang=90, lebar=40, tinggi=50, berat=25, quantity=1,
        fragility_level="do_not_stack", orientable=False,       # DO NOT STACK!
    ),
    Barang(
        id=6, pengiriman_id=1, nama_barang="Kasur Spring Bed",
        panjang=200, lebar=160, tinggi=25, berat=30, quantity=1,
        fragility_level="normal", orientable=True,        # normal
    ),
    Barang(
        id=7, pengiriman_id=1, nama_barang="Aki Motor 12V",
        panjang=15, lebar=10, tinggi=10, berat=10, quantity=1,
        fragility_level="normal", orientable=True,        # normal
    ),
    Barang(
        id=8, pengiriman_id=1, nama_barang="Bantal Sofa",
        panjang=50, lebar=50, tinggi=15, berat=0.5, quantity=1,
        fragility_level="normal", orientable=True,        # normal
    ),
    Barang(
        id=9, pengiriman_id=1, nama_barang="Plat Baja 1m x 0.5m",
        panjang=100, lebar=50, tinggi=5, berat=40, quantity=1,
        fragility_level="normal", orientable=True,        # normal
    ),
    Barang(
        id=10, pengiriman_id=1, nama_barang="Keyboard Mekanikal",
        panjang=45, lebar=15, tinggi=4, berat=1.2, quantity=1,
        fragility_level="normal", orientable=True,        # normal
    ),
]


# ============================================================
# RUN TEST
# ============================================================

if __name__ == "__main__":
    print("=" * 70)
    print("  SORTING ENGINE TEST")
    print("=" * 70)
    print()

    # 1. Build constraints
    constraints = build_constraints(test_items)
    print()

    # 2. Sort
    sorted_pairs = sort_packing(test_items, constraints)
    print()

    # 3. Print final result table
    print("=" * 70)
    print("  FINAL PACKING ORDER (Top = First Loaded = Bottom of Truck)")
    print("=" * 70)
    
    level_label = {1: "BOTTOM", 2: "MIDDLE", 3: "TOP"}
    
    header = f"{'#':>2} | {'Item Name':<25} | {'Level':>6} | {'Score':>6} | {'Loadbear':>9} | {'Density':>8} | {'Footprint':>10} | {'Ratio':>5}"
    print(header)
    print("-" * len(header))
    
    for idx, (b, c) in enumerate(sorted_pairs):
        lvl = level_label.get(c.level, "?")
        print(
            f"{idx+1:>2} | {b.nama_barang:<25} | {lvl:>6} | {c.base_score:>6.1f} | {c.loadbear:>7.1f}kg | {c.density:>6.4f} | {c.footprint:>8.1f} | {c.support_surface_ratio:>5.2f}"
        )
    
    print()
    print("=" * 70)
    print("  VALIDATION CHECKS")
    print("=" * 70)
    
    errors = []
    
    # Check 1: Fragile/DoNotStack items should NOT be at Level 1
    for b, c in sorted_pairs:
        if b.fragility_level in ["fragile", "do_not_stack"] and c.level == 1:
            errors.append(f"  FAIL: {b.nama_barang} is fragile/do-not-stack but placed at Level 1 (Bottom)!")

    # Check 2: Level order should be ascending (1 -> 2 -> 3)
    levels = [c.level for _, c in sorted_pairs]
    for i in range(len(levels) - 1):
        if levels[i] > levels[i + 1]:
            b_curr = sorted_pairs[i][0].nama_barang
            b_next = sorted_pairs[i + 1][0].nama_barang
            errors.append(f"  FAIL: {b_curr} (Lvl {levels[i]}) is after {b_next} (Lvl {levels[i+1]}) — wrong order!")

    # Check 3: Do-not-stack loadbear should be 0
    for b, c in sorted_pairs:
        if b.fragility_level == "do_not_stack" and c.loadbear > 0:
            errors.append(f"  FAIL: {b.nama_barang} is do-not-stack but loadbear = {c.loadbear}kg (should be 0)!")

    # Check 4: Safety cap — loadbear should not exceed 4x weight
    for b, c in sorted_pairs:
        if c.loadbear > b.berat * 4.0 + 0.1:  # small tolerance
            errors.append(f"  FAIL: {b.nama_barang} loadbear {c.loadbear}kg exceeds safety cap {b.berat * 4.0}kg (4x weight)!")

    # Check 5: Non-orientable items should use actual P*L as footprint
    for b, c in sorted_pairs:
        if not b.orientable:
            expected_fp = b.panjang * b.lebar
            if abs(c.footprint - expected_fp) > 0.5:
                errors.append(f"  FAIL: {b.nama_barang} (non-orientable) footprint={c.footprint}, expected={expected_fp}!")

    if errors:
        print(f"\n  Found {len(errors)} issue(s):")
        for e in errors:
            print(e)
    else:
        print("\n  ALL CHECKS PASSED!")
    
    print()
