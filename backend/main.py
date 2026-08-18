from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import armada, barang, karoseri, packing, pengiriman
from app.postgresql.database import init_db

app = FastAPI(title="Volumetrix Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(armada.router)
app.include_router(barang.router)
app.include_router(karoseri.router)
app.include_router(pengiriman.router)
app.include_router(packing.router)

# On startup Event
@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
def root():
    return{"status": "ok", "service": "volumetrix-backend-api"}