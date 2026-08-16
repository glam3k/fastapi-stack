import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { type ApiKeyPublic, ApiKeysService } from "@/client"
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
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

export function ApiKeys() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [name, setName] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  const { data: keys } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => ApiKeysService.listApiKeys(),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["api-keys"] })

  const create = useMutation({
    mutationFn: () =>
      ApiKeysService.createApiKey({ requestBody: { name: name.trim() } }),
    onSuccess: (key) => {
      showSuccessToast("API key created — copy it now, it won't be shown again")
      setCreatedKey(key.key)
      setName("")
      invalidate()
    },
    onError: handleError.bind(showErrorToast),
  })

  const revoke = useMutation({
    mutationFn: (id: string) => ApiKeysService.revokeApiKey({ apiKeyId: id }),
    onSuccess: () => {
      showSuccessToast("API key revoked")
      invalidate()
    },
    onError: handleError.bind(showErrorToast),
  })

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      showSuccessToast("Copied to clipboard")
    } catch {
      showErrorToast("Could not copy to clipboard")
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Create API key</CardTitle>
          <CardDescription>
            Long-lived tokens for external apps. Send as{" "}
            <code>Authorization: Bearer &lt;key&gt;</code>. Keys act as your
            user, so treat them like passwords.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. my-weather-bot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) create.mutate()
              }}
            />
            <Button
              onClick={() => create.mutate()}
              disabled={!name.trim() || create.isPending}
            >
              Create key
            </Button>
          </div>

          {createdKey && (
            <div className="mt-3 rounded-md border p-3">
              <p className="text-sm font-medium">Your new key</p>
              <p className="mt-1 font-mono text-xs break-all">{createdKey}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                This is the only time it is shown. Store it somewhere safe.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => copyKey(createdKey)}
              >
                Copy
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your API keys</CardTitle>
          <CardDescription>
            Revoked keys can no longer authenticate but are kept for the audit
            trail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keys && keys.length > 0 ? (
            <ul className="space-y-2">
              {keys.map((key: ApiKeyPublic) => (
                <li
                  key={key.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{key.name}</span>
                    {key.revoked_at && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        revoked
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground">
                      created{" "}
                      {key.created_at
                        ? new Date(key.created_at).toLocaleDateString()
                        : "unknown"}
                    </p>
                  </div>
                  {!key.revoked_at && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revoke.mutate(key.id!)}
                      disabled={revoke.isPending}
                    >
                      Revoke
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No API keys yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
