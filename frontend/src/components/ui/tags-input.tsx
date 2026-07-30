import { X } from "lucide-react"
import { type KeyboardEvent, useEffect, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"

interface TagSuggestion {
  name: string
  count: number
}

interface TagsInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  suggestions?: TagSuggestion[]
}

export function TagsInput({
  value = [],
  onChange,
  placeholder = "Type and press Enter...",
  suggestions,
}: TagsInputProps) {
  const [inputValue, setInputValue] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered =
    inputValue.trim() && suggestions
      ? suggestions.filter(
          (s) =>
            s.name.toLowerCase().includes(inputValue.toLowerCase()) &&
            !value.includes(s.name),
        )
      : []

  const selectSuggestion = (tag: string) => {
    if (!value.includes(tag)) {
      onChange([...value, tag])
    }
    setInputValue("")
    setShowSuggestions(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      const tag = inputValue.trim()
      if (tag && !value.includes(tag)) {
        onChange([...value, tag])
      }
      setInputValue("")
      setShowSuggestions(false)
    }
    if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1))
    }
    if (e.key === "Escape") {
      setShowSuggestions(false)
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag))
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full outline-none hover:bg-muted-foreground/20"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setShowSuggestions(true)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-md">
          {filtered.map((tag) => (
            <button
              key={tag.name}
              type="button"
              onClick={() => selectSuggestion(tag.name)}
              className="flex items-center justify-between w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors"
            >
              <span>{tag.name}</span>
              <span className="text-xs text-muted-foreground">{tag.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
