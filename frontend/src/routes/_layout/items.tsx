import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react"
import { Suspense, useMemo, useState } from "react"

import { type ItemPublic, ItemsService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import AddItem from "@/components/Items/AddItem"
import { columns } from "@/components/Items/columns"
import PendingItems from "@/components/Pending/PendingItems"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const Route = createFileRoute("/_layout/items")({
  component: Items,
  head: () => ({
    meta: [
      {
        title: "Items",
      },
    ],
  }),
})

function ItemsTableContent() {
  const [searchInput, setSearchInput] = useState("")
  const [committedSearch, setCommittedSearch] = useState("")
  const [tagMode, setTagMode] = useState<"include" | "exclude">("include")
  const [includeTags, setIncludeTags] = useState<string[]>([])
  const [excludeTags, setExcludeTags] = useState<string[]>([])
  const [tagFilterInput, setTagFilterInput] = useState("")
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false)
  const [sortBy, setSortBy] = useState("created_desc")
  const [page, setPage] = useState(0)
  const pageSize = 25

  const { data: items } = useSuspenseQuery({
    queryKey: [
      "items",
      committedSearch,
      includeTags,
      excludeTags,
      sortBy,
      page,
    ],
    queryFn: () =>
      ItemsService.readItems({
        skip: page * pageSize,
        limit: pageSize,
        search: committedSearch || undefined,
        includeTags: includeTags.length ? includeTags.join(",") : undefined,
        excludeTags: excludeTags.length ? excludeTags.join(",") : undefined,
        sort: sortBy || undefined,
      }),
  })

  const totalPages = Math.max(1, Math.ceil(items.count / pageSize))

  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items.data) {
      for (const t of item.tags || []) {
        counts.set(t, (counts.get(t) || 0) + 1)
      }
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [items.data])

  // Frontend-only filtering on the loaded page while typing.
  const filtered = useMemo(() => {
    let list: ItemPublic[] = items.data
    const q = searchInput.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (item) =>
          (item.title ?? "").toLowerCase().includes(q) ||
          (item.description ?? "").toLowerCase().includes(q) ||
          (item.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      )
    }
    return list
  }, [items.data, searchInput])

  const handleSearch = () => {
    setCommittedSearch(searchInput.trim())
    setPage(0)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const toggleTag = (
    list: string[],
    setter: (v: string[]) => void,
    tag: string,
  ) => {
    setter(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag])
  }

  const handleTagSelect = (tag: string) => {
    if (tagMode === "include") {
      toggleTag(includeTags, setIncludeTags, tag)
    } else {
      toggleTag(excludeTags, setExcludeTags, tag)
    }
    setTagFilterInput("")
    setPage(0)
  }

  const clearAllTags = () => {
    setIncludeTags([])
    setExcludeTags([])
    setPage(0)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items... (Enter to search server)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-9 pr-20"
          />
          <Button
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
            onClick={handleSearch}
          >
            Search
          </Button>
        </div>
        {(searchInput || committedSearch) && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchInput("")
              setCommittedSearch("")
              setPage(0)
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => setTagMode("include")}
              className={`h-7 rounded px-2 text-xs ${
                tagMode === "include"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Include
            </button>
            <button
              type="button"
              onClick={() => setTagMode("exclude")}
              className={`h-7 rounded px-2 text-xs ${
                tagMode === "exclude"
                  ? "bg-destructive text-destructive-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Exclude
            </button>
          </div>
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
                          handleTagSelect(t.name)
                          setTagDropdownOpen(false)
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
          {includeTags.map((tag) => (
            <Badge key={`inc-${tag}`} className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => toggleTag(includeTags, setIncludeTags, tag)}
                className="rounded-full outline-none hover:bg-primary-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {excludeTags.map((tag) => (
            <Badge key={`exc-${tag}`} variant="destructive" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => toggleTag(excludeTags, setExcludeTags, tag)}
                className="rounded-full outline-none hover:bg-destructive-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {(includeTags.length > 0 || excludeTags.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={clearAllTags}
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Select
          value={sortBy}
          onValueChange={(v) => {
            setSortBy(v)
            setPage(0)
          }}
        >
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_desc">Created ↓</SelectItem>
            <SelectItem value="created_asc">Created ↑</SelectItem>
            <SelectItem value="title_asc">Title ↑</SelectItem>
            <SelectItem value="title_desc">Title ↓</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {items.count === 0 &&
      !committedSearch &&
      includeTags.length === 0 &&
      excludeTags.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">
            You don't have any items yet
          </h3>
          <p className="text-muted-foreground">Add a new item to get started</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No items match</h3>
          <p className="text-muted-foreground">Try a different search term</p>
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={filtered} />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {filtered.length} of {items.count} item
              {items.count !== 1 ? "s" : ""}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ItemsTable() {
  return (
    <Suspense fallback={<PendingItems />}>
      <ItemsTableContent />
    </Suspense>
  )
}

function Items() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Items</h1>
          <p className="text-muted-foreground">Create and manage your items</p>
        </div>
        <AddItem />
      </div>
      <ItemsTable />
    </div>
  )
}
