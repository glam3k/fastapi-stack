import { format } from "date-fns"

import type { ContactPublic } from "@/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ContactDetailModalProps {
  contact: ContactPublic | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContactDetailModal({
  contact,
  open,
  onOpenChange,
}: ContactDetailModalProps) {
  if (!contact) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {contact.photo_url ? (
                <img
                  src={contact.photo_url}
                  alt={contact.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <AvatarFallback className="text-lg font-semibold bg-primary text-primary-foreground">
                  {contact.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <DialogTitle className="text-2xl font-bold">
                {contact.name}
              </DialogTitle>
              <DialogDescription>
                Contact details for {contact.email || "No email"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">ID</label>
              <p className="text-sm font-mono break-all">{contact.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Category</label>
              <p className="text-sm capitalize">{contact.category}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Phone</label>
              <p className="text-sm">{contact.phone || "Not provided"}</p>
            </div>
            <div>
               <label className="text-sm font-medium text-muted-foreground">Score</label>
              <p className="text-sm">{contact.relationship_strength || 500}/1000</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">First Met</label>
              <p className="text-sm">
                {contact.first_met ? format(new Date(contact.first_met), "PPPP") : "Not set"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-sm">
                {contact.created_at ? format(new Date(contact.created_at), "PPPP") : "Unknown"}
              </p>
            </div>
          </div>

          {contact.linkedin_url && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">LinkedIn</label>
              <a
                href={contact.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {contact.linkedin_url}
              </a>
            </div>
          )}

          {contact.facebook_url && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Facebook</label>
              <a
                href={contact.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {contact.facebook_url}
              </a>
            </div>
          )}

          {contact.notes && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Notes</label>
              <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}

          {contact.tags && contact.tags.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tags</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {contact.tags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
