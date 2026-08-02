import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Search, X } from "lucide-react";
interface WireDropdownProps {
    label?: string;
    value?: string;
    className?: string;
    options?: { value: string; label: string }[];
    onChange?: (value: string) => void;
    searchable?: boolean;
}

export const WireDropdown = ({ label, value = "Select option...", className, options, onChange, searchable = false }: WireDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (options && onChange && searchable) {
    const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
    const selectedLabel = options.find(o => o.value === value || o.label === value)?.label;
    const displayValue = selectedLabel && selectedLabel !== "Select..." ? selectedLabel : "Select...";

    return (
        <div className={cn("flex flex-col gap-1.5", className)} ref={ref}>
          {label && <label className="text-xs font-body font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>}
          <div className="relative">
              <button
                  type="button"
                onClick={() => setOpen(!open)}
                  className="w-full text-left flex items-center justify-between px-3 py-2 text-sm bg-card border border-border rounded-sm text-foreground hover:border-olive/50 hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-olive/40"
              >
                <span className={cn(displayValue === "Select..." && "text-muted-foreground")}>{displayValue}</span>
                <div className="flex items-center gap-1">
                    {displayValue !== "Select..." && (
                      <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onChange(""); setSearch(""); }}
                          className="hover:text-rust transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
                </div>
              </button>
              {open && (
                <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-md shadow-lg">
                  <div className="p-2 border-b border-border flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <input
                        type="text"
                        placeholder={`Search ${label?.toLowerCase() || "options"}…`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full text-xs font-body bg-transparent outline-none placeholder:text-muted-foreground"
                        autoFocus
                      />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-3 text-center">No results found</p>
                    ) : (
                        filtered.map((opt) => (
                            <button
                              key={opt.value}
                                type="button"
                              onClick={() => { onChange(opt.value); setOpen(false); setSearch(""); }}
                                className={cn(
                                  "w-full text-left px-3 py-2 text-sm hover:bg-olive/15 hover:text-olive transition-all duration-150",
                                (value === opt.value || value === opt.label) && "bg-olive/10 text-olive font-medium"
                                )}
                            >
                              {opt.label}
                            </button>
                        ))
                    )}
                  </div>
                </div>
              )}
          </div>
        </div>
    );
  }

  if (options && onChange) {
      return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            {label && <label className="text-xs font-body font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>}
            <div className="relative">
              <select
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-8 text-sm bg-card border border-border rounded-sm text-foreground focus:outline-none focus:ring-1 focus:ring-olive/40"
              >
                  <option value="">Select...</option>
                  {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
        </div>
      );
  }

  return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        {label && <label className="text-xs font-body font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>}
        <div className="flex items-center justify-between px-3 py-2 text-sm bg-card border border-border rounded-sm">
            <span className="text-muted-foreground">{value}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
  );
};
