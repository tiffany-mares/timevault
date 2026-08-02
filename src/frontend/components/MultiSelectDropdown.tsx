import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { WireCheckbox } from "./WireCheckbox";
interface MultiSelectDropdownProps {
  label: string;
  placeholder?: string;
  options: { id: string; label: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onDeselectAll: (ids: string[]) => void;
  onClearAll: () => void;
}

export const MultiSelectDropdown = ({
    label, placeholder, options, selected, onToggle, onSelectAll, onDeselectAll, onClearAll,
}: MultiSelectDropdownProps) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!open) return;
      const handleClickOutside = (e: MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
          setOpen(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
    const allSelected = filtered.length > 0 && filtered.every(o => selected.has(o.id));

    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-body font-semibold uppercase tracking-wide text-muted-foreground">
            {label} {selected.size > 0 && <span className="normal-case font-normal">({selected.size} selected)</span>}
        </label>
        <div ref={wrapperRef} className="relative">
            <button
                className="w-full text-left text-sm bg-card border border-border rounded-sm px-3 py-2 text-muted-foreground outline-none hover:border-olive/50 hover:shadow-sm transition-all duration-200 flex items-center justify-between"
              onClick={() => setOpen(!open)}
            >
              <span>{selected.size > 0 ? `${selected.size} selected` : placeholder || `All ${label.toLowerCase()}`}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
            </button>
            {open && (
                <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-md shadow-lg">
                  <div className="p-2 border-b border-border">
                    <input
                        type="text"
                        placeholder={`Search ${label.toLowerCase()}…`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full text-xs font-body bg-transparent border border-border rounded px-2 py-1.5 outline-none focus:border-olive/60 placeholder:text-muted-foreground"
                        autoFocus
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                      <WireCheckbox
                        label={allSelected ? "Deselect All" : "Select All"}
                        checked={allSelected}
                        onChange={() => {
                            const ids = filtered.map(o => o.id);
                            allSelected ? onDeselectAll(ids) : onSelectAll(ids);
                        }}
                      />
                      <div className="border-b border-border my-1" />
                      {filtered.map(o => (
                        <WireCheckbox key={o.id} label={o.label} checked={selected.has(o.id)} onChange={() => onToggle(o.id)} />
                      ))}
                  </div>
                </div>
            )}
        </div>
        {selected.size > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
              {Array.from(selected).map(id => {
                const opt = options.find(o => o.id === id);
                return (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-body bg-olive/10 text-olive border border-olive/20 rounded-sm">
                      {opt?.label ?? id}
                      <button type="button" onClick={() => onToggle(id)} className="hover:text-rust transition-colors">×</button>
                    </span>
                );
              })}
              <button type="button" onClick={onClearAll} className="text-xs text-muted-foreground hover:text-rust transition-colors">Clear all</button>
          </div>
        )}
      </div>
    );
};
