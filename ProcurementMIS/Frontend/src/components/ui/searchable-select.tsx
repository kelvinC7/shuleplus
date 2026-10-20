"use client"

import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Check, ChevronDown } from "lucide-react"

export interface SearchableOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: SearchableOption[]
  placeholder?: string
  emptyMessage?: string
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  emptyMessage = "No results found.",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selected = options.find(o => o.value === value)
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button type="button"
            className="w-full rounded-lg border px-3 py-2 text-sm flex items-center justify-between transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        }
      >
        <span className={selected ? "" : "text-muted-foreground"}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`} />
      </PopoverTrigger>
      <PopoverContent className="w-[--anchor-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {filtered.map(opt => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => { onChange(opt.value); setOpen(false); setQuery("") }}
                >
                  <Check className={`h-4 w-4 ${value === opt.value ? "opacity-100" : "opacity-0"}`} />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
