import json

from scripts.export_openapi import CONTRACT_PATH, build_openapi, render


def test_committed_contract_matches_app():
    committed = json.loads(CONTRACT_PATH.read_text())
    assert committed == json.loads(render(build_openapi())), (
        "openapi.json is stale; run `uv run python scripts/export_openapi.py` and commit it"
    )


ERROR_STATUSES = ("404", "409", "422", "500")


def test_every_operation_declares_the_error_statuses():
    document = build_openapi()
    for path, operations in document["paths"].items():
        for method, operation in operations.items():
            missing = [s for s in ERROR_STATUSES if s not in operation["responses"]]
            assert not missing, f"{method.upper()} {path} lacks {missing}"


def test_error_statuses_document_the_error_body():
    document = build_openapi()
    for path, operations in document["paths"].items():
        for method, operation in operations.items():
            for status, response in operation["responses"].items():
                if status.startswith("2"):
                    continue
                ref = response["content"]["application/json"]["schema"]["$ref"]
                assert ref.endswith("/ErrorResponse"), f"{method.upper()} {path} {status}"
