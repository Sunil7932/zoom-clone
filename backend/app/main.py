"""FastAPI application entry point.

Wires together CORS, the REST routers and the WebSocket signaling endpoint,
creates tables and seeds sample data on startup.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .database import Base, engine
from .routers import meetings, signaling
from .seed import run_seed

# Reject oversized request bodies early (defends against memory-exhaustion).
MAX_BODY_BYTES = 256 * 1024  # 256 KB is ample for JSON meeting payloads


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables (simple/idempotent; use Alembic for real migrations).
    Base.metadata.create_all(bind=engine)
    if settings.SEED_ON_STARTUP:
        run_seed()
    yield


app = FastAPI(
    title="Zoom Clone API",
    version="1.0.0",
    description="Backend for a video conferencing platform: meetings, scheduling "
    "and WebRTC signaling.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",  # allow Vercel preview deploys
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    """Reject requests whose declared body exceeds MAX_BODY_BYTES."""
    cl = request.headers.get("content-length")
    if cl is not None:
        try:
            if int(cl) > MAX_BODY_BYTES:
                return JSONResponse(
                    status_code=413, content={"detail": "Request body too large"}
                )
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length"})
    return await call_next(request)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Return a generic error to clients; never leak stack traces or internals."""
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(meetings.router)
app.include_router(signaling.router)


@app.get("/", tags=["health"])
def health():
    return {"status": "ok", "service": "zoom-clone-api"}


@app.get("/api/me", tags=["users"])
def me():
    """Return the default 'logged-in' user (auth is out of scope per the brief)."""
    from .database import SessionLocal
    from . import crud, schemas

    db = SessionLocal()
    try:
        user = crud.get_default_user(db)
        return schemas.UserOut.model_validate(user).model_dump()
    finally:
        db.close()
