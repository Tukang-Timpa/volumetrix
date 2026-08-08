from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.routers import armada
from app.postgresql.database import init_db
from app.postgresql.schema import pengiriman

app = FastAPI(title="Volumetrix Backend API")

app.include_router(armada.router)

# On startup Event
@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
def root():
    return{"status": "ok", "service": "volumetrix-backend-api"}