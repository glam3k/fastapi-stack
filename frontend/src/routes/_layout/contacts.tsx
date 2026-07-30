import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Download, FileJson, FileSpreadsheet, Search, X } from "lucide-react"
import { Suspense, useState, useCallback, useMemo } from "react"

import { ContactsService } from "@/client"
import type { ContactPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable } from "@/components/Common/DataTable"
import AddContact from "@/components/Contacts/AddContact"
import ImportContactsDialog from "@/components/Contacts/ImportContactsDialog"
import BulkActionsBar from "@/components/Contacts/BulkActionsBar"
import { ContactProfileSidebar } from "@/components/Contacts/ContactProfileSidebar"
import { columns } from "@/components/Contacts/columns"
import EditContact from "@/components/Contacts/EditContact"
import { Input } from "@/components/ui/input"
import PendingItems from "@/components/Pending/PendingItems"

export const Route = createFileRoute("/_layout/contacts")({
  component: Contacts,
  head: () => ({
    meta: [
      {
        title: "Contacts - JCRM",
      },
    ],
  }),
})

function ContactsTableContent() {
  const [searchInput, setSearchInput] = useState("")
  const [committedSearch, setCommittedSearch] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | undefined>()
  const [tagFilterInput, setTagFilterInput] = useState("")
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<ContactPublic | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedRows, setSelectedRows] = useState<ContactPublic[]>([])

  const { data: contacts } = useSuspenseQuery({
    queryKey: ["contacts", committedSearch, selectedTag],
    queryFn: () =>
      ContactsService.readContacts({
        skip: 0,
        limit: 100,
        search: committedSearch || undefined,
        tag: selectedTag || undefined,
      }),
  })

  const filtered = useMemo(() => {
    if (!committedSearch && !selectedTag) {
      if (!searchInput.trim()) return contacts.data
      const q = searchInput.toLowerCase()
      return contacts.data.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.category && c.category.toLowerCase().includes(q)) ||
          (c.tags && c.tags.some((t) => t.toLowerCase().includes(q))) ||
          (c.notes && c.notes.toLowerCase().includes(q)),
      )
    }
    return contacts.data
  }, [contacts.data, committedSearch, selectedTag, searchInput])

  const handleSearch = () => {
    setCommittedSearch(searchInput)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const totalCount = committedSearch || selectedTag ? contacts.count : contacts.data.length

  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of contacts.data) {
      for (const t of c.tags || []) {
        counts.set(t, (counts.get(t) || 0) + 1)
      }
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [contacts.data])

  const handleRowClick = (contact: ContactPublic) => {
    setSelectedContact(contact)
    setSidebarOpen(true)
  }

  const handleEditFromSidebar = (contact: ContactPublic) => {
    setSelectedContact(contact)
    setSidebarOpen(false)
    setEditOpen(true)
  }

  const handleSelectionChange = useCallback((rows: ContactPublic[]) => {
    setSelectedRows(rows)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedRows([])
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} variant="secondary">
          Search
        </Button>
        {committedSearch && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchInput("")
              setCommittedSearch("")
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Filter by tag..."
              value={tagFilterInput}
              onChange={(e) => setTagFilterInput(e.target.value)}
              onFocus={() => setTagDropdownOpen(true)}
              className="h-9 w-48 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {tagDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setTagDropdownOpen(false)}
                />
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-md max-h-48 overflow-y-auto">
                  {allTags
                    .filter((t) =>
                      t.name
                        .toLowerCase()
                        .includes(tagFilterInput.toLowerCase()),
                    )
                    .map((t) => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => {
                          setSelectedTag(
                            selectedTag === t.name ? undefined : t.name,
                          )
                          setTagDropdownOpen(false)
                          setTagFilterInput("")
                        }}
                        className="flex items-center justify-between w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors"
                      >
                        <span>{t.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {t.count}
                        </span>
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
          {selectedTag && (
            <Badge variant="default" className="gap-1">
              {selectedTag}
              <button
                type="button"
                onClick={() => setSelectedTag(undefined)}
                className="rounded-full outline-none hover:bg-primary-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
      {totalCount === 0 && !committedSearch && !searchInput && !selectedTag ? (
        <div className="flex flex-col items-center justify-center text-center py-12">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">
            You don't have any contacts yet
          </h3>
          <p className="text-muted-foreground">
            Add a new contact to get started
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No contacts match</h3>
          <p className="text-muted-foreground">
            Try a different search term
          </p>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={filtered}
            onRowClick={handleRowClick}
            selectable
            onSelectionChange={handleSelectionChange}
            getRowId={(row) => row.id}
          />
          <BulkActionsBar
            selectedContacts={selectedRows}
            onClear={handleClearSelection}
          />
        </>
      )}
      <ContactProfileSidebar
        contact={selectedContact}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        onEdit={handleEditFromSidebar}
      />
      <EditContact
        contact={selectedContact}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  )
}

function ContactsTable() {
  return (
    <Suspense fallback={<PendingItems />}>
      <ContactsTableContent />
    </Suspense>
  )
}

function Contacts() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">
            Create and manage your contacts
          </p>
        </div>
        <div className="flex gap-2">
          <ImportContactsDialog />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={async () => {
                  const result = await ContactsService.exportContacts({
                    requestBody: { format: "csv" },
                  })
                  const blob = new Blob([result as unknown as string], {
                    type: "text/csv",
                  })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = "contacts.csv"
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  const result = await ContactsService.exportContacts({
                    requestBody: { format: "json" },
                  })
                  const blob = new Blob([JSON.stringify(result, null, 2)], {
                    type: "application/json",
                  })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = "contacts.json"
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                <FileJson className="mr-2 h-4 w-4" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <AddContact />
        </div>
      </div>
      <ContactsTable />
    </div>
  )
}
