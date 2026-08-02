import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const linkClass =
  "flex items-center gap-2 px-3 py-2.5 text-xs font-body text-navy hover:bg-olive/10 rounded-sm transition-colors underline underline-offset-2";

type HelpFloatMenuProps = {
  /** Anchor id on the User Manual page, e.g. `um-ml` -> `/user-manual#um-ml` */
  manualSectionId: string;
  className?: string;
};

/**
 * Floating “?” control: opens a small menu to choose Dataset Info or the relevant User Manual section.
 */
export function HelpFloatMenu({
  manualSectionId,
  className,
}: HelpFloatMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("fixed bottom-6 right-6 z-50", className)}>
      {open && (
        <div
          role="menu"
          aria-label="Help options"
          className="absolute bottom-full right-0 mb-3 w-[min(18rem,calc(100vw-2rem))] rounded-md border border-border bg-card shadow-lg overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-border/60 bg-muted/30">
            <p className="text-[11px] font-body font-semibold text-foreground uppercase tracking-wide">
              Where would you like to go?
            </p>
          </div>
          <div className="p-1.5 flex flex-col gap-0.5">
            <Link
              role="menuitem"
              to="/metadata"
              onClick={() => setOpen(false)}
              className={linkClass}
            >
              <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
              View dataset information
            </Link>
            <Link
              role="menuitem"
              to={`/user-manual#${manualSectionId}`}
              onClick={() => setOpen(false)}
              className={linkClass}
            >
              <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
              View in User Manual
            </Link>
          </div>
        </div>
      )}
      <button
        type="button"
        aria-label="Open help menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="w-16 h-16 rounded-full bg-white border border-border shadow-lg hover:shadow-xl flex items-center justify-center transition-all"
      >
        <span className="text-3xl font-bold text-navy select-none leading-none">
          ?
        </span>
      </button>
    </div>
  );
}
