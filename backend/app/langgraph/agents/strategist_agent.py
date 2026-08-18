import json
import os
import itertools
from typing import TypedDict, List, Optional, Annotated, Callable
from pydantic import BaseModel, Field
from langchain_groq import ChatGroq
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from dotenv import load_dotenv

load_dotenv()


class TrialDetail(BaseModel):
    armada_id: int
    armada_name: str
    items_fitted: int
    items_unfitted: int
    volume_utility: float
    weight_utility: float


class Strategy(BaseModel):
    ranking: int = Field(description="1 = terbaik")
    label: str = Field(description="e.g. '1 Truk Fuso' atau '1 CDD + 1 Blind Van'")
    armada_used: List[dict] = Field(description="List armada yang dipakai, [{id, nama}]")
    armada_sequence: List[int] = Field(description="Urutan armada_id yang dipakai (misal: [53, 52]).")
    semua_muat: bool
    skor: int = Field(ge=0, le=100)
    utilisasi_volume_persen: Optional[float] = None
    estimasi_biaya: Optional[str] = None
    pro: List[str]
    kontra: List[str]
    ringkasan: str
    trial_details: List[TrialDetail] = Field(default_factory=list)

class StrategyRecommendation(BaseModel):
    strategies: List[Strategy] = Field(description="List strategi yang diurutkan dari terbaik ke terburuk")
    kesimpulan: str = Field(description="Ringkasan rekomendasi final untuk user")


# Agent State
class StrategistState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    raw_items: List[dict]
    pengiriman_id: int
    items_sorted: List[dict]
    top_strategies_context: str
    progress_callback: Optional[Callable]
    final_recommendation: Optional[dict]


def preprocess_node(state: StrategistState):
    """
    Node deterministik pertama di graph.
    Expand barang by quantity, hitung constraint, dan sort.
    """
    from app.postgresql.schema.pengiriman import Barang
    from app.py3dbp.sorting_engine import build_constraints, sort_packing
    
    progress_cb = state.get("progress_callback")
    if progress_cb:
        try:
            progress_cb("preprocessing", "Running constraint engine & sorting...")
        except Exception:
            pass
    
    barang_list = []
    for d in state["raw_items"]:
        barang_list.append(Barang(**d))
    
    expanded = []
    for b in barang_list:
        for _ in range(b.quantity):
            expanded.append(b)
    
    constraints = build_constraints(expanded)
    sorted_pairs = sort_packing(expanded, constraints)
    
    items_sorted = []
    for b, c in sorted_pairs:
        items_sorted.append({
            "id": b.id,
            "nama_barang": b.nama_barang,
            "kategori": getattr(b, 'kategori', None),
            "fragility_level": b.fragility_level,
            "berat": b.berat,
            "panjang": b.panjang,
            "lebar": b.lebar,
            "tinggi": b.tinggi,
            "quantity": 1,
            "bentuk_barang": getattr(b, 'bentuk_barang', None),
            "butuh_pendingin": getattr(b, 'butuh_pendingin', False),
            "orientable": getattr(b, 'orientable', True),
            "loadbear": c.loadbear,
            "level": c.level,
            "base_score": c.base_score,
            "density": c.density,
            "footprint": c.footprint,
            "support_surface_ratio": c.support_surface_ratio,
        })
    
    summary_dict = {}
    for (b, c) in sorted_pairs:
        nama_kategori = getattr(b, 'kategori', None) or b.nama_barang
        key = (b.panjang, b.lebar, b.tinggi, b.berat, b.fragility_level, c.level, nama_kategori)
        
        if key not in summary_dict:
            summary_dict[key] = {
                "nama": nama_kategori,
                "qty": 0,
                "dimensi": f"{b.panjang}x{b.lebar}x{b.tinggi} cm",
                "berat": f"{b.berat} kg",
                "fragility": b.fragility_level,
                "level": c.level
            }
        summary_dict[key]["qty"] += 1
        
    summary_lines = []
    for bid, data in summary_dict.items():
        summary_lines.append(
            f"- {data['qty']}x {data['nama']} ({data['dimensi']}, {data['berat']}) | Fragility: {data['fragility']} | Sort Level: {data['level']}"
        )
    items_context = "\n".join(summary_lines)

    context_msg = HumanMessage(
        content=f"REKAP BARANG:\n{items_context}"
    )
    
    return {"items_sorted": items_sorted, "messages": [context_msg]}


