# Volumetrix — Visualisasi Peletakan Muatan

Aplikasi frontend untuk merencanakan & memvisualisasikan peletakan barang
dalam kontainer / mobil box / truck, dengan 6 alur kerja:

1. **Karoseri** — input jenis, dimensi, jumlah (manual/CSV) + tabel dengan status
2. **Armada** — input kendaraan, pilih karoseri, payload, konsumsi BBM
3. **Pengiriman** — input kode pengiriman + status
4. **Barang** — input barang per pengiriman (manual/CSV/**scan QR**), edit/hapus, opsi stackable
5. **Rekomendasi AI** — kartu rekomendasi armada (UI saja, mesin AI backend menyusul). Jika volume muatan melebihi kapasitas satu kendaraan, otomatis muncul opsi "N Kontainer (split muatan)" yang membagi barang ke beberapa armada sekaligus.
6. **Visualisasi 3D** — simulasi penataan step-by-step per kontainer, dengan dukungan multi-kontainer (tab terpisah untuk tiap kendaraan) dan kontrol kecepatan.

## Multi-kontainer (Step 5 & 6)

- Step 5 menghitung estimasi jumlah kontainer yang dibutuhkan dari total volume barang vs kapasitas kontainer, lalu menyusun strategi "N Kontainer (split muatan)" menggunakan algoritma packing yang sama (barang yang tak muat di kontainer pertama otomatis "meluap" ke kontainer berikutnya).
- Strategi yang dipilih di Step 5 otomatis terbawa sebagai daftar kontainer default saat membuka Step 6 untuk pengiriman yang sama.
- Di Step 6, setiap kontainer punya tab, simulasi 3D, dan progress playback sendiri-sendiri. Kontainer bisa ditambah/dihapus manual lewat dropdown "+ Tambah kontainer lain…", berguna kalau ternyata masih ada barang yang belum tertampung (ditandai peringatan kuning).

## Fitur QR Code (Step 4)

- **Scan via kamera** — buka dialog "Scan QR", arahkan kamera ke label QR barang, data otomatis terisi & ditambahkan ke tabel.
- **Scan via upload gambar** — alternatif jika kamera tidak tersedia/diizinkan, unggah foto/screenshot QR.
- **Buat label QR** — setiap baris barang punya tombol ikon QR untuk men-generate & mengunduh label QR (untuk dicetak dan ditempel di kemasan), yang nantinya bisa discan ulang.
- Format data QR: JSON ringkas `{n, p, l, t, b, q, s}` (nama, panjang, lebar, tinggi, berat, quantity, stackable), dengan fallback format teks `nama|panjang|lebar|tinggi|berat|quantity|stackable` untuk label yang ditulis manual.
- Modul scanner (`html5-qrcode`) di-lazy-load — hanya diunduh browser saat dialog Scan QR pertama kali dibuka, supaya tidak membebani waktu muat awal halaman.

## Struktur folder

```
src/
  types/             tipe data (Karoseri, Armada, Pengiriman, Barang, dll)
  lib/               utils.ts (helper umum), packing.ts (algoritma extreme-point)
  context/           AppDataContext — state global pengganti sementara backend
  components/ui/     primitif UI (button, card, table, select, dialog, badge, dll)
  components/layout/ Header, StepNav
  components/steps/  Step1Karoseri ... Step6Visualisasi
```

# Volumetrix - Intelligent Logistics & 3D Packing Engine

**Volumetrix** is an enterprise-grade backend architecture built to solve complex logistics and cargo packing problems. By combining deterministic mathematical 3D bin-packing algorithms with cognitive LLM reasoning (Hybrid AI Architecture), Volumetrix generates highly optimized fleet distribution strategies in seconds while dramatically reducing API token costs.

---

## 🚀 Key Features

1. **Hybrid AI Engine (Deterministic + Cognitive)**
   Instead of relying entirely on an LLM to guess 3D spatial constraints (which is slow, expensive, and prone to hallucinations), the system uses a mathematical Python backend (`py3dbp`) to brute-force all possible fleet permutations. Only the top-3 mathematically guaranteed strategies are sent to the **Groq LLM** for qualitative reasoning (Pros, Cons, Summaries).
   
2. **Server-Sent Events (SSE) Streaming**
   Provides a real-time conversational UX by streaming the AI's thought process directly to the frontend, eliminating blank loading screens during heavy computations.

3. **Multi-Fleet Auto Splitting**
   Intelligently splits a single massive shipment into multiple sub-shipments (e.g., splitting 100 items into 2 Fuso Trucks) automatically inside the PostgreSQL database.

4. **3D Spatial Visualizer API**
   Outputs precise Cartesian 3D coordinates `(X, Y, Z)` and rotation constraints (`orientable`, `fragility`) for every packed item, fully ready to be rendered by Three.js or React Three Fiber.

---

## 🛠️ Technology Stack

- **Framework**: FastAPI (Python 3.10+)
- **Database**: PostgreSQL (via Supabase)
- **ORM**: SQLModel
- **AI Orchestration**: LangGraph
- **LLM Provider**: Groq API
- **3D Packing Math**: py3dbp
- **Containerization**: Docker & Docker Compose

---

## ⚙️ Installation & Setup

### Prerequisites
- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/) & Docker Compose (Recommended) 
- OR Python 3.10+ (If running manually without Docker)

### 1. Clone the Repository
```bash
git clone https://github.com/Tukang-Timpa/volumetrix.git
cd volumetrix
git checkout agent
```

### 2. Environment Variables
Create a `.env` file in the **root directory** by copying `.env.example`:
```bash
# On Windows
copy .env.example .env
# On Mac/Linux
cp .env.example .env
```
Then, open the `.env` file and fill in your API keys:
```bash
# File: .env

# Supabase PostgreSQL Connection String
DATABASE_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

# Groq API Key for LLM Reasoning
GROQ_API_KEY="gsk_your_groq_api_key_here"
```

---

### 3. Running the App (Backend + Frontend)

#### Option A: Using Docker (Highly Recommended)
This is the easiest way to run the entire stack (Frontend, Backend, and Ngrok) with a single command.

Run the following command from the **root directory** (`volumetrix/`):
```bash
docker compose up --build -d
```
* The **Frontend** will be accessible at `http://localhost:5173`
* The **Backend** will be accessible at `http://localhost:8001`
* The **Ngrok Dashboard** will be accessible at `http://localhost:4040`

#### Option B: Manual Local Installation
If you need to debug or edit the python code directly:

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Virtual Environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8001 --reload
   ```

---

## 🔗 Frontend Integration Workflow

For Frontend developers integrating this API, here is the standard operational flow:

1. **Fetch Master Data**
   `GET /pengiriman/` (Fetch pending shipments)
   `GET /armada/` (Fetch available fleets)
   
2. **Stream AI Strategy (SSE)**
   Connect via `EventSource` to `GET /pengiriman/{id}/strategize`.
   Listen to the streamed texts for UI loaders. When `step == 'done'`, parse the JSON `data` to display the 3 AI Strategy Cards (Rank, Score, Cost, Pros, Cons).

3. **Execute Chosen Strategy**
   `POST /pengiriman/{id}/execute-strategy`
   Body: `{ "strategy_label": "...", "armada_sequence": [...] }`
   *This automatically creates sub-shipments in the database.*

4. **Render 3D Packing Visualization**
   `GET /pengiriman/{sub_id}/visualisation`
   Pass the returned `panjang, lebar, tinggi` to your 3D Geometry sizes, and `posisi_x, posisi_y, posisi_z` to the 3D mesh coordinates.

> **💡 Pro Tip for Frontend:** Open `test-console.html` in your browser. It contains a fully working reference implementation of SSE streaming, API fetching, and a complete **Three.js 3D Canvas Raycasting**! You can inspect its source code to see exactly how to connect to the backend.

---
*Built for Hackathon Excellence.* 🏆
