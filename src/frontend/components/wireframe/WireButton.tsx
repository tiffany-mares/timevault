import { cn } from "@/lib/utils";

interface WireButtonProps {
  children: React.ReactNode;
  filled?: boolean;
  accent?: boolean;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function WireButton({children, filled = false, accent = false, className, onClick, disabled = false}: WireButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
        className={cn(
          "px-4 py-2 text-sm font-body font-medium border rounded-md transition-all duration-200 inline-flex items-center justify-center gap-1.5",
            filled
            ? "bg-gradient-to-r from-olive to-olive-light text-parchment border-olive hover:shadow-lg hover:brightness-110 hover:-translate-y-0.5"
            : "bg-card text-foreground border-border hover:bg-secondary hover:shadow-md hover:border-olive/40 hover:-translate-y-0.5",
          accent && !filled && "border-olive text-olive hover:bg-olive/10 hover:shadow-md",
          filled && accent && "bg-gradient-to-r from-olive to-olive-light border-olive text-parchment hover:shadow-lg hover:brightness-110 hover:-translate-y-0.5",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          className
        )}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </button>
  );
}
