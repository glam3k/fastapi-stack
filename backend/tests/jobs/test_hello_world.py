from pyreljob import JobStatus, RunStatus

from app.jobs import base
from app.jobs.hello_world.job import HelloWorld


def test_hello_world_job_runs() -> None:
    record = base.enqueue(HelloWorld(name="world"))
    assert record.id is not None

    base.run_pending()

    job = base.manager().get(record.id)
    assert job is not None
    assert job.status == JobStatus.ACTIVE

    runs = base.manager().runs(record.id)
    assert len(runs) == 1
    assert runs[0].status == RunStatus.SUCCEEDED
