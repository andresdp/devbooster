from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import Engine, event
from sqlmodel import Session, SQLModel, create_engine

import app.models  # noqa: F401  (registers tables on SQLModel.metadata)


def make_engine(url: str) -> Engine:
    engine = create_engine(url, connect_args={"check_same_thread": False, "timeout": 30})

    @event.listens_for(engine, "connect")
    def _on_connect(dbapi_connection, _record):
        # Manual transaction control: BEGIN is emitted by the "begin" hook below.
        dbapi_connection.isolation_level = None
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=FULL")
        cursor.close()

    @event.listens_for(engine, "begin")
    def _on_begin(connection):
        if connection.get_execution_options().get("immediate"):
            connection.exec_driver_sql("BEGIN IMMEDIATE")
        else:
            connection.exec_driver_sql("BEGIN")

    return engine


def begin_write(session: Session) -> None:
    """Start the session's transaction as BEGIN IMMEDIATE so writers are serialized.

    A transaction already open on the session must be read-only (for example the one a
    `refresh` after an earlier commit opened); it is ended so the write can begin immediately.
    """
    if session.in_transaction():
        if session.new or session.dirty or session.deleted:
            raise RuntimeError("begin_write called with uncommitted changes on the session")
        session.rollback()
    session.connection(execution_options={"immediate": True})


def create_db_and_tables(engine: Engine) -> None:
    SQLModel.metadata.create_all(engine)


def get_session(request: Request) -> Iterator[Session]:
    with Session(request.app.state.engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]
