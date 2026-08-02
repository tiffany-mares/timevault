import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export function ThemeToggleFloat() {
  const { mode, setMode } = useTheme();

    const toggleTheme = () => setMode(mode === "light" ? "dark" : "light");
  return (
      <button
          onClick={toggleTheme}
        className={cn(
            "fixed top-4 right-4 z-50 flex items-center gap-1.5 text-xs font-body px-3 py-2 rounded-md transition-all shadow-md",
              "bg-card/80 backdrop-blur-sm border border-border",
            "text-muted-foreground hover:text-foreground hover:bg-card hover:shadow-lg hover:border-olive/40 hover:scale-105"
        )}
          title={mode === "light" ? "Switch to night mode" : "Switch to light mode"}
      >
          {mode === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        <span>{mode === "dark" ? "Light Mode" : "Night Mode"}</span>
      </button>
  );
}
