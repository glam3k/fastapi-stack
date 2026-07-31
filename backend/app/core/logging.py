import logging
import time
from typing import Callable

logger = logging.getLogger("app")
request_logger = logging.getLogger("app.request")

FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format=FORMAT,
    )
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


class RequestLoggingMiddleware:
    def __init__(self, app: Callable) -> None:
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start_time = time.perf_counter()

        async def send_with_logging(message) -> None:
            if message["type"] == "http.response.start":
                duration_ms = (time.perf_counter() - start_time) * 1000
                request_logger.info(
                    "%s %s -> %d (%.1fms)",
                    scope["method"],
                    scope["path"],
                    message["status"],
                    duration_ms,
                )
            await send(message)

        await self.app(scope, receive, send_with_logging)
