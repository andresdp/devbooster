import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class ErrorDetail(BaseModel):
    field: str
    message: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody


class AppError(Exception):
    status_code = 500
    code = "internal_error"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class ConflictError(AppError):
    status_code = 409
    code = "conflict"


class InvalidMoveError(AppError):
    status_code = 422
    code = "invalid_move"


ERROR_RESPONSES: dict[int | str, dict] = {
    404: {"model": ErrorResponse, "description": "Not found"},
    409: {"model": ErrorResponse, "description": "Conflict"},
    422: {"model": ErrorResponse, "description": "Validation error or invalid move"},
    500: {"model": ErrorResponse, "description": "Unexpected failure"},
}


def error_response(
    status_code: int, code: str, message: str, details: list[dict] | None = None
) -> JSONResponse:
    body = ErrorResponse(error=ErrorBody(code=code, message=message, details=details))
    return JSONResponse(status_code=status_code, content=body.model_dump(mode="json"))


def _field_name(loc: tuple) -> str:
    parts = [str(part) for part in loc[1:]]
    return ".".join(parts) if parts else "body"


async def _app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return error_response(exc.status_code, exc.code, exc.message)


async def _validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    details = []
    for error in exc.errors():
        loc = tuple(error["loc"])
        if error["type"] == "json_invalid":
            loc = loc[:1]
        details.append({"field": _field_name(loc), "message": error["msg"]})
    return error_response(422, "validation_error", "Request validation failed", details)


async def _http_error_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    response = error_response(exc.status_code, "http_error", str(exc.detail))
    if exc.headers:
        response.headers.update(exc.headers)
    return response


async def _unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return error_response(500, "internal_error", "An unexpected error occurred")


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _app_error_handler)
    app.add_exception_handler(RequestValidationError, _validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, _http_error_handler)
    app.add_exception_handler(Exception, _unexpected_error_handler)
