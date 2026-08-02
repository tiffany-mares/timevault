import { useState } from "react";
import { BarChart3, LineChart, PieChart, Table2, ScatterChart } from "lucide-react";
import { cn } from "@/lib/utils";

const types = [
    { id: "bar", label: "Bar", icon: BarChart3 },
    { id: "line", label: "Line", icon: LineChart },
    { id: "pie", label: "Pie", icon: PieChart },
    { id: "scatter", label: "Scatter", icon: ScatterChart },
    { id: "table", label: "Table", icon: Table2 },
] as const;

export type ChartType = (typeof types)[number]["id"];
interface WireChartTypeSelectorProps {
  defaultType?: ChartType;
  onChange?: (type: ChartType) => void;
  className?: string;
}

export const WireChartTypeSelector = ({
  defaultType = "bar",
  onChange,
  className,
}: WireChartTypeSelectorProps) => {
  const [selected, setSelected] = useState<ChartType>(defaultType);

  const pick = (type: ChartType) => {
      setSelected(type);
      onChange?.(type);
  };

  return (
    <div className={cn("flex items-center gap-1 mb-3", className)}>
       <span className="text-[10px] text-muted-foreground mr-1 uppercase tracking-wide font-body">View as:</span>
       {types.map(({ id, label, icon: Icon }) => (
         <button
            key={id}
            onClick={() => pick(id)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-[10px] border rounded-sm transition-all duration-200 font-body",
              selected === id
                ? "border-olive bg-olive/10 text-olive font-semibold shadow-sm"
                : "border-border text-muted-foreground hover:border-olive/50 hover:bg-olive/10 hover:text-olive hover:shadow-sm"
            )}
            title={label}
         >
            <Icon className="w-3 h-3" />
            <span className="hidden sm:inline">{label}</span>
         </button>
       ))}
    </div>
  );
};
