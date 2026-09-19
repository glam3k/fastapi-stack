import { useMutation } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  Activity,
  ChevronDown,
  RefreshCw,
  Rocket,
  Search,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { JobsService, type RunOut } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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

const PAGE_SIZE = 50

function ScheduledSection() {
  const { user: currentUser } = useAuth()
  const [searchInput, setSearchInput] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [items, setItems] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const nextOffsetRef = useRef(0)
  const searchRef = useRef("")
  const tagRef = useRef<string | undefined>(undefined)

  const tag = currentUser?.is_superuser
    ? undefined
    : ownerTag(currentUser?.id ?? "")

  const loadItems = useCallback(
    async (replace = true) => {
      const setter = replace ? setLoading : setLoadingMore
      setter(true)
      try {
        const skip = replace ? 0 : nextOffsetRef.current
        const response = await (JobsService as any).listScheduledJobs({
          tag: tagRef.current,
          search: searchRef.current || undefined,
          skip,
          limit: PAGE_SIZE,
        })
        if (replace) {
          setItems(response.data)
        } else {
          setItems((prev) => [...prev, ...response.data])
        }
        setTotalCount(response.count)
        nextOffsetRef.current = skip + response.data.length
        setHasMore(skip + response.data.length < response.count)
      } catch (err) {
        console.error("Failed to load scheduled jobs:", err)
      } finally {
        setter(false)
      }
    },
    [],
  )

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) loadItems(false)
  }, [loadingMore, hasMore, loadItems])

  useEffect(() => {
    tagRef.current = tag
    searchRef.current = appliedSearch
    loadItems(true)
  }, [tag, appliedSearch, loadItems])

  useEffect(() => {
    const interval = setInterval(() => loadItems(true), 5000)
    return () => clearInterval(interval)
  }, [loadItems])

  return (
    <Card className="h-fit">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Scheduled Jobs</CardTitle>
            <CardDescription>
              Maintained jobs and when they run next
            </CardDescription>
          </div>
          <span className="text-xs text-muted-foreground">
            {totalCount} job{totalCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search scheduled jobs..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setAppliedSearch(searchInput.trim())
            }}
            className="pl-8 pr-16 h-8 text-sm"
          />
          <Button
            size="sm"
            className="absolute right-1 top-1/2 h-6 -translate-y-1/2 px-2 text-xs"
            onClick={() => setAppliedSearch(searchInput.trim())}
          >
            Search
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-full animate-pulse rounded-md bg-muted"
              />
            ))}
          </div>
        ) : items.length > 0 ? (
          <>
            {items.map((job: any) => (
              <div
                key={job.id ?? job.job}
                className="flex items-center justify-between gap-2 text-sm rounded-md px-2 py-1"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="secondary" className="shrink-0">
                    {job.status}
                  </Badge>
                  <span className="truncate">{shortName(job.job)}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {job.next_run_at
                    ? `next ${formatTime(job.next_run_at)}`
                    : "no next run"}
                </span>
              </div>
            ))}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  <ChevronDown
                    className={cn("h-4 w-4", loadingMore && "animate-pulse")}
                  />
                  {loadingMore
                    ? "Loading..."
                    : `Load More (${items.length} of ${totalCount})`}
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            No scheduled jobs
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function RunsSection() {
  const { user: currentUser } = useAuth()
  const [enqueueError, setEnqueueError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [items, setItems] = useState<RunOut[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const nextOffsetRef = useRef(0)
  const searchRef = useRef("")
  const tagRef = useRef<string | undefined>(undefined)

  const tag = currentUser?.is_superuser
    ? undefined
    : ownerTag(currentUser?.id ?? "")

  const loadItems = useCallback(
    async (replace = true) => {
      const setter = replace ? setLoading : setLoadingMore
      setter(true)
      try {
        const skip = replace ? 0 : nextOffsetRef.current
        const response = await JobsService.listRuns({
          tag: tagRef.current,
          search: searchRef.current || undefined,
          skip,
          limit: PAGE_SIZE,
        })
        if (replace) {
          setItems(response.data)
        } else {
          setItems((prev) => [...prev, ...response.data])
        }
        setTotalCount(response.count)
        nextOffsetRef.current = skip + response.data.length
        setHasMore(skip + response.data.length < response.count)
      } catch (err) {
        console.error("Failed to load runs:", err)
      } finally {
        setter(false)
      }
    },
    [],
  )

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) loadItems(false)
  }, [loadingMore, hasMore, loadItems])

  useEffect(() => {
    tagRef.current = tag
    searchRef.current = appliedSearch
    loadItems(true)
  }, [tag, appliedSearch, loadItems])

  useEffect(() => {
    const interval = setInterval(() => loadItems(true), 5000)
    return () => clearInterval(interval)
  }, [loadItems])

  const enqueueMutation = useMutation({
    mutationFn: () => JobsService.enqueueHelloWorld({ requestBody: {} }),
    onSuccess: () => {
      setEnqueueError(null)
      loadItems(true)
    },
    onError: () => setEnqueueError("Failed to enqueue the job"),
  })

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const run of items) {
      counts[run.status] = (counts[run.status] ?? 0) + 1
    }
    return counts
  }, [items])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount} run{totalCount !== 1 ? "s" : ""} · auto-refreshes every
          5s
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
            onClick={() => loadItems(true)}
            disabled={loading}
          >
            <RefreshCw
              className={cn("h-4 w-4", loading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search runs..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setAppliedSearch(searchInput.trim())
          }}
          className="pl-8 pr-16 h-8 text-sm"
        />
        <Button
          size="sm"
          className="absolute right-1 top-1/2 h-6 -translate-y-1/2 px-2 text-xs"
          onClick={() => setAppliedSearch(searchInput.trim())}
        >
          Search
        </Button>
      </div>

      {items.length > 0 && (
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

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 w-full animate-pulse rounded-md bg-muted"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
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
        <>
          <div className="space-y-2">
            {items.map((run: RunOut) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
              >
                <ChevronDown
                  className={cn("h-4 w-4", loadingMore && "animate-pulse")}
                />
                {loadingMore
                  ? "Loading..."
                  : `Load More (${items.length} of ${totalCount})`}
              </Button>
            </div>
          )}
        </>
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
      <ScheduledSection />
      <RunsSection />
    </div>
  )
}
