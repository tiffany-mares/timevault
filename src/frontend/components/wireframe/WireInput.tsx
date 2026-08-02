import { cn } from "@/lib/utils";

interface WireInputProps {
   placeholder?: string;
   label?: string;
   className?: string;
   value?: string;
   onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
   type?: string;
}
export const WireInput = ({
    placeholder = "Text input...",
    label, className,
    value, onChange,
    type = "text"
}: WireInputProps) => {
    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
          {label && <label className="text-xs font-body font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>}
          <input
              type={type}
              className="px-3 py-2 text-sm bg-card border border-border rounded-sm font-body placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring w-full"
              placeholder={placeholder}
              value={value}
              onChange={onChange}
              readOnly={!onChange}
          />
        </div>
    );
};
