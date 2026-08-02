import { cn } from "@/lib/utils";

export function WireCheckbox({ label, checked = false, onChange }: { label: string; checked?: boolean; onChange?: () => void }) {
  return (
      <div className="flex items-center gap-2 cursor-pointer group" onClick={onChange}>
        <div className={cn("w-4 h-4 border rounded-sm flex items-center justify-center transition-all duration-200", checked ? "bg-olive border-olive shadow-sm" : "border-border group-hover:border-olive/60 group-hover:shadow-sm group-hover:bg-olive/5")}>
            {checked && <span className="text-parchment text-xs">✓</span>}
        </div>
          <span className="text-sm font-body group-hover:text-olive transition-colors duration-200">{label}</span>
      </div>
  );
}
