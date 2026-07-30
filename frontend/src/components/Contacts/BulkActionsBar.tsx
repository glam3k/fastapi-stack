import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Download, Trash2 } from "lucide-react"
import { useState } from "react"

import type { ContactPublic } from "@/client"
import { ContactsService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

interface BulkActionsBarProps {
  selectedContacts: ContactPublic[]
  onClear: () => void
}

const BulkActionsBar = ({
  selectedContacts,
  onClear,
}: BulkActionsBarProps) => {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const ids = selectedContacts.map((c) => c.id)
      await ContactsService.bulkDeleteContacts({ requestBody: ids })
    },
    onSuccess: () => {
      showSuccessToast(
        `${selectedContacts.length} contact${selectedContacts.length > 1 ? "s" : ""} deleted successfully`,
      )
      setDeleteOpen(false)
      onClear()
    },
    onError: handleError.bind(showErrorToast) as any,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
    },
  })

  const handleExport = async (format: "csv" | "json") => {
    try {
      const result = await ContactsService.exportContacts({
        requestBody: { ids: selectedContacts.map((c) => c.id), format },
      })
      const content =
        format === "csv"
          ? (result as unknown as string)
          : JSON.stringify(result, null, 2)
      const blob = new Blob([content], {
        type: format === "csv" ? "text/csv" : "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `contacts.${format}`
      a.click()
      URL.revokeObjectURL(url)
      showSuccessToast(`Exported ${selectedContacts.length} contacts as ${format.toUpperCase()}`)
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : "Export failed")
    }
  }

  if (selectedContacts.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border rounded-md">
      <span className="text-sm text-muted-foreground mr-1">
        {selectedContacts.length} selected
      </span>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Contacts</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedContacts.length} contact{selectedContacts.length > 1 ? "s" : ""}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {selectedContacts.map((c) => (
              <p key={c.id} className="text-sm text-muted-foreground">
                {c.name}
              </p>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={deleteMutation.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending
                ? "Deleting..."
                : `Delete ${selectedContacts.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
        <Download className="h-4 w-4 mr-1" />
        Export CSV
      </Button>
    </div>
  )
}

export default BulkActionsBar
