import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Activity, RefreshCw } from "lucide-react"
import { useCallback, useMemo, useState } from "react"

import { type JobOut, JobsService, type RunOut } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import useAuth from "@/hooks/useAuth"
import { ownerTag } from "@/lib/jobs"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_layout/jobs")({
  component: Jobs,
  head: () => ({
    meta: [
      {
        title: "Jobs",
      },
    ],
  }),
})

const runStatusVariant: Record<
  string,
  "default" | "secondary" | "destructive"
> = {
  succeeded: "default",
  ready: "secondary",
  running: "default",
  failed: "destructive",
  cancelled: "secondary",
}

const jobStatusVariant: Record<
  string,
  "default" | "secondary" | "destructive"
> = {
  active: "default",
  cancelled: "secondary",
}

function shortName(fqn: string): string {
  return fqn.split(".").pop() ?? fqn
}

function formatTime(value?: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleString()
}

function RunDetails({ run }: { run: RunOut }) {
  return (
    <div className="px-6 py-3 border-t">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant={runStatusVariant[run.status] ?? "secondary"}>
          {run.status}
        </Badge>
        {run.progress != null && (
          <span>progress {Math.round(run.progress * 100)}%</span>
        )}
        <span>started {formatTime(run.started_at)}</span>
        <span>finished {formatTime(run.finished_at)}</span>
        {run.error && (
          <span className="text-destructive">error: {run.error}</span>
        )}
      </div>
      {run.tasks && run.tasks.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {run.tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <Badge variant={runStatusVariant[task.status] ?? "secondary"}>
                {task.status}
              </Badge>
              <span>{task.task_name}</span>
              {task.error && (
                <span className="text-destructive">{task.error}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function JobsTableContent() {
  const { user: currentUser } = useAuth()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const {
    data: jobs,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["jobs"],
    queryFn: () =>
      JobsService.listJobs({
        tag: currentUser?.is_superuser
          ? undefined
          : ownerTag(currentUser?.id ?? ""),
      }),
    refetchInterval: 5000,
  })

  const toggle = useCallback((id: number | null) => {
    if (id == null) return
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const runCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const job of jobs ?? []) {
      for (const run of job.runs ?? []) {
        counts[run.status] = (counts[run.status] ?? 0) + 1
      }
    }
    return counts
  }, [jobs])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {jobs?.length ?? 0} job{(jobs?.length ?? 0) !== 1 ? "s" : ""} ·
          auto-refreshes every 5s
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {jobs && jobs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(runCounts).map(([status, count]) => (
            <Badge
              key={status}
              variant={runStatusVariant[status] ?? "secondary"}
            >
              {status}: {count}
            </Badge>
          ))}
        </div>
      )}

      {!jobs || jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Activity className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No jobs yet</h3>
          <p className="text-muted-foreground">
            Jobs will appear here once your app enqueues them
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job: JobOut) => (
            <Card key={job.id} className="overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(job.id)}
                className="w-full text-left"
              >
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        variant={jobStatusVariant[job.status] ?? "secondary"}
                      >
                        {job.status}
                      </Badge>
                      <CardTitle className="text-base truncate">
                        {shortName(job.job)}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline">{job.source}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(job.created_at)}
                      </span>
                    </div>
                  </div>
                  <CardDescription className="truncate">
                    {job.job}
                    {job.args && Object.keys(job.args).length > 0 && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {JSON.stringify(job.args)}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
              </button>
              {expanded.has(job.id ?? -1) &&
                job.runs?.map((run) => <RunDetails key={run.id} run={run} />)}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Jobs() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">
            Background jobs and their runs
          </p>
        </div>
      </div>
      <JobsTableContent />
    </div>
  )
}