def create_auto_strategy_node(db_session):
    def auto_strategy_node(state: StrategistState):
        """
        Backend Brute-Force Node.
        Mencari kombinasi maksimal 2 truk termurah secara otomatis.
        """
        from sqlmodel import select
        from app.postgresql.schema.armada import Armada, Karoseri
        from app.postgresql.schema.pengiriman import Barang
        from app.py3dbp.p3dbp_service import pack
        
        progress_cb = state.get("progress_callback")
        if progress_cb:
            try:
                progress_cb("auto_strategy_simulating", "Simulating math combinations for best pricing...")
            except Exception:
                pass
                
        if not db_session:
            return {"top_strategies_context": "No DB Session. Cannot run simulation."}
            
        # Reconstruct sorted pairs from state
        expanded_barang = []
        for d in state["items_sorted"]:
            b = Barang(
                id=d["id"], nama_barang=d["nama_barang"], berat=d["berat"],
                panjang=d["panjang"], lebar=d["lebar"], tinggi=d["tinggi"],
                orientable=d["orientable"], fragility_level=d["fragility_level"]
            )
            # Create a mock constraint class matching the interface
            class MockC: pass
            c = MockC()
            c.level = d["level"]
            expanded_barang.append((b, c))
            
        # Fetch available fleet and group by unique types
        armadas = db_session.exec(select(Armada).where(Armada.status == "tersedia")).all()
        
        unique_types = {}
        for a in armadas:
            if a.karoseri_id and a.max_payload > 0:
                # Group by name + payload to find unique physical truck types
                key = f"{a.nama_kendaraan}-{a.max_payload}"
                if key not in unique_types:
                    unique_types[key] = []
                unique_types[key].append(a)
                
        # Generate combinations (1, 2, and 3 trucks) using representatives
        combinations = []
        
        # Single truck combinations (pick the first instance of each type)
        for key, group in unique_types.items():
            combinations.append([group[0]])
            
        # Double truck combinations
        types_keys = list(unique_types.keys())
        for key1, key2 in itertools.combinations_with_replacement(types_keys, 2):
            if key1 == key2:
                if len(unique_types[key1]) >= 2:
                    combinations.append([unique_types[key1][0], unique_types[key1][1]])
            else:
                combinations.append([unique_types[key1][0], unique_types[key2][0]])
                
        # Triple truck combinations
        for key1, key2, key3 in itertools.combinations_with_replacement(types_keys, 3):
            # Hitung kemunculan setiap tipe di kombinasi ini
            counts = {}
            for k in [key1, key2, key3]:
                counts[k] = counts.get(k, 0) + 1
                
            # Pastikan armada fisik tersedia cukup
            valid = True
            combo_instances = []
            for k, required_qty in counts.items():
                if len(unique_types[k]) < required_qty:
                    valid = False
                    break
                # Ambil instance unik dari grup (0 sampai required_qty - 1)
                for i in range(required_qty):
                    combo_instances.append(unique_types[k][i])
                    
            if valid:
                combinations.append(combo_instances)
            
        HARGA_BBM = 6800
        JARAK_KM = 100.0
            
        successful_strategies = []
        
        for combo in combinations:
            remaining_pairs = expanded_barang.copy()
            total_biaya = 0
            results_per_armada = []
            
            for armada in combo:
                if not remaining_pairs:
                    break
                    
                karoseri = db_session.get(Karoseri, armada.karoseri_id)
                if not karoseri:
                    continue
                    
                packing_results = pack(armada, karoseri, remaining_pairs)
                
                fitted_items = [r for r in packing_results if r.muat]
                unfitted_pairs = [(remaining_pairs[i][0], remaining_pairs[i][1]) for i, r in enumerate(packing_results) if not r.muat]
                
                vol_karoseri = karoseri.panjang * karoseri.lebar * karoseri.tinggi
                vol_fitted = sum(next(b.panjang * b.lebar * b.tinggi for b, _ in expanded_barang if b.id == r.barang_id) for r in fitted_items)
                berat_fitted = sum(next(b.berat for b, _ in expanded_barang if b.id == r.barang_id) for r in fitted_items)
                
                results_per_armada.append({
                    "armada_id": armada.id,
                    "armada_name": armada.nama_kendaraan,
                    "items_fitted": len(fitted_items),
                    "items_unfitted": len(unfitted_pairs),
                    "volume_utility": round((vol_fitted / vol_karoseri) * 100, 1) if vol_karoseri > 0 else 0,
                    "weight_utility": round((berat_fitted / armada.max_payload) * 100, 1) if armada.max_payload > 0 else 0,
                })
                
                bbm_km = armada.konsumsi_bahan_bakar
                if bbm_km and bbm_km > 0:
                    total_biaya += (JARAK_KM / bbm_km) * HARGA_BBM
                    
                remaining_pairs = unfitted_pairs
                
            if len(remaining_pairs) == 0:
                # Success! All items fit
                armada_seq = [a.id for a in combo[:len(results_per_armada)]] # Only count used trucks
                successful_strategies.append({
                    "armada_sequence": armada_seq,
                    "biaya": total_biaya,
                    "details": results_per_armada
                })
                
        # Deduplicate and sort by lowest cost
        unique_strategies = []
        seen_seq = set()
        for s in successful_strategies:
            seq_tuple = tuple(s["armada_sequence"])
            if seq_tuple not in seen_seq:
                seen_seq.add(seq_tuple)
                unique_strategies.append(s)
                
        unique_strategies.sort(key=lambda x: x["biaya"])
        top_3 = unique_strategies[:3]
        
        if not top_3:
            ctx = "SEMUA KOMBINASI (MAKSIMAL 2 TRUK) GAGAL MEMUAT SELURUH BARANG. User perlu menambah armada."
        else:
            ctx = "TOP 3 STRATEGI TERMURAH YANG DIJAMIN 100% MUAT (DARI BACKEND):\n"
            for i, s in enumerate(top_3):
                ctx += f"\nStrategi #{i+1} (Biaya Estimasi: Rp {round(s['biaya']):,})\n"
                ctx += f"Armada Sequence: {s['armada_sequence']}\n"
                for d in s["details"]:
                    ctx += f"  - {d['armada_name']} (ID {d['armada_id']}): Muat {d['items_fitted']} barang. Vol Util: {d['volume_utility']}%, Wgt Util: {d['weight_utility']}%\n"
                    
        return {"top_strategies_context": ctx}
    
    return auto_strategy_node


