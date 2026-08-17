import os
import json
from datetime import datetime
from dataclasses import dataclass
from typing import List, Optional, Tuple
from app.postgresql.schema.pengiriman import Barang

# Fragility Loadbear Constant
# "normal" | "fragile" | "do_not_stack"
FRAGILITY_LOADBEAR = {
    "do_not_stack": 0.0,    
    "fragile": 5.0,          
    "normal": 50.0,          
    "sturdy": 200.0,         
    "structure": 500,        
}

# Density Thresholds Constant
DENSITY_THRESHOLDS = {
    "very_light": 0.01,
    "light": 0.05,
    "medium": 0.2,
    "heavy": 0.5,
    "super_heavy": 1.0,
}


@dataclass
class PackingConstraint:
    # Constraint Parameter
    barang_id: int
    loadbear: float                 # Maximum weight of stacked item that it can hold
    level: int                      # Packing Priority
    support_surface_ratio: float   # Surface Ratio

    # Metadata
    density: float
    footprint: float
    base_score: float


# Calculate Density
def _calc_density(barang: Barang) -> float:
    volume_cm3 = barang.panjang * barang.lebar * barang.tinggi  # in cm^3
    if volume_cm3 <= 0:
        return 0.0
    volume_dm3 = volume_cm3 / 1000.0  # convert to m^3
    density = barang.berat / volume_dm3  # in kg/m^3
    return density


# Calculate Footprint
def _calc_footprint(barang: Barang) -> float:
    if not barang.orientable:
        # If item not orientable
        return barang.panjang * barang.lebar
    else:
        dims = sorted([barang.panjang, barang.lebar, barang.tinggi], reverse=True)
        return dims[0] * dims[1]


# Calculate Base Score
def _calc_base_score(
    barang: Barang,
    density: float,
    footprint: float,
) -> float:
    # Normalize density
    density_norm = min(density / 2.0, 1.0)
    
    # Normalize footprint 
    footprint_norm = min(footprint / 30000.0, 1.0)
    
    # Normalize weight
    weight_norm = min(barang.berat / 100.0, 1.0)
    
    # Fragility penalty
    fragility_penalty = 0.0
    if barang.fragility_level == "fragile":
        fragility_penalty = -50.0 if barang.berat < 10.0 else -10.0
    elif barang.fragility_level == "do_not_stack":
        fragility_penalty = -80.0 if barang.berat < 10.0 else -20.0 
    
    # Composite Score Calculation
    score = (
        30.0 * density_norm +        # 30% density
        40.0 * footprint_norm +      # 40% footprint
        30.0 * weight_norm +         # 30% berat absolut
        fragility_penalty            # Fragile penalty
    )
    
    return round(score, 2)


# Calculate Loadbear based on fragility and density
def _calc_loadbear(
    barang: Barang,
    density: float,
    footprint: float,
) -> float:
    # Determine base loadbear from fragility
    if barang.fragility_level == "do_not_stack":
        base = FRAGILITY_LOADBEAR["do_not_stack"]
    elif barang.fragility_level == "fragile":
        base = FRAGILITY_LOADBEAR["fragile"]
    elif density > 1.0 and footprint > 2500.0:
        base = FRAGILITY_LOADBEAR["structure"]
    elif density > 0.5:
        base = FRAGILITY_LOADBEAR["sturdy"]
    elif density > 0.2:
        base = FRAGILITY_LOADBEAR["normal"]
    else:
        base = FRAGILITY_LOADBEAR["normal"] * 0.5
    
    # Density multiplier
    if density > 1.0:
        density_mult = 1.5
    elif density > 0.5:
        density_mult = 1.3
    elif density > 0.2:
        density_mult = 1.0
    elif density > 0.05:
        density_mult = 0.8
    else:
        density_mult = 0.5
    
    final_loadbear = base * density_mult
    
    # Safety Cap 
    max_safe_load = barang.berat * 4.0 
    
    return round(min(final_loadbear, max_safe_load), 1)


# Map base score to packing level
def _base_score_to_level(base_score: float) -> int:
    if base_score >= 35.0:
        return 1
    elif base_score >= 15.0:
        return 2
    else:
        return 3


# Calculate support surface ratio based on fragility and density
def _get_support_ratio(
    barang: Barang,
    density: float,
) -> float:
    # Calculate the support surface ratio
    if barang.fragility_level in ("fragile", "do_not_stack"):
        return 0.9
    if density > 0.5:
        return 0.5 
    if density < 0.05:
        return 0.75
    return 0.7



