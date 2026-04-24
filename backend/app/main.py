from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.routers.agents import router as agents_router
from app.routers.dashboard import router as dashboard_router
from app.routers.dataset import router as dataset_router
from app.services.data_service import data_service


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    data_service.scan_datasets()
    yield


app = FastAPI(title="Talking BI Dashboard Generator", version="1.0.0", lifespan=lifespan)

default_allowed_origins = "http://localhost:3000,http://127.0.0.1:3000"
allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", default_allowed_origins)
allowed_origins = [o.strip() for o in allowed_origins_raw.split(",") if o.strip()]
allowed_origin_regex = os.getenv("ALLOWED_ORIGIN_REGEX", r"https://.*\.vercel\.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allowed_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard_router)
app.include_router(agents_router)
app.include_router(dataset_router)

# pinger to check if the server is alive
@app.get("/ping")
async def ping():
    return {"status": "alive"}