def create_strategist_node():
    def strategist_node(state: StrategistState):
        """Node akhir: LLM memberikan penalaran kualitatif."""
        progress_cb = state.get("progress_callback")
        if progress_cb:
            try:
                progress_cb("llm_reasoning", "LLM is evaluating strategies and writing final report...")
            except Exception:
                pass
                
        llm = ChatGroq(model="openai/gpt-oss-120b", temperature=0)
        structured_llm = llm.with_structured_output(StrategyRecommendation)

        prompt_path = os.path.join(os.path.dirname(__file__), "prompts", "strategist_agent.txt")
        try:
            with open(prompt_path, "r", encoding="utf-8") as f:
                system_prompt_text = f.read()
        except Exception:
            system_prompt_text = "Anda adalah AI Logistics Strategist."
            
        system_msg = SystemMessage(content=system_prompt_text)
        
        # Build prompt containing both item context and backend strategies
        full_context = state["messages"][0].content + "\n\n" + state.get("top_strategies_context", "")
        user_msg = HumanMessage(content=full_context)
        
        response = structured_llm.invoke([system_msg, user_msg])
        
        # Pydantic response from with_structured_output can be dumped to dict
        return {"final_recommendation": response.model_dump()}
        
    return strategist_node


# Build Graph
def build_strategist_graph(db_session=None):
    builder = StateGraph(StrategistState)
    
    # Nodes
    builder.add_node("preprocess", preprocess_node)
    builder.add_node("auto_strategy", create_auto_strategy_node(db_session))
    builder.add_node("strategist", create_strategist_node())

    # Flow
    builder.set_entry_point("preprocess")
    builder.add_edge("preprocess", "auto_strategy")
    builder.add_edge("auto_strategy", "strategist")
    builder.add_edge("strategist", END)

    return builder.compile()


def run_strategist(pengiriman_id: int, barang_data: List[dict], db_session=None) -> dict:
    graph = build_strategist_graph(db_session)
    result = graph.invoke(
        {
            "messages": [],
            "raw_items": barang_data,
            "items_sorted": [],
            "pengiriman_id": pengiriman_id,
            "progress_callback": None,
        },
        config={"recursion_limit": 5}
    )
    return result.get("final_recommendation", {})


def run_strategist_with_progress(
    pengiriman_id: int,
    barang_data: List[dict],
    db_session=None,
    progress_callback: Callable = None,
) -> dict:
    graph = build_strategist_graph(db_session)
    if progress_callback:
        progress_callback("starting", "Starting Hybrid AI logistics analysis...")
    
    result = graph.invoke(
        {
            "messages": [],
            "raw_items": barang_data,
            "items_sorted": [],
            "pengiriman_id": pengiriman_id,
            "progress_callback": progress_callback,
        },
        config={"recursion_limit": 5}
    )
    return result.get("final_recommendation", {})

# Compiled graph for LangGraph Studio/CLI Visualization
graph = build_strategist_graph()