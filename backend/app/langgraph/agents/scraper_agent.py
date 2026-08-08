import os
import json
from typing import TypedDict, List, Optional, Dict
from pydantic import BaseModel, Field
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_core.prompts import ChatPromptTemplate
from langchain_tavily import TavilySearch
from langgraph.graph import StateGraph, END
from dotenv import load_dotenv

# Load dot env
load_dotenv()

# ----- FIELD CONFIGURATION -----
TARGET_LLM_FIELDS = [
    "nama_kendaraan", "jenis_armada", "max_payload_kg", 
    "jenis_bbm", "konsumsi_bbm_km_liter", "z_offset_kabin_cm", 
    "include_bak", "jenis_bak", "dimensi_panjang_cm", 
    "dimensi_lebar_cm", "dimensi_tinggi_cm"
] 

TARGET_CUSTOM_FIELDS = ["bahan_bak", "warna_bak", "nopol", "biaya_sewa"]
ALL_TARGET_FIELDS = TARGET_LLM_FIELDS + TARGET_CUSTOM_FIELDS

# ----- Pydantic Scheme ------
class HeaderMapping(BaseModel):
    mapping: Dict[str, Optional[str]] = Field(
        description="Peta dari nama kolom CSV asli ke nama kolom target standar. Isi null jika tidak relevan."
    )

class FleetDataLLM(BaseModel):
    nama_kendaraan: str
    jenis_armada: Optional[str] = Field(default=None, description="Jenis kendaraanya, seperti Blind Van, Mobil Pickup, Truk CDE, Truk CDD, Truk Fuso, atau Truk Tronton")
    max_payload_kg: Optional[int] = Field(default=None, description="Jumlah beban maksimal yang mampu dibawa oleh armada")
    jenis_bbm: Optional[str] = Field(default=None, description="Jenis bahan bakar yang digunakan, seperti diesel atau bensin")
    konsumsi_bbm_km_liter: Optional[float] = Field(default=None, description="Konsumsi BBM kendaraan per Kilometer")
    z_offset_kabin_cm: Optional[int] = Field(default=None, description="Jarak antara kabin dengan bak")
    include_bak: Optional[bool] = Field(default=None, description="Query untuk ini adalah, 'Apakah Dalam Pembelian sudah include dengan Karoserinya?'Bernilai True Jika dalam pembelian sudah include dengan bak atau karoseri, bernilai false jika dalam pembelian hanya chasisnya saja tanpa bak atau karoser")
    jenis_bak: Optional[str] = Field(default=None, description="Jenis bak (Terbuka, Box, Refrigerated). WAJIB NULL jika include_bak False.")
    dimensi_panjang_cm: Optional[int] = Field(default=None, description="Panjang BAK. WAJIB NULL jika include_bak False.")
    dimensi_lebar_cm: Optional[int] = Field(default=None, description="Lebar BAK. WAJIB NULL jika include_bak False.")
    dimensi_tinggi_cm: Optional[int] = Field(default=None, description="Tinggi BAK. WAJIB NULL jika include_bak False.")
    url_gambar: Optional[str] = Field(default=None, description="URL gambar dari kendaraan")

# CSV Header Mapper
def map_csv_headers(csv_columns: List[str]) -> dict:
    llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0) # Diubah ke model Groq yang valid
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """Kamu adalah asisten pemetaan data. 
KOLOM STANDAR KAMI:
{all_target_fields}

ATURAN:
1. Pasangkan kolom CSV yang bermakna sama.
2. Jika tidak relevan, isi null."""),
        ("user", "Daftar kolom CSV: {csv_columns}\n\nKeluarkan hanya JSON valid dengan format: {\"mapping\": {\"kolom_csv\": \"kolom_standar_atau_null\"}}")
    ])
    
    chain = prompt | llm
    result = chain.invoke({
        "all_target_fields": ", ".join(ALL_TARGET_FIELDS),
        "csv_columns": ", ".join(csv_columns)
    })

    response_text = getattr(result, "content", result)
    if isinstance(response_text, str) and response_text.startswith("```"):
        response_text = response_text.strip("`")
        if response_text.startswith("json"):
            response_text = response_text[4:].lstrip()

    start = response_text.find("{")
    end = response_text.rfind("}")
    if start != -1 and end != -1 and end > start:
        response_text = response_text[start : end + 1]

    parsed = json.loads(response_text)
    validated = HeaderMapping.model_validate(parsed)
    return validated.mapping

# Agent State (Tambahkan messages untuk riwayat ReAct agent)
from langchain_core.messages import BaseMessage
from typing import Annotated
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    initial_data: Dict[str, any]
    messages: Annotated[List[BaseMessage], add_messages]
    final_data: Optional[FleetDataLLM]

# Search Tool
@tool
def search_web(query: str):
    """Gunakan tool ini untuk mencari informasi spesifik di internet jika data tidak ada di input awal."""
    search_tool = TavilySearch(max_results=3, include_raw_content=False)
    response = search_tool.invoke({"query": query})
    return response

