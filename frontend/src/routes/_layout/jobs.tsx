import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Activity, RefreshCw, Rocket } from "lucide-react"
import { useMemo, useState } from "react"

import { JobsService, type RunOut } from "@/client"
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

const runSourceVariant: Record<string, "default" | "secondary"> = {
  on_demand: "secondary",
  scheduled: "default",
}

function shortName(fqn: string): string {
  return fqn.split(".").pop() ?? fqn
}

function formatTime(value?: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleString()
}

function RunCard({ run }: { run: RunOut }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant={runStatusVariant[run.status] ?? "secondary"}>
              {run.status}
            </Badge>
            <Badge variant={runSourceVariant[run.source] ?? "secondary"}>
              {run.source}
            </Badge>
            <CardTitle className="text-base truncate">
              {shortName(run.job)}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">
              {formatTime(run.created_at)}
            </span>
          </div>
        </div>
        <CardDescription className="truncate">
          {run.job}
          {run.args && Object.keys(run.args).length > 0 && (
            <span className="text-muted-foreground">
              {" "}
              · {JSON.stringify(run.args)}
            </span>
          )}
        </CardDescription>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground pt-1">
          {run.progress != null && (
            <span>progress {Math.round(run.progress * 100)}%</span>
          )}
          {run.worker_id && <span>worker {run.worker_id}</span>}
          <span>started {formatTime(run.started_at)}</span>
          <span>finished {formatTime(run.finished_at)}</span>
          {run.error && (
            <span className="text-destructive">error: {run.error}</span>
          )}
        </div>
      </CardHeader>
      {run.tasks && run.tasks.length > 0 && (
        <ul className="px-6 pb-3 space-y-1 text-sm">
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
    </Card>
  )
}

function RunsList() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [enqueueError, setEnqueueError] = useState<string | null>(null)

  const {
    data: runs,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["jobs", "runs"],
    queryFn: () =>
      JobsService.listRuns({
        tag: currentUser?.is_superuser
          ? undefined
          : ownerTag(currentUser?.id ?? ""),
      }),
    refetchInterval: 5000,
  })

  const enqueueMutation = useMutation({
    mutationFn: () => JobsService.enqueueHelloWorld({ requestBody: {} }),
    onSuccess: () => {
      setEnqueueError(null)
      queryClient.invalidateQueries({ queryKey: ["jobs", "runs"] })
    },
    onError: () => setEnqueueError("Failed to enqueue the job"),
  })

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const run of runs ?? []) {
      counts[run.status] = (counts[run.status] ?? 0) + 1
    }
    return counts
  }, [runs])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {runs?.length ?? 0} run{(runs?.length ?? 0) !== 1 ? "s" : ""} ·
          auto-refreshes every 5s
        </p>
        <div className="flex items-center gap-2">
          {enqueueError && (
            <span className="text-sm text-destructive">{enqueueError}</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => enqueueMutation.mutate()}
            disabled={enqueueMutation.isPending}
          >
            <Rocket
              className={cn(
                "h-4 w-4",
                enqueueMutation.isPending && "animate-pulse",
              )}
            />
            Run Hello World
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={cn("h-4 w-4", isFetching && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {runs && runs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <Badge
              key={status}
              variant={runStatusVariant[status] ?? "secondary"}
            >
              {status}: {count}
            </Badge>
          ))}
        </div>
      )}

      {!runs || runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Activity className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No runs yet</h3>
          <p className="text-muted-foreground">
            Runs will appear here once your app enqueues jobs
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((run: RunOut) => (
            <RunCard key={run.id} run={run} />
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
      <RunsList />
    </div>
  )
}
