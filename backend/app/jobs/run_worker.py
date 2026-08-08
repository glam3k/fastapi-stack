"""Standalone pyreljob worker entrypoint.

Run as a separate process when ``JOBS_WORKER_ENABLED=false``::

    python -m app.jobs.run_worker

Runs the worker until interrupted (graceful drain on SIGINT/SIGTERM).
"""

from __future__ import annotations

from app.jobs.base import stop, worker


def main() -> None:
    w = worker()
    w.run_forever()


if __name__ == "__main__":
    try:
        main()
    finally:
        stop()
