from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base
import models
from routers import items, cd_data, spc_limits

Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(
    title="Fullstack App API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(items.router, prefix="/api/items", tags=["items"])
app.include_router(cd_data.router, prefix="/api/cd-data", tags=["cd-data"])
app.include_router(spc_limits.router, prefix="/api/spc-limits", tags=["spc-limits"])

@app.get("/")
async def root():
    return {"message": "Welcome to the Fullstack App API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}