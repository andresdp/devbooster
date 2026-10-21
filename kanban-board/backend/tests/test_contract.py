import json

from scripts.export_openapi import CONTRACT_PATH, build_openapi, render


def test_committed_contract_matches_app():
    committed = json.loads(CONTRACT_PATH.read_text())
    assert committed == json.loads(render(build_openapi())), (
        "openapi.json is stale; run `uv run python scripts/export_openapi.py` and commit it"
    )


def test_error_statuses_document_the_error_body():
    document = build_openapi()
    for path, operations in document["paths"].items():
        for method, operation in operations.items():
            for status in ("404", "422"):
                response = operation["responses"].get(status)
                assert response is not None, f"{method.upper()} {path} lacks {status}"
                ref = response["content"]["application/json"]["schema"]["$ref"]
                assert ref.endswith("/ErrorResponse"), f"{method.upper()} {path} {status}"
