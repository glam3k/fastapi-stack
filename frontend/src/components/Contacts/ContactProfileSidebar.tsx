import { format } from "date-fns"
import { ExternalLink } from "lucide-react"

import type { ContactPublic } from "@/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface ContactProfileSidebarProps {
  contact: ContactPublic | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (contact: ContactPublic) => void
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getStrengthColor(strength: number) {
  if (strength >= 800) return "bg-green-500"
  if (strength >= 600) return "bg-emerald-500"
  if (strength >= 400) return "bg-blue-500"
  if (strength >= 200) return "bg-yellow-500"
  return "bg-gray-500"
}

export function ContactProfileSidebar({
  contact,
  open,
  onOpenChange,
  onEdit,
}: ContactProfileSidebarProps) {
  if (!contact) return null

  const strength = contact.relationship_strength || 500

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-0">
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
                  {getInitials(contact.name)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl truncate">{contact.name}</SheetTitle>
              <SheetDescription className="truncate">
                {contact.email || "No email"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 px-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {contact.category}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => onEdit(contact)}
            >
              Edit
            </Button>
          </div>

          <div className="space-y-3">
            {contact.phone && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{contact.phone}</span>
              </div>
            )}
            {contact.first_met && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">First Met</span>
                <span className="font-medium">
                  {format(new Date(contact.first_met), "MMM d, yyyy")}
                </span>
              </div>
            )}
            {contact.created_at && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Added</span>
                <span className="font-medium">
                  {format(new Date(contact.created_at), "MMM d, yyyy")}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">
              Score
            </span>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getStrengthColor(strength)}`}
                  style={{ width: `${strength / 10}%` }}
                />
              </div>
              <span className="text-sm font-medium tabular-nums">{strength}/1000</span>
            </div>
          </div>

          {(contact.linkedin_url || contact.facebook_url) && (
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Social Links</span>
              <div className="space-y-1">
                {contact.linkedin_url && (
                  <a
                    href={contact.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    LinkedIn
                  </a>
                )}
                {contact.facebook_url && (
                  <a
                    href={contact.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    Facebook
                  </a>
                )}
              </div>
            </div>
          )}

          {contact.tags && contact.tags.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Tags</span>
              <div className="flex flex-wrap gap-1.5">
                {contact.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {contact.notes && (
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Notes</span>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {contact.notes}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
