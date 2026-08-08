from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.route_fleet import router as fleet_router

app = FastAPI(title="Volumetrix Backend Engine")

app.include_router(fleet_router, prefix="/api/fleet", tags=["Fleet"])