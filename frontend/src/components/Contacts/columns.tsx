import type { ColumnDef } from "@tanstack/react-table"
import { User } from "lucide-react"

import type { ContactPublic } from "@/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ContactActionsMenu } from "./ContactActionsMenu"

function ScoreBar({ strength }: { strength: number }) {
  const getStrengthColor = (strength: number) => {
    if (strength >= 800) return "bg-green-500"
    if (strength >= 600) return "bg-emerald-500"
    if (strength >= 400) return "bg-blue-500"
    if (strength >= 200) return "bg-yellow-500"
    return "bg-gray-500"
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        <User className="size-4 text-muted-foreground mr-1" />
        <span className="text-sm font-medium">{strength}</span>
      </div>
      <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            getStrengthColor(strength),
          )}
          style={{ width: `${strength / 10}%` }}
        />
      </div>
    </div>
  )
}

export const columns: ColumnDef<ContactPublic>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7">
          {row.original.photo_url ? (
            <img
              src={row.original.photo_url}
              alt={row.original.name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <AvatarFallback className="text-xs bg-muted-foreground/20">
              {row.original.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const email = row.original.email
      return email ? (
        <span className="font-mono text-sm">{email}</span>
      ) : (
        <span className="text-muted-foreground text-sm">--</span>
      )
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const category = row.original.category
      const color =
        category === "professional"
          ? "blue"
          : category === "family"
            ? "green"
            : category === "friend"
              ? "purple"
              : "gray"
      return <Badge variant={color as any}>{category}</Badge>
    },
  },
  {
    accessorKey: "relationship_strength",
    header: "Score",
    cell: ({ row }) => (
      <ScoreBar
        strength={row.original.relationship_strength || 500}
      />
    ),
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => {
      const tags = row.original.tags || []
      if (tags.length === 0) return null
      return (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{tags.length - 3}
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <ContactActionsMenu contact={row.original} />
      </div>
    ),
  },
]
