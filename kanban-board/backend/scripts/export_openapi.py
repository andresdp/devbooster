"""Write the app's OpenAPI document to the committed contract file."""

import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
CONTRACT_PATH = BACKEND_DIR.parent / "specs/001-kanban-ticketing/contracts/openapi.json"

sys.path.insert(0, str(BACKEND_DIR))

from app.config import Settings  # noqa: E402
from app.main import create_app  # noqa: E402


def build_openapi() -> dict:
    app = create_app(Settings(database_url="sqlite://", cors_origins=[]))
    return app.openapi()


def render(document: dict) -> str:
    return json.dumps(document, indent=2, sort_keys=True) + "\n"


if __name__ == "__main__":
    CONTRACT_PATH.write_text(render(build_openapi()))
    print(f"Wrote {CONTRACT_PATH}")
