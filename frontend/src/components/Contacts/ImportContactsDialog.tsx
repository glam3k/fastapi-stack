import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Upload } from "lucide-react"
import { useRef, useState } from "react"

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

const ImportContactsDialog = () => {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<{
    created: number
    errors: { row: number; error: string }[]
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected")
      const formData = new FormData()
      formData.append("file", file)
      return ContactsService.importContacts({ formData } as any)
    },
    onSuccess: (data: any) => {
      setResult(data)
      if (data.created > 0) {
        showSuccessToast(`${data.created} contacts imported`)
        queryClient.invalidateQueries({ queryKey: ["contacts"] })
      }
    },
    onError: (err: any) => {
      showErrorToast(err.message || "Import failed")
    },
  })

  const handleClose = () => {
    setOpen(false)
    setFile(null)
    setResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Contacts</DialogTitle>
          <DialogDescription>
            Upload a CSV or JSON file with JCRM contact data.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Required field: <strong>name</strong></p>
              <p>Optional fields: email, phone, category, tags, linkedin_url, facebook_url, photo_url, relationship_strength, first_met, notes</p>
              <p>Supported formats: <strong>.csv</strong>, <strong>.json</strong></p>
            </div>

            <div
              className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <p className="text-sm font-medium">{file.name}</p>
              ) : (
                <>
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to select a file
                  </p>
                </>
              )}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={() => mutation.mutate()}
                disabled={!file || mutation.isPending}
              >
                {mutation.isPending ? "Importing..." : "Import"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">
              <span className="font-medium text-green-600">
                {result.created}
              </span>{" "}
              contacts imported successfully.
            </p>
            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">
                  {result.errors.length} error{result.errors.length > 1 ? "s" : ""}:
                </p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    Row {e.row}: {e.error}
                  </p>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ImportContactsDialog
