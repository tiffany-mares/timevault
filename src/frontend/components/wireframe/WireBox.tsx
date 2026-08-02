import { cn } from "@/lib/utils";

interface WireBoxProps {
    children?: React.ReactNode;
    label?: string;
    dashed?: boolean;
    className?: string;
    accent?: "olive" | "navy" | "rust" | "gold" | "teal" | "none";
}

export const WireBox = ({ children, label, dashed = true, className, accent = "none" }: WireBoxProps) => {
    const accentBorder = {
      olive: "border-l-olive", navy: "border-l-navy",
      rust: "border-l-rust", gold: "border-l-gold",
      teal: "border-l-teal", none: "",
    };

    return (
      <div className={cn(
          "panel",
          dashed && "border-dashed",
          accent !== "none" && `border-l-[3px] ${accentBorder[accent]}`,
          className
      )}>
        {label && <div className="panel-header">{label}</div>}
        {children}
      </div>
    );
};
