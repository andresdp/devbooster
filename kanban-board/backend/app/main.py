from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from app.config import Settings, get_settings
from app.db import create_db_and_tables, make_engine
from app.errors import register_exception_handlers
from app.routers import boards, comments, tickets
from app.seed import seed_if_empty


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    engine = make_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        create_db_and_tables(engine)
        if settings.seed_on_startup:
            with Session(engine) as session:
                seed_if_empty(session)
        yield
        engine.dispose()

    app = FastAPI(title="Kanban Ticketing API", version="1.0.0", lifespan=lifespan)
    app.state.engine = engine

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
        allow_headers=["Content-Type"],
    )
    register_exception_handlers(app)

    api = APIRouter(prefix="/api/v1")
    api.include_router(boards.router)
    api.include_router(tickets.router)
    api.include_router(comments.router)
    app.include_router(api)
    return app


app = create_app()
