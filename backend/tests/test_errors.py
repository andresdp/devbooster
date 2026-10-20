import pytest
from fastapi import APIRouter
from fastapi.testclient import TestClient
from pydantic import BaseModel, ConfigDict

from app.errors import ConflictError, InvalidMoveError, NotFoundError


class Payload(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    title: str
    count: int = 0


@pytest.fixture
def probe_app(app):
    """The test app plus throwaway routes that raise each error kind."""
    router = APIRouter(prefix="/api/v1/_probe")

    @router.get("/not-found")
    def not_found():
        raise NotFoundError("Ticket TKT-9 not found")

    @router.get("/conflict")
    def conflict():
        raise ConflictError("Board name already exists")

    @router.get("/invalid-move")
    def invalid_move():
        raise InvalidMoveError("Position out of range")

    @router.post("/validate")
    def validate(payload: Payload):
        return payload

    @router.get("/boom")
    def boom():
        raise RuntimeError("secret db detail")

    app.include_router(router)
    return app


@pytest.fixture
def probe(probe_app):
    with TestClient(probe_app, raise_server_exceptions=False) as client:
        yield client


def assert_error(response, status, code):
    assert response.status_code == status
    body = response.json()
    assert set(body) == {"error"}
    assert set(body["error"]) == {"code", "message", "details"}
    assert body["error"]["code"] == code
    assert body["error"]["message"]
    return body["error"]


def test_not_found_body(probe):
    error = assert_error(probe.get("/api/v1/_probe/not-found"), 404, "not_found")
    assert error["details"] is None
    assert "TKT-9" in error["message"]


def test_conflict_body(probe):
    error = assert_error(probe.get("/api/v1/_probe/conflict"), 409, "conflict")
    assert error["details"] is None


def test_invalid_move_body(probe):
    error = assert_error(probe.get("/api/v1/_probe/invalid-move"), 422, "invalid_move")
    assert error["details"] is None


def test_validation_error_names_the_field(probe):
    response = probe.post("/api/v1/_probe/validate", json={"count": 1})
    error = assert_error(response, 422, "validation_error")
    assert [d["field"] for d in error["details"]] == ["title"]
    assert all(d["message"] for d in error["details"])


def test_wrong_type_is_not_coerced(probe):
    response = probe.post("/api/v1/_probe/validate", json={"title": "x", "count": "1"})
    error = assert_error(response, 422, "validation_error")
    assert error["details"][0]["field"] == "count"


def test_unknown_field_is_rejected(probe):
    response = probe.post("/api/v1/_probe/validate", json={"title": "x", "extra": 1})
    error = assert_error(response, 422, "validation_error")
    assert error["details"][0]["field"] == "extra"


def test_invalid_json_body(probe):
    response = probe.post(
        "/api/v1/_probe/validate",
        content="{not json",
        headers={"Content-Type": "application/json"},
    )
    error = assert_error(response, 422, "validation_error")
    assert error["details"]


def test_unsupported_method_uses_same_body(probe):
    response = probe.delete("/api/v1/_probe/not-found")
    assert_error(response, 405, "http_error")


def test_unknown_route_uses_same_body(probe):
    assert_error(probe.get("/api/v1/nope"), 404, "http_error")


def test_unexpected_exception_is_generic(probe):
    response = probe.get("/api/v1/_probe/boom")
    error = assert_error(response, 500, "internal_error")
    assert error["details"] is None
    assert "secret db detail" not in response.text
    assert "Traceback" not in response.text
    assert "RuntimeError" not in response.text
