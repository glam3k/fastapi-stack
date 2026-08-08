"""The HelloWorld job — a durable pyreljob that greets someone.

Defined as a ``@dataclass`` whose fields are the job's parameters and whose
class-level ``tasks`` list declares the ordered tasks. Register it with the
worker via :func:`app.jobs.base.register` so the worker can resolve it from
the database by its fully qualified name.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import ClassVar

from pyreljob import Job

from app.jobs.base import register
from app.jobs.hello_world.tasks import SayHello


@dataclass
class HelloWorld(Job):
    name: str = "world"

    tasks: ClassVar = [SayHello]


register(HelloWorld)
