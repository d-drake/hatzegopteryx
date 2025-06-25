import os
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base
import models
from routers import items, cd_data, spc_limits

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    integrations=[
        FastApiIntegration(),
        SqlalchemyIntegration(),
    ],
    traces_sample_rate=1.0,
    profiles_sample_rate=1.0,
)

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