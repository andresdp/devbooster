import re
from pathlib import Path

CONTRACT_MD = Path(__file__).resolve().parents[2] / "specs/001-kanban-ticketing/contracts/api.md"


def documented_operations() -> set[tuple[str, str]]:
    """(method, path) pairs from the endpoint table of contracts/api.md."""
    rows = re.findall(r"^\| (GET|POST|PATCH) \| `([^`]+)` \|", CONTRACT_MD.read_text(), re.M)
    return {(method.lower(), path) for method, path in rows}


def test_docs_page_is_served(client):
    response = client.get("/docs")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_openapi_lists_every_documented_operation(client):
    document = client.get("/openapi.json").json()
    served = {
        (method, path.removeprefix("/api/v1"))
        for path, operations in document["paths"].items()
        for method in operations
    }
    assert all(path.startswith("/api/v1/") for path in document["paths"])
    expected = documented_operations()
    assert len(expected) == 10
    assert served == expected
