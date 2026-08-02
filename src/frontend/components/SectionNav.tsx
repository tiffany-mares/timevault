import { cn } from "@/lib/utils";

export function SectionNav({ sections }: { sections: { id: string; label: string }[] }) {
  const scrollTo = (id: string) => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

    return (
        <div className="flex flex-wrap gap-2 p-3 panel border-olive/20 bg-gradient-to-r from-olive/5 via-transparent to-olive/5">
          <span className="text-[10px] font-body uppercase tracking-widest text-muted-foreground self-center mr-1">Jump to:</span>
            {sections.map((s) => (
              <button
                key={s.id}
                  onClick={() => scrollTo(s.id)}
                className="text-xs font-body px-2.5 py-1 rounded-sm border border-border hover:border-olive hover:bg-olive/15 text-muted-foreground hover:text-foreground hover:shadow-sm transition-all duration-200"
              >
                {s.label}
              </button>
            ))}
        </div>
    );
}
