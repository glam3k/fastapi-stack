import type { ColumnDef } from "@tanstack/react-table"

import type { ItemPublic } from "@/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ItemActionsMenu } from "./ItemActionsMenu"

export const columns: ColumnDef<ItemPublic>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7">
          {row.original.photo_url ? (
            <img
              src={row.original.photo_url}
              alt={row.original.title}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <AvatarFallback className="text-xs bg-muted-foreground/20">
              {row.original.title.charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <span className="font-medium">{row.original.title}</span>
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const description = row.original.description
      return (
        <span
          className={cn(
            "max-w-xs truncate block text-muted-foreground",
            !description && "italic",
          )}
        >
          {description || "No description"}
        </span>
      )
    },
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
        <ItemActionsMenu item={row.original} />
      </div>
    ),
  },
]
