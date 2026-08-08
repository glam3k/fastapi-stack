import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Rocket } from "lucide-react"
import { useState } from "react"

import { JobsService } from "@/client"
import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "Dashboard",
      },
    ],
  }),
})

function Dashboard() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [enqueueError, setEnqueueError] = useState<string | null>(null)

  const enqueueMutation = useMutation({
    mutationFn: () => JobsService.enqueueHelloWorld({ requestBody: {} }),
    onSuccess: () => {
      setEnqueueError(null)
      queryClient.invalidateQueries({ queryKey: ["jobs", "runs"] })
    },
    onError: () => setEnqueueError("Failed to enqueue the job"),
  })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl truncate max-w-sm">
          Hi, {currentUser?.full_name || currentUser?.email} 👋
        </h1>
        <p className="text-muted-foreground">
          Welcome back, nice to see you again!!!
        </p>
      </div>
      <div className="flex flex-col gap-2 max-w-sm">
        {enqueueError && (
          <span className="text-sm text-destructive">{enqueueError}</span>
        )}
        <Button
          variant="outline"
          onClick={() => enqueueMutation.mutate()}
          disabled={enqueueMutation.isPending}
        >
          <Rocket
            className={enqueueMutation.isPending ? "animate-pulse" : undefined}
          />
          Run Hello World
        </Button>
        <p className="text-xs text-muted-foreground">
          Enqueues a HelloWorld background job owned by you. See it run on the
          Jobs page.
        </p>
      </div>
    </div>
  )
}