# Build packing constraints for a list of items
def build_constraints(
    daftar_barang: List[Barang],
) -> List[PackingConstraint]:
    """
    Build constraint list untuk semua barang berdasarkan standar industri.
    
    Args:
        daftar_barang: List barang dari DB (sudah di-expand by quantity)
    
    Returns:
        List of PackingConstraint, satu per barang.
    """
    constraints = []
    print(f"[Sorting Engine] Building constraints for {len(daftar_barang)} items...")

    for barang in daftar_barang:
        # Calculate core metrics
        density = _calc_density(barang)
        footprint = _calc_footprint(barang)
        base_score = _calc_base_score(barang, density, footprint)
        
        # Determine loadbear
        loadbear = _calc_loadbear(barang, density, footprint)

        constraints.append(PackingConstraint(
            barang_id=barang.id,
            loadbear=loadbear,
            level=_base_score_to_level(base_score),
            support_surface_ratio=_get_support_ratio(barang, density),
            density=round(density, 4),
            footprint=round(footprint, 1),
            base_score=base_score,
        ))
        print(f"  -> {barang.nama_barang} | Level: {constraints[-1].level} | Base Score: {constraints[-1].base_score} | Loadbear: {constraints[-1].loadbear}kg")

    return constraints


# Sort items based on packing constraints
def sort_packing(
    item_list: List[Barang],
    constraints: List[PackingConstraint]
) -> List[Tuple[Barang, PackingConstraint]]:
    """
    Sort items based on packing constraints.
    
    Args:
        item_list: List of Barang
        constraints: List of PackingConstraint
    
    Returns:
        Sorted list of tuples (Barang, PackingConstraint)
    """
    # Create a mapping from barang_id to constraint
    constraint_map = {c.barang_id: c for c in constraints}
    
    # Pair each item with its corresponding constraint
    paired_list = [(item, constraint_map[item.id]) for item in item_list]
    print(f"[Sorting Engine] Sorting {len(paired_list)} items based on Level -> Base Score -> Volume...")
    
    # Sort the paired list based on level, base_score, and volume (descending)
    sorted_list = sorted(paired_list, key=lambda x: (x[1].level, -x[1].base_score, -(x[0].panjang * x[0].lebar * x[0].tinggi)))
    
    print(f"[Sorting Engine] Sorting complete. {sorted_list[0][0].nama_barang} is at the top of the sequence (Foundation).")
    
    # Otomatis generate log laporan
    _dump_sorting_log(sorted_list)
    
    return sorted_list


# Debugger function to dump sorting log to JSON
def _dump_sorting_log(sorted_list: List[Tuple[Barang, PackingConstraint]]):
    """
    Simpan hasil urutan sorting dan konstrainnya ke dalam file log/ JSON.
    """
    if not sorted_list:
        return
        
    # create log directory if it doesn't exist
    log_dir = os.path.join(os.getcwd(), "log")
    os.makedirs(log_dir, exist_ok=True)
    
    # Create log filename based on pengiriman_id and timestamp
    pengiriman_id = sorted_list[0][0].pengiriman_id
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_filename = os.path.join(log_dir, f"sorting_engine_{pengiriman_id}_{timestamp}.json")
    
    log_data = []
    level_desc = {1: "BOTTOM (Foundation)", 2: "MIDDLE", 3: "TOP"}
    
    for idx, (barang, c) in enumerate(sorted_list):
        log_data.append({
            "packing_sequence": idx + 1,
            "item_name": barang.nama_barang,
            "physical_properties": {
                "weight_kg": barang.berat,
                "dimensions_cm": f"{barang.panjang}x{barang.lebar}x{barang.tinggi}",
                "fragility": barang.fragility_level,
                "orientable": barang.orientable
            },
            "engine_calculations": {
                "level": c.level,
                "position": level_desc.get(c.level, "?"),
                "base_score": c.base_score,
                "loadbear_kg": c.loadbear,
                "density_kg_dm3": c.density,
                "footprint_cm2": c.footprint,
                "support_ratio": c.support_surface_ratio
            }
        })
        
    try:
        # with open(log_filename, "w", encoding="utf-8") as f:
        #     json.dump(log_data, f, indent=4)
        # print(f"[Sorting Engine] Detailed report successfully dumped to: {log_filename}")
        pass
    except Exception as e:
        print(f"[Sorting Engine] Error Failed to write log: {e}")
