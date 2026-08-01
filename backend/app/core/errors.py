import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app.errors")


class ApiError(Exception):
    """Base error with a machine-readable code and message."""

    def __init__(
        self,
        message: str,
        code: str = "API_ERROR",
        status_code: int = 400,
        details: list | dict | None = None,
    ) -> None:
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        super().__init__(message)


def error_response(
    status_code: int, code: str, message: str, details: list | dict | None = None
) -> JSONResponse:
    body = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
        },
    }
    if details is not None:
        body["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=body)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return error_response(
            status_code=exc.status_code,
            code="HTTP_ERROR",
            message=str(exc.detail),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        details = []
        for err in exc.errors():
            details.append(
                {
                    "field": ".".join(str(loc) for loc in err.get("loc", [])),
                    "message": err.get("msg", "Validation error"),
                    "type": err.get("type", "validation"),
                }
            )
        return error_response(
            status_code=422,
            code="VALIDATION_ERROR",
            message="Validation failed",
            details=details,
        )

    @app.exception_handler(ApiError)
    async def api_error_handler(request: Request, exc: ApiError):
        return error_response(
            status_code=exc.status_code,
            code=exc.code,
            message=exc.message,
            details=exc.details,
        )

    @app.exception_handler(Exception)
    async def catch_all_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception: %s", exc)
        return error_response(
            status_code=500,
            code="INTERNAL_ERROR",
            message="An unexpected error occurred",
        )
