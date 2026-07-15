import { MoreVertical } from "lucide-react"
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
import EditContact from "./EditContact"

interface ContactActionsMenuProps {
  contact: ContactPublic
}

export function ContactActionsMenu({ contact }: ContactActionsMenuProps) {
  const [editOpen, setEditOpen] = useState(false)

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
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            Edit Contact
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>View Interaction History</DropdownMenuItem>
          <DropdownMenuItem>Send Message</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditContact
        contact={contact}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}
