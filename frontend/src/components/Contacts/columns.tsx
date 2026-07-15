import type { ColumnDef } from "@tanstack/react-table"
import { Check, Copy, User } from "lucide-react"

import type { ContactPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard"
import { cn } from "@/lib/utils"
import { ContactActionsMenu } from "./ContactActionsMenu"

function CopyId({ id }: { id: string }) {
  const [copiedText, copy] = useCopyToClipboard()
  const isCopied = copiedText === id

  return (
    <div className="flex items-center gap-1.5 group">
      <span className="font-mono text-xs text-muted-foreground">{id}</span>
      <Button
        variant="ghost"
        size="icon"
        className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => copy(id)}
      >
        {isCopied ? (
          <Check className="size-3 text-green-500" />
        ) : (
          <Copy className="size-3" />
        )}
        <span className="sr-only">Copy ID</span>
      </Button>
    </div>
  )
}

function RelationshipStrength({ strength }: { strength: number }) {
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
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <CopyId id={row.original.id} />,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
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
    header: "Strength",
    cell: ({ row }) => (
      <RelationshipStrength
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
