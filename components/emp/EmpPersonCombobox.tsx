"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type EmpComboboxPerson = {
  id: number;
  fullName: string;
  department?: string | null;
  jobTitle?: string | null;
};

/** Searchable person combobox — same pattern as hotel store item name. */
export function EmpPersonCombobox({
  people,
  valueIds,
  onChange,
  multiple = false,
  excludeIds = [],
  placeholder = "Select coworker…",
  emptyText = "No coworkers found.",
  searchPlaceholder = "Search by name, department…",
  className,
  triggerClassName,
}: {
  people: EmpComboboxPerson[];
  valueIds: number[];
  onChange: (ids: number[]) => void;
  multiple?: boolean;
  excludeIds?: number[];
  placeholder?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const exclude = useMemo(() => new Set(excludeIds), [excludeIds]);
  const selected = useMemo(() => new Set(valueIds), [valueIds]);

  const options = useMemo(() => {
    return people.filter((e) => {
      if (exclude.has(e.id) && !selected.has(e.id)) return false;
      return true;
    });
  }, [people, exclude, selected]);

  const filtered = useMemo(() => {
    if (!query) return options;
    return options.filter((e) => {
      const name = e.fullName.toLowerCase();
      const dept = String(e.department || "").toLowerCase();
      const job = String(e.jobTitle || "").toLowerCase();
      return (
        name.includes(query) || dept.includes(query) || job.includes(query)
      );
    });
  }, [options, query]);

  const selectedPeople = useMemo(
    () => people.filter((e) => selected.has(e.id)),
    [people, selected],
  );

  const toggle = (id: number) => {
    if (multiple) {
      if (selected.has(id)) onChange(valueIds.filter((x) => x !== id));
      else onChange([...valueIds, id]);
      return;
    }
    onChange(selected.has(id) ? [] : [id]);
    setOpen(false);
    setSearch("");
  };

  const triggerLabel = (() => {
    if (selectedPeople.length === 0) return null;
    if (!multiple) return selectedPeople[0]?.fullName || null;
    if (selectedPeople.length === 1) return selectedPeople[0]!.fullName;
    return `${selectedPeople.length} selected`;
  })();

  return (
    <div className={cn("space-y-2", className)}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-10 w-full min-w-0 justify-between border-cyan-500/20 bg-background/60 font-normal",
              triggerClassName,
            )}
          >
            <span
              className={cn(
                "min-w-0 truncate text-left",
                triggerLabel ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {triggerLabel || placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {filtered.length === 0 ? (
                <CommandEmpty>{emptyText}</CommandEmpty>
              ) : (
                <CommandGroup heading="Coworkers">
                  {filtered.map((e) => {
                    const isOn = selected.has(e.id);
                    const hint = e.department || e.jobTitle;
                    return (
                      <CommandItem
                        key={e.id}
                        value={`${e.id}-${e.fullName}`}
                        onSelect={() => toggle(e.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            isOn ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {e.fullName}
                          {hint ? (
                            <span className="text-muted-foreground">
                              {" "}
                              · {hint}
                            </span>
                          ) : null}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {multiple && selectedPeople.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-0.5">
          {selectedPeople.map((e) => (
            <Badge
              key={e.id}
              variant="secondary"
              className="gap-1 border-cyan-500/20 bg-cyan-500/10 pr-1 text-foreground"
            >
              <span className="max-w-36 truncate">{e.fullName}</span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted"
                aria-label={`Remove ${e.fullName}`}
                onClick={() => onChange(valueIds.filter((id) => id !== e.id))}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
