from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

ORIGIN = "http://localhost:5173"


def make_client(tmp_path, origins):
    settings = Settings(database_url=f"sqlite:///{tmp_path / 'cors.db'}", cors_origins=origins)
    return TestClient(create_app(settings))


def test_allowed_origin_gets_header(client):
    response = client.get("/docs", headers={"Origin": ORIGIN})
    assert response.headers["access-control-allow-origin"] == ORIGIN


def test_preflight_succeeds(client):
    response = client.options(
        "/api/v1/boards",
        headers={
            "Origin": ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ORIGIN
    assert "POST" in response.headers["access-control-allow-methods"]
    assert "*" not in response.headers["access-control-allow-methods"]


def test_other_origin_gets_no_header(client):
    response = client.get("/docs", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in response.headers


def test_cors_origins_override(tmp_path, monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://a.example, http://b.example")
    from app.config import get_settings

    settings = get_settings()
    assert settings.cors_origins == ["http://a.example", "http://b.example"]
    with make_client(tmp_path, settings.cors_origins) as client:
        for origin in settings.cors_origins:
            response = client.get("/docs", headers={"Origin": origin})
            assert response.headers["access-control-allow-origin"] == origin
        response = client.get("/docs", headers={"Origin": ORIGIN})
        assert "access-control-allow-origin" not in response.headers


def test_wildcard_origin_is_refused(monkeypatch):
    import pytest

    from app.config import get_settings

    monkeypatch.setenv("CORS_ORIGINS", "*")
    with pytest.raises(ValueError):
        get_settings()


def test_default_origin(monkeypatch):
    from app.config import get_settings

    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    assert get_settings().cors_origins == [ORIGIN]
