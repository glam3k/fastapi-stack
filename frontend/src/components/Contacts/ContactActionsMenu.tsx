import { MoreVertical, Eye, Trash2, Pencil } from "lucide-react"
import { useState } from "react"

import type { ContactPublic } from "@/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import DeleteContactDialog from "./DeleteContactDialog"
import EditContact from "./EditContact"
import { ContactDetailModal } from "./ContactDetailModal"

interface ContactActionsMenuProps {
  contact: ContactPublic
}

export function ContactActionsMenu({ contact }: ContactActionsMenuProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 data-[state=open]:bg-muted"
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem onClick={() => setDetailOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditContact
        contact={contact}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ContactDetailModal
        contact={contact}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      <DeleteContactDialog
        contact={contact}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
