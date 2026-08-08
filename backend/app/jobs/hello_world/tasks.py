"""HelloWorld job tasks."""

from __future__ import annotations

import asyncio
import logging

from pyreljob import Task, TaskContext

logger = logging.getLogger("app.jobs.hello_world")


class SayHello(Task):
    """Print (well, log) a greeting. The archetypal hello-world task."""

    async def run(self, ctx: TaskContext) -> str:
        name = ctx.args.get("name", "world")
        logger.info("saying hello to %s", name)
        await asyncio.sleep(1)
        message = f"hello {name}"
        logger.info(message)
        return message