tools = [search_web]

# 1. Agent Node yang benar (Menyertakan riwayat messages & aturan anti-loop)
def agent_node(state: AgentState):
    print(f"[AGENT] Memproses data kendaraan...")
    llm = ChatGroq(model="openai/gpt-oss-120b", temperature=0).bind_tools(tools)

    prompt = ChatPromptTemplate.from_messages([
        ("system", """Kamu adalah asisten pengisi data kendaraan logistik KAMU HARUS MENGISI FIELD ATAU KOLOM YANG MASIH KOSONG DENGAN MENCARI TAHU INFORMASI NYA MENGGUNAKN TOOL
        KAMU MEMILIKI TOOL search_web GUNAKAN ITU UNTUK MENGISI FIELD YANG BELUM KAMU KETAHUI
ATURAN UTAMA:
JANGAN PERNAH MENGARANG! JIKA TIDAK TAHU MAKA PERTANYAKAN DAN JAWAB MELALU QUERY SEARCH WEB
FIELD include_bak ADALAH FIELD 'APAKAH DALAM PEMBELIAN KENDARAAN SUDAH INCLUDE DENGAN KAROSERI ATAU BAK? UTAMAKAN CARI TAHU APAKAH KENDARAN SUDAH INCLUDE DENGAN KAROSERI ATAU BAK KALO BELOM ISI FIELD ITU DENGAN NILAI FALSE!
KALO FIELD include_bak bernilai false jangan isi field jenis_bak dan dimensi
FIELD DIMENSI ADALAH DIMENSI KAROSERI ATAU BOX ATAU DIMENSI LOAD DECKNYA NYA BUKAN DIMENSI KENDARAANYA!
ATURAN KETAT AGAR TIDAK LOOPING:
1. Analisis "Data Awal" dan lihat "Riwayat Pesan" di bawah.
2. Jika ada informasi teknis yang kosong, gunakan tool 'search_web' CUKUP SEKALI dengan query spesifik.
3. JANGAN PERNAH memanggil tool yang sama berulang kali jika hasilnya sudah muncul di riwayat pesan.
4. Jika data sudah dirasa cukup atau tool sudah memberikan hasil, BERHENTI memanggil tool dan berikan respon teks biasa agar proses bisa dilanjutkan ke tahap ekstraksi."""),
        ("user", "Data Awal: {initial_data}"),
        # PENTING: Placeholder ini wajib ada agar LLM tahu percakapan dan hasil tool sebelumnya
        ("placeholder", "{messages}")
    ])
    
    chain = prompt | llm
    # Masukkan state["messages"] ke dalam invoke agar LLM tidak amnesia
    response = chain.invoke({
        "initial_data": json.dumps(state["initial_data"]),
        "messages": state["messages"]
    })
    return {"messages": [response]}
# 2. Final Extractor Node (Mengubah hasil chat/riset agent menjadi struktur Pydantic FleetDataLLM)
def extract_final_data(state: AgentState):
    print(f"[EXTRACTOR] Merangkum hasil menjadi format terstruktur...")
    llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)
    structured_llm = llm.with_structured_output(FleetDataLLM)

    prompt = ChatPromptTemplate.from_messages([
        ("system", "Berdasarkan Data Awal dan seluruh hasil percakapan/pencarian web di bawah, ekstrak dan lengkapi data kendaraan sesuai format yang diminta."),
        ("user", "Data Awal: {initial_data}\n\nRiwayat Percakapan & Hasil Riset:\n{messages}")
    ])

    chain = prompt | structured_llm
    result = chain.invoke({
        "initial_data": json.dumps(state["initial_data"]),
        "messages": str(state["messages"])
    })

    return {"final_data": result}

# --- Create Graph ---
builder = StateGraph(AgentState)

builder.add_node("agent", agent_node)
builder.add_node("tools", ToolNode(tools))
builder.add_node("extractor", extract_final_data) # Node penutup untuk mengisi final_data

builder.set_entry_point("agent")

# Logika Router: 
# Jika agent ingin manggil tool -> pergi ke node "tools"
# Jika agent selesai (tidak manggil tool) -> alih-alih langsung END, kita lempar ke node "extractor"
builder.add_conditional_edges(
    "agent", 
    tools_condition,
    {"tools": "tools", END: "extractor"}
)

# Setelah tool selesai dieksekusi, kembalikan lagi ke agent untuk evaluasi
builder.add_edge("tools", "agent")

# Setelah extractor selesai menyusun Pydantic, barulah graph benar-benar selesai (END)
builder.add_edge("extractor", END)

scrapper_agent = builder.compile()

# Callable Function 
def scrap_single_fleet(raw_dict: dict) -> dict:
    # recursion_limit membatasi maksimal langkah graph (mencegah infinite loop parah)
    result = scrapper_agent.invoke(
        {"initial_data": raw_dict, "messages": []},
        config={"recursion_limit": 10} 
    )
    return result["final_data"].model_dump()