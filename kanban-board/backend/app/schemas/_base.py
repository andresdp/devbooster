from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints


class RequestModel(BaseModel):
    """Base for request bodies: strictly typed, unknown fields rejected."""

    model_config = ConfigDict(extra="forbid", strict=True)


def trimmed(max_length: int, min_length: int = 0):
    return Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=min_length, max_length=max_length),
    ]
