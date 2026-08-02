import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import html2canvas from "html2canvas"
import { setExportPayload } from "@/lib/exportStore";
import { PageLayout } from "@/components/PageLayout";
import { WireBox, WireButton } from "@/components/wireframe";
import { WireChartTypeSelector } from "@/components/wireframe/WireChartTypeSelector";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import type { ChartType } from "@/components/wireframe/WireChartTypeSelector";
import { Maximize2, X, Download, Info, HelpCircle, BookOpen, Lightbulb, History, Loader2 } from "lucide-react";
import { SaveToDashboard } from "@/components/SaveToDashboard";
import { HelpFloatMenu } from "@/components/HelpFloatMenu";
import { OFFENCES } from "@/data/offences";
import { RANKS } from "@/data/ranks";
import { UNIT_TYPES } from "@/data/unitTypes";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// - Types -

interface NameValue { name: string; value: number; }
interface GroupRow { group: string; [offence: string]: string | number; }
interface TrendRow { year: string; [offence: string]: string | number; }

interface TrendsData {
  commonOffences: NameValue[];
  distribution: NameValue[];
  trendsOverTime: TrendRow[];
  byGroup: {
    rank: GroupRow[];
    unit: GroupRow[];
    occupation: GroupRow[];
    birthplace: GroupRow[];
  };
}

// - Constants -

const COLORS = [
  "hsl(var(--rust))",
  "hsl(var(--navy))",
  "hsl(var(--olive))",
  "hsl(var(--gold))",
  "hsl(var(--teal))",
  "hsl(var(--copper))",
];

const bdOptions = [
  { value: "rank",       label: "Rank" },
  { value: "unit",       label: "Unit Type" },
  { value: "occupation", label: "Occupation" },
  { value: "birthplace", label: "Birthplace" },
];

// - Dynamic Key Insights function

function buildOffenceInsights(
  commonOffences: NameValue[],
  distribution: NameValue[],
  trendsOverTime: TrendRow[],
  byGroupData: GroupRow[],
  groupBy: string,
  appliedFilters: { yearStart: string; yearEnd: string; ranks: string[]; units: string[]; offenceCodes: string[] }
): string[] {
  const insights: string[] = [];
  const yearRange = appliedFilters.yearStart && appliedFilters.yearEnd
    ? `${appliedFilters.yearStart}-${appliedFilters.yearEnd}`
    : "all years";

  // ── Insight 1: Most common offence (from commonOffences) ──────────────────
  if (commonOffences.length > 0) {
    const top = commonOffences[0];
    const second = commonOffences[1];
    const rankFilter = appliedFilters.ranks.length > 0 ? ` among ${appliedFilters.ranks.slice(0, 2).join(", ")}${appliedFilters.ranks.length > 2 ? ` and others` : ""}` : "";
    const secondClause = second ? ` followed by ${second.name} (${second.value.toLocaleString()})` : "";
    insights.push(
      `${top.name} is the most frequently recorded offence${rankFilter} during ${yearRange}, with ${top.value.toLocaleString()} cases${secondClause}.`
    );
  }

  // ── Insight 2: Concentration / dominance (from distribution) ─────────────
  if (distribution.length >= 2) {
    const top = distribution[0];
    const topTwo = distribution[0].value + distribution[1].value;
    if (topTwo >= 50) {
      insights.push(
        `${top.name} alone accounts for ${top.value}% of all recorded cases, and the top two offence categories together make up ${topTwo}% - disciplinary activity was heavily concentrated in a small number of charge types.`
      );
    } else {
      insights.push(
        `Offence types are relatively spread across ${distribution.length} categories. ${top.name} leads at ${top.value}%, suggesting no single charge dominated the records during this period.`
      );
    }
  }

  // ── Insight 3: Trend direction over time (from trendsOverTime) ────────────
  if (trendsOverTime.length >= 2) {
    const offenceKeys = Object.keys(trendsOverTime[0]).filter(k => k !== "year");

    // Sum all offences per year to get overall trend
    const yearTotals = trendsOverTime.map(row => ({
      year: row.year as string,
      total: offenceKeys.reduce((s, k) => s + Number(row[k] || 0), 0),
    }));

    const first = yearTotals[0];
    const last = yearTotals[yearTotals.length - 1];
    const peak = yearTotals.reduce((a, b) => b.total > a.total ? b : a);
    const direction = last.total > first.total ? "increased" : last.total < first.total ? "decreased" : "remained stable";
    const peakClause = peak.year !== last.year
      ? ` Recorded cases peaked in ${peak.year} (${peak.total.toLocaleString()})`
      : "";

    insights.push(
      `Overall courts martial activity ${direction} from ${first.total.toLocaleString()} cases in ${first.year} to ${last.total.toLocaleString()} in ${last.year}.${peakClause}`
    );

    // ── Insight 4: Fastest-rising offence ────────────────────────────────────
    if (offenceKeys.length > 1 && trendsOverTime.length >= 2) {
      const firstRow = trendsOverTime[0];
      const lastRow = trendsOverTime[trendsOverTime.length - 1];

      const changes = offenceKeys.map(k => ({
        offence: k,
        start: Number(firstRow[k] || 0),
        end: Number(lastRow[k] || 0),
        delta: Number(lastRow[k] || 0) - Number(firstRow[k] || 0),
      })).filter(c => c.start > 0);

      const rising  = [...changes].sort((a, b) => b.delta - a.delta)[0];
      const falling = [...changes].sort((a, b) => a.delta - b.delta)[0];

      if (rising && rising.delta > 0 && falling && falling.delta < 0) {
        insights.push(
          `${rising.offence} showed the largest increase over the period (+${rising.delta.toLocaleString()} cases), while ${falling.offence} saw the steepest decline (${falling.delta.toLocaleString()} cases) - suggesting shifts in how discipline was enforced as the war progressed.`
        );
      } else if (rising && rising.delta > 0) {
        insights.push(
          `${rising.offence} showed the largest increase over the period (+${rising.delta.toLocaleString()} cases from ${first.year} to ${last.year}).`
        );
      }
    }
  }

  //Commented out for now as this is basically always the largest group.

  // ── Insight 5: Group with highest offence count (from byGroupData) ─────────
  // if (byGroupData.length > 0) {
  //   const offenceKeys = Object.keys(byGroupData[0]).filter(k => k !== "group");
  //   const withTotals = byGroupData.map(row => ({
  //     group: row.group as string,
  //     total: offenceKeys.reduce((s, k) => s + Number(row[k] || 0), 0),
  //   }));

  //   const sorted = [...withTotals].sort((a, b) => b.total - a.total);
  //   const top = sorted[0];
  //   const bottom = sorted[sorted.length - 1];
  //   const groupLabel = groupBy === "rank" ? "rank" : groupBy === "unit" ? "unit type" : groupBy === "occupation" ? "occupation" : "birthplace";

  //   if (top && bottom && top.group !== bottom.group) {
  //     const ratio = bottom.total > 0 ? (top.total / bottom.total).toFixed(1) : null;
  //     const ratioClause = ratio ? ` - ${ratio}× more than ${bottom.group}` : "";
  //     insights.push(
  //       `By ${groupLabel}, ${top.group} records the highest number of offences (${top.total.toLocaleString()}${ratioClause}), while ${bottom.group} records the fewest (${bottom.total.toLocaleString()}).`
  //     );
  //   } else if (top) {
  //     insights.push(
  //       `By ${groupLabel}, ${top.group} records the highest number of courts martial offences (${top.total.toLocaleString()}).`
  //     );
  //   }
  // }

  // ── Fallback if data hasn't loaded ────────────────────────────────────────
  if (insights.length === 0) {
    insights.push("Apply filters and load data to generate insights from the records.");
  }

  return insights;
}

// - RealChart component -

const RealChart = ({
  data,
  chartType,
  primaryKey,
  visibleKeys,
  yAxisLabel,
  xAxisLabel,
  valueLabel,
}: {
  data: any[];
  chartType: ChartType;
  primaryKey: string;
  visibleKeys?: string[];
  yAxisLabel?: string;
  xAxisLabel?: string;
  valueLabel?: string;
}) => {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground font-body">
        No data to display.
      </div>
    );
  }

  const allKeys = Array.from(
    data.reduce((keys, row) => {
      Object.keys(row).forEach(k => { if (k !== primaryKey) keys.add(k); });
      return keys;
    }, new Set<string>())
  ) as string[];

  const seriesKeys = visibleKeys && visibleKeys.length > 0 ? allKeys.filter(k => visibleKeys.includes(k)) : allKeys;

  // For simple {name, value} data (commonOffences, distribution)
  const isSimple = primaryKey === "name" && allKeys.length === 1 && allKeys[0] === "value";

  if (chartType === "table") {
    return (
      <div className="overflow-auto h-full">
        <table className="w-full text-xs font-body border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-2 text-muted-foreground uppercase tracking-wide">
                {primaryKey.replace(/_/g, " ")}
              </th>
              {seriesKeys.map(k => (
                <th key={k} className="text-right p-2 text-muted-foreground uppercase tracking-wide">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-olive/8">
                <td className="p-2">{String(row[primaryKey])}</td>
                {seriesKeys.map(k => (
                  <td key={k} className="p-2 text-right">{row[k] ?? 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (chartType === "pie") {
    const pieData = isSimple
      ? data
      : seriesKeys.map(k => ({
          name: k,
          value: data.reduce((sum, row) => sum + Number(row[k] || 0), 0),
        }));
    return (
      <div className="w-full h-full flex flex-col">
        <div style={{ minHeight: "60%", flex: "1 1 auto" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 4, borderColor: "hsl(var(--border))" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-shrink-0 overflow-y-auto border-t border-border/50 px-2 pt-2 mt-1" style={{ maxHeight: 120 }}>
          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
            {pieData.map((entry, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] font-body text-foreground whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {String(entry.name)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (chartType === "scatter") {
    const scatterData = data.map(row => ({
      [primaryKey]: row[primaryKey],
      count: seriesKeys.reduce((sum, k) => sum + Number(row[k] || 0), 0),
    }));
    const many = data.length > 6;
    const truncLen = many ? Math.max(8, Math.floor(60 / data.length) + 4) : 50;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ left: yAxisLabel ? 15 : 0, bottom: xAxisLabel ? 15 : 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey={primaryKey}
            tick={{ fontSize: many ? 8 : 11 }}
            interval={0}
            angle={many ? -55 : 0}
            textAnchor={many ? "end" : "middle"}
            height={many ? 100 : 30}
            tickFormatter={(v: string) => typeof v === "string" && v.length > truncLen ? v.slice(0, truncLen) + "..." : v}
            label={xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -10, style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } } : undefined}
          />
          <YAxis
            dataKey="count"
            tick={{ fontSize: 11 }}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft", style: { fontSize: 11, textAnchor: "middle", fill: "hsl(var(--muted-foreground))" }, offset: -5 } : undefined}
          />
          <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 4, borderColor: "hsl(var(--border))" }} />
          <Scatter data={scatterData} fill={COLORS[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "line") {
    const many = isSimple && data.length > 6;
    const needsAngled = isSimple && data.length > 4;
    const truncLen = many ? Math.max(8, Math.floor(60 / data.length) + 4) : 50;
    const lineLegendItems = seriesKeys.map((k, i) => ({ name: k === "value" && valueLabel ? valueLabel : k, color: COLORS[i % COLORS.length] }));
    return (
      <div className="w-full h-full flex flex-col">
        <div style={{ minHeight: "60%", flex: "1 1 auto" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: yAxisLabel ? 15 : 0, bottom: needsAngled || xAxisLabel ? 10 : 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={primaryKey}
                tick={{ fontSize: many ? 8 : needsAngled ? 9 : 11 }}
                interval={0}
                angle={many ? -55 : needsAngled ? -40 : 0}
                textAnchor={many || needsAngled ? "end" : "middle"}
                height={many ? 100 : needsAngled ? 130 : 35}
                tickFormatter={(v: string) => typeof v === "string" && v.length > truncLen ? v.slice(0, truncLen) + "..." : v}
                label={xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -5, style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } } : undefined}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft", style: { fontSize: 11, textAnchor: "middle", fill: "hsl(var(--muted-foreground))" }, offset: -5 } : undefined}
              />
              <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 4, borderColor: "hsl(var(--border))" }} />
              {seriesKeys.map((k, i) => (
                <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2} dot={{ fill: COLORS[i % COLORS.length], r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {lineLegendItems.length > 1 && (
          <div className="flex-shrink-0 overflow-y-auto border-t border-border/50 px-2 pt-2 mt-1" style={{ maxHeight: 120 }}>
            <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
              {lineLegendItems.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] font-body text-foreground whitespace-nowrap">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  {item.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default: bar (horizontal for simple name/value, stacked vertical for multi-series)
  if (isSimple) {
    const maxLabelLen = Math.max(...data.map(d => String(d.name).length));
    const yWidth = Math.min(Math.max(maxLabelLen * 7, 200), 360);
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, bottom: yAxisLabel ? 20 : 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            type="number"
            tick={{ fontSize: 10 }}
            label={yAxisLabel ? { value: yAxisLabel, position: "insideBottom", offset: -10, style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } } : undefined}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 9 }}
            width={yWidth}
            label={xAxisLabel ? { value: xAxisLabel, angle: -90, position: "insideLeft", offset: 5, style: { fontSize: 11, textAnchor: "middle", fill: "hsl(var(--muted-foreground))" } } : undefined}
          />
          <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 4, borderColor: "hsl(var(--border))" }} />
          <Bar dataKey="value" radius={[0, 3, 3, 0]} name={valueLabel || "value"}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const maxXLabel = Math.max(...data.map(d => String(d[primaryKey]).length));
  const needsAngle = data.length > 4 || maxXLabel > 10;
  const many = data.length > 6;
  const truncLen = many ? Math.max(8, Math.floor(60 / data.length) + 4) : (needsAngle ? 25 : 50);
  const xHeight = many ? 100 : (needsAngle ? Math.min(maxXLabel * 5 + 30, 140) : 40);
  const barLegendItems = seriesKeys.map((k, i) => ({ name: k === "value" && valueLabel ? valueLabel : k, color: COLORS[i % COLORS.length] }));
  return (
    <div className="w-full h-full flex flex-col">
      <div style={{ minHeight: "60%", flex: "1 1 auto" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: yAxisLabel ? 15 : 0, bottom: xAxisLabel ? 15 : 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey={primaryKey}
              tick={{ fontSize: many ? 8 : 10 }}
              interval={0}
              angle={many ? -55 : needsAngle ? -35 : 0}
              textAnchor={many || needsAngle ? "end" : "middle"}
              height={xHeight}
              tickFormatter={(v: string) => typeof v === "string" && v.length > truncLen ? v.slice(0, truncLen) + "..." : v}
              label={xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -10, style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } } : undefined}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft", style: { fontSize: 11, textAnchor: "middle", fill: "hsl(var(--muted-foreground))" }, offset: -5 } : undefined}
            />
            <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 4, borderColor: "hsl(var(--border))" }} />
            {seriesKeys.map((k, i) => (
              <Bar key={k} dataKey={k} stackId="a" fill={COLORS[i % COLORS.length]}
                radius={i === seriesKeys.length - 1 ? [3, 3, 0, 0] : undefined} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {barLegendItems.length > 1 && (
        <div className="flex-shrink-0 overflow-y-auto border-t border-border/50 px-2 pt-2 mt-1" style={{ maxHeight: 120 }}>
          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
            {barLegendItems.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] font-body text-foreground whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                {item.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// - Sub-components -

const SectionBox = ({ title, description, accent, children }: { title: string; description?: string; accent: string; children: React.ReactNode }) => (
  <WireBox dashed={false} accent={accent as any}>
    <div className="flex flex-col gap-1 mb-4">
      <span className="text-xs font-body font-semibold uppercase tracking-widest text-olive">{title}</span>
      {description && <p className="text-sm font-body text-muted-foreground">{description}</p>}
    </div>
    {children}
  </WireBox>
);

const InsightBox = ({ items }: { items: string[] }) => (
  <div className="mt-4 p-4 bg-muted/30 border border-border rounded-md">
    <div className="flex items-center gap-2 mb-2.5">
      <Lightbulb className="w-4 h-4 text-gold" />
      <span className="text-xs font-body font-semibold uppercase tracking-wide text-gold">What this means</span>
    </div>
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-sm font-body text-muted-foreground flex items-start gap-2">
          <span className="text-gold mt-1.5 flex-shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const FilterTip = ({ text, children }: { text: string; children: React.ReactNode }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs font-body">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const Overlay = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col overflow-auto" onClick={onClose}>
    <div className="flex items-center justify-between px-6 py-4 border-b border-border" onClick={(e) => e.stopPropagation()}>
      <span className="text-sm font-body font-semibold uppercase tracking-widest text-olive">{title}</span>
      <button onClick={onClose} className="p-2 rounded-sm hover:bg-olive/10 hover:shadow-sm transition-all duration-200">
        <X className="w-5 h-5 text-muted-foreground" />
      </button>
    </div>
    <div className="flex-1 p-6 max-w-6xl mx-auto w-full" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

const LoadingChart = () => (
  <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
    <Loader2 className="w-5 h-5 animate-spin" />
    <span className="text-sm font-body">Loading data...</span>
  </div>
);

// - Main component -

const FILTER_STORAGE_KEY = "offence_trends_filters";

interface StoredFilters {
  yearStart: string;
  yearEnd: string;
  ranks: string[];
  units: string[];
  offenceCodes: string[];
}

function loadSavedFilters(): StoredFilters | null {
  try {
    const raw = sessionStorage.getItem(FILTER_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredFilters;
  } catch { /* ignore corrupt data */ }
  return null;
}

const CourtsMartialAnalysis = () => {
  const navigate = useNavigate();
  const restored = useMemo(() => loadSavedFilters(), []);

  // Filter state (restored from session if available)
  const [yearStart, setYearStart] = useState(restored?.yearStart ?? "");
  const [yearEnd, setYearEnd] = useState(restored?.yearEnd ?? "");
  const [ranks, setRanks] = useState<Set<string>>(new Set(restored?.ranks ?? []));
  const [units, setUnits] = useState<Set<string>>(new Set(restored?.units ?? []));
  const [offenceTypes, setOffenceTypes] = useState<Set<string>>(new Set(restored?.offenceCodes ?? []));

  // Applied filters (only updated when Apply is clicked)
const [appliedFilters, setAppliedFilters] = useState(() => {
    if (restored) {
      return {
        yearStart: restored.yearStart,
        yearEnd: restored.yearEnd,
        ranks: restored.ranks.length > 0 ? restored.ranks : [] as string[],
        units: restored.units.length > 0 ? restored.units : [] as string[],
        offenceCodes: restored.offenceCodes,
      };
    }
    return {
      yearStart: "",
      yearEnd: "",
      ranks: [] as string[],
      units: [] as string[],
      offenceCodes: [] as string[],
    };
});

  // Data state
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [topChartType, setTopChartType] = useState<ChartType>("bar");
  const [distChartType, setDistChartType] = useState<ChartType>("pie");
  const [trendsChartType, setTrendsChartType] = useState<ChartType>("line");
  const [breakdownChartType, setBreakdownChartType] = useState<ChartType>("bar");
  const [fullscreen, setFullscreen] = useState<string | null>(null);
  const [groupBy, setBreakdownDimension] = useState("rank");
  const [visibleOffences, setVisibleOffences] = useState<Set<string>>(new Set());

  // Dropdown options
  const unitOpts = useMemo(() => UNIT_TYPES.map((u) => ({ id: u, label: u })), []);
  const offenceOpts = useMemo(() => OFFENCES.map((o) => ({ id: o.code, label: `${o.code} - ${o.description}` })), []);
  const rankOpts = useMemo(() => RANKS.map((r) => ({ id: r, label: r })), []);

  // Dropdown handlers
  const toggleIn = <T,>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, val: T) =>
    setter(prev => { const n = new Set(prev); n.has(val) ? n.delete(val) : n.add(val); return n; });
  const addAll = <T,>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, vals: T[]) =>
    setter(prev => { const n = new Set(prev); vals.forEach(v => n.add(v)); return n; });
  const removeAll = <T,>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, vals: T[]) =>
    setter(prev => { const n = new Set(prev); vals.forEach(v => n.delete(v)); return n; });

  const clearAll = () => {
    setYearStart("");
    setYearEnd("");
    setRanks(new Set());
    setUnits(new Set());
    setOffenceTypes(new Set());
    setAppliedFilters({
      yearStart: "",
      yearEnd: "",
      ranks: [],
      units: [],
      offenceCodes: [],
    });
    sessionStorage.removeItem(FILTER_STORAGE_KEY);
  };

  // Fetch data when appliedFilters changes
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appliedFilters),
      });
      if (!response.ok) {
        const err = await response.json();
        setError(err.error || "An error occurred.");
        return;
      }
      const result: TrendsData = await response.json();
      setData(result);
      setVisibleOffences(new Set());
    } catch (e) {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply button handler
const handleApply = () => {
    const applied = {
        yearStart,
        yearEnd,
        ranks: ranks.size === 0 ? rankOpts.map(r => r.id) : Array.from(ranks),
        units: units.size === 0 ? unitOpts.map(u => u.id) : Array.from(units),
        offenceCodes: Array.from(offenceTypes),
    };
    setAppliedFilters(applied);
    sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({
        yearStart,
        yearEnd,
        ranks: Array.from(ranks),
        units: Array.from(units),
        offenceCodes: Array.from(offenceTypes),
    }));
};
  // Derived display values
  const hasFilters = ranks.size > 0 || units.size > 0 || offenceTypes.size > 0 || (yearStart !== "" && yearStart !== "1914") || (yearEnd !== "" && yearEnd !== "1918");
  const yearLabel = appliedFilters.yearStart && appliedFilters.yearEnd
    ? `${appliedFilters.yearStart}-${appliedFilters.yearEnd}`
    : "All Years";
  const rankLabel = appliedFilters.ranks.length > 0 ? appliedFilters.ranks.join(", ") : "All Ranks";
  const unitLabel = appliedFilters.units.length > 0 ? appliedFilters.units.join(", ") : "All Unit Types";

  const filterParts = [
    yearStart && yearEnd && `${yearStart}-${yearEnd}`,
    ranks.size > 0 && `Rank: ${Array.from(ranks).slice(0, 2).join(", ")}${ranks.size > 2 ? ` +${ranks.size - 2}` : ""}`,
    units.size > 0 && `Unit Type: ${Array.from(units).slice(0, 2).join(", ")}${units.size > 2 ? ` +${units.size - 2}` : ""}`,
    offenceTypes.size > 0 && `Offence: ${Array.from(offenceTypes).slice(0, 2).join(", ")}${offenceTypes.size > 2 ? ` +${offenceTypes.size - 2}` : ""}`,
  ].filter(Boolean);
  const filterText = filterParts.length > 0 ? filterParts.join(" - ") : "";

  // Derived chart data
  const commonOffences = data?.commonOffences ?? [];
  const distribution = data?.distribution ?? [];
  const trendsOverTime = data?.trendsOverTime ?? [];
  const byGroupData = data?.byGroup[groupBy as keyof TrendsData["byGroup"]] ?? [];

  // Get unique offence keys from trends data for toggle buttons
  const trendOffences = useMemo(() => {
    const keys = new Set<string>();
    trendsOverTime.forEach(row => {
      Object.keys(row).forEach(k => { if (k !== "year") keys.add(k); });
    });
    return Array.from(keys);
  }, [trendsOverTime]);

  const toggleOffence = (offence: string) => {
    setVisibleOffences(prev => {
      const next = new Set(prev);
      next.has(offence) ? next.delete(offence) : next.add(offence);
      return next;
    });
  };

  // Section titles and descriptions
  const topTitle = hasFilters ? `Most Common Offences (${yearLabel})` : "Most Common Courts Martial Offences";
  const topDesc = hasFilters
    ? `Showing the most frequent offences${appliedFilters.ranks.length > 0 ? ` for ${rankLabel}` : ""}${appliedFilters.units.length > 0 ? ` in ${unitLabel}` : ""} during ${yearLabel}.`
    : "This chart shows the offences that appeared most frequently in the dataset.";

  const distTitle = hasFilters ? `Offence Distribution - ${yearLabel}` : "Offence Distribution";
  const distDesc = hasFilters
    ? `Percentage breakdown of offences${appliedFilters.ranks.length > 0 ? ` among ${rankLabel}` : ""}${appliedFilters.units.length > 0 ? ` in ${unitLabel}` : ""}.`
    : "This chart shows how the different offence types compare as a percentage of all recorded courts martial cases.";

  const trendsTitle = `Offence Trends Over Time (${yearLabel})`;
  const trendsDesc = hasFilters
    ? `Offence frequency over ${yearLabel}${appliedFilters.ranks.length > 0 ? ` for ${rankLabel}` : ""}${appliedFilters.units.length > 0 ? ` in ${unitLabel}` : ""}.`
    : "This chart shows how the frequency of courts martial offences changed during the course of the war.";

  const bdLabel = bdOptions.find(o => o.value === groupBy)?.label || "Group";
  const bdTitle = hasFilters ? `Offences by ${bdLabel} - ${yearLabel}` : `Offences by Rank or Unit Type`;
  const bdDesc = hasFilters
    ? `Distribution of offences across ${bdLabel.toLowerCase()}s during ${yearLabel}.`
    : "This chart compares how offences are distributed across different groups within the military.";

  // Insight text
  const topInsight = useMemo(() => {
    if (!commonOffences.length) return ["No offences match the selected filters."];
    const items = [`${commonOffences[0].name} appears most frequently in the records.`];
    if (commonOffences.length > 1) items.push(`${commonOffences[1].name} is the second most common offence.`);
    if (commonOffences.length > 2) items.push(`${commonOffences.length - 2} other offence types also appear in this selection.`);
    return items;
  }, [commonOffences]);

  const distInsight = useMemo(() => {
    if (!distribution.length) return ["No data matches the selected filters."];
    return [
      `${distribution[0].name} accounts for ${distribution[0].value}% of the records.`,
      `${distribution.length} offence categories are represented in this view.`,
    ];
  }, [distribution]);

  const trendsInsight = useMemo(() => {
    if (trendsOverTime.length < 2) return ["Select a wider year range to observe trends over time."];
    return [
      `Data shown for ${yearLabel}${appliedFilters.ranks.length > 0 ? ` filtered to ${rankLabel}` : ""}.`,
      "Look for increases or decreases across the selected period.",
    ];
  }, [trendsOverTime, yearLabel, rankLabel, appliedFilters.ranks]);

  const bdInsight = useMemo(() => {
    if (!byGroupData.length) return ["No data matches the selected filters."];
    const topGroup = byGroupData.reduce((a, b) => {
      const aTotal = Object.entries(a).filter(([k]) => k !== "group").reduce((s, [, v]) => s + Number(v), 0);
      const bTotal = Object.entries(b).filter(([k]) => k !== "group").reduce((s, [, v]) => s + Number(v), 0);
      return aTotal > bTotal ? a : b;
    });
    return [
      `${topGroup.group} shows the highest number of recorded offences in this view.`,
      `${byGroupData.length} ${bdLabel.toLowerCase()} groups are compared.`,
    ];
  }, [byGroupData, bdLabel]);

  const ExpandBtn = ({ section }: { section: string }) => (
    <button
      onClick={() => setFullscreen(section)}
      className="p-1 rounded-sm hover:bg-olive/15 hover:shadow-sm transition-all duration-200"
      title="Expand to fullscreen"
    >
      <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
    </button>
  );

  return (
    <PageLayout
      code="P-OT"
      title="Offence Trends - WWI Courts Martial Records"
      subtitle="Explore how disciplinary offences were recorded among Canadian soldiers during the First World War (1914-1918)."
      marqueeItems={["Offence Trends", "By Rank", "By Unit Type", "By Year", "Distribution", "Desertion", "Absence", "Insubordination", "Drunkenness"]}
    >
      <div className="p-4 bg-muted/30 border border-border rounded-md -mt-2">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-olive flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-body text-foreground">
              This page summarizes patterns in military courts martial records during the First World War.
            </p>
            <p className="text-sm font-body text-muted-foreground">
              The charts below help you understand which offences were most common, how disciplinary activity changed over time, and how offences varied across different groups such as ranks or unit types.
            </p>
            <p className="text-xs font-body text-muted-foreground">
              This analysis draws from courts martial proceedings of the Canadian Expeditionary Force (CEF) and includes offence frequency distributions, demographic breakdowns by rank, unit type, occupation, and birthplace, as well as trend analysis across the war years (1914-1918).
            </p>
            <div className="flex items-center gap-4">
                <Link
                  to="/metadata"
                className="inline-flex items-center gap-1.5 text-xs font-body text-olive hover:text-olive-light hover:bg-olive/10 transition-all duration-200 underline underline-offset-2 rounded-sm px-1 -mx-1 py-0.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                View dataset information
                </Link>
              <Link
                  to="/user-manual#um-offence-trends"
                className="inline-flex items-center gap-1.5 text-xs font-body text-olive hover:text-olive-light hover:bg-olive/10 transition-all duration-200 underline underline-offset-2 rounded-sm px-1 -mx-1 py-0.5"
              >
                  <BookOpen className="w-3.5 h-3.5" />
                View in User Manual
              </Link>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 font-body">
          {error}
        </div>
      )}

      <WireBox dashed={false} label="EXPLORE THE DATA" accent="gold">
        <p className="text-sm font-body text-muted-foreground mb-4">
          Use the filters below to focus on specific years, ranks, units, or offences.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
          <div className="flex flex-col gap-1.5">
            <FilterTip text="Shows offences recorded during selected years of the war.">
              <label className="text-xs font-body font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1 cursor-help">
                Year Range <HelpCircle className="w-3 h-3 text-muted-foreground/60" />
              </label>
            </FilterTip>
            <div className="flex items-center gap-1.5">
              <select value={yearStart} onChange={(e) => { setYearStart(e.target.value); if (e.target.value && yearEnd && Number(e.target.value) > Number(yearEnd)) setYearEnd(e.target.value); }}
                className="flex-1 px-2 py-2 text-sm bg-card border border-border rounded-sm text-foreground outline-none focus:border-olive/60">
                <option value="">Start</option>
                {["1914","1915","1916","1917","1918"].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="text-xs text-muted-foreground">to</span>
              <select value={yearEnd} onChange={(e) => { setYearEnd(e.target.value); if (e.target.value && yearStart && Number(e.target.value) < Number(yearStart)) setYearStart(e.target.value); }}
                className="flex-1 px-2 py-2 text-sm bg-card border border-border rounded-sm text-foreground outline-none focus:border-olive/60">
                <option value="">End</option>
                {["1914","1915","1916","1917","1918"].filter(y => !yearStart || Number(y) >= Number(yearStart)).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <FilterTip text="Allows comparison of disciplinary patterns across military ranks.">
              <span className="text-xs font-body font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1 cursor-help">
                Rank <HelpCircle className="w-3 h-3 text-muted-foreground/60" />
              </span>
            </FilterTip>
            <MultiSelectDropdown label="" placeholder="All Ranks" options={rankOpts} selected={ranks}
              onToggle={(id) => toggleIn(setRanks, id)} onSelectAll={(ids) => addAll(setRanks, ids)}
              onDeselectAll={(ids) => removeAll(setRanks, ids)} onClearAll={() => setRanks(new Set())} />
          </div>

          <div className="flex flex-col gap-1.5">
            <FilterTip text="Focus on a specific unit type.">
              <span className="text-xs font-body font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1 cursor-help">
                Unit Type <HelpCircle className="w-3 h-3 text-muted-foreground/60" />
              </span>
            </FilterTip>
            <MultiSelectDropdown label="" placeholder="All Unit Types" options={unitOpts} selected={units}
              onToggle={(id) => toggleIn(setUnits, id)} onSelectAll={(ids) => addAll(setUnits, ids)}
              onDeselectAll={(ids) => removeAll(setUnits, ids)} onClearAll={() => setUnits(new Set())} />
          </div>

          <div className="flex flex-col gap-1.5">
            <FilterTip text="Examine trends for a specific offence category.">
              <span className="text-xs font-body font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1 cursor-help">
                Offence Type <HelpCircle className="w-3 h-3 text-muted-foreground/60" />
              </span>
            </FilterTip>
            <MultiSelectDropdown label="" placeholder="All Offences" options={offenceOpts} selected={offenceTypes}
              onToggle={(id) => toggleIn(setOffenceTypes, id)} onSelectAll={(ids) => addAll(setOffenceTypes, ids)}
              onDeselectAll={(ids) => removeAll(setOffenceTypes, ids)} onClearAll={() => setOffenceTypes(new Set())} />
          </div>

          <div className="flex gap-2 items-end pt-4">
            <WireButton filled accent onClick={handleApply}>Apply</WireButton>
            <WireButton onClick={clearAll}>Reset</WireButton>
          </div>
        </div>
        {filterText && (
          <p className="text-[10px] text-muted-foreground font-body mt-3">Active: {filterText}</p>
        )}
      </WireBox>

      <nav className="sticky top-16 z-40 -mx-1 px-1 py-2">
        <div className="flex items-center gap-1 bg-card/90 backdrop-blur border border-border rounded-md px-3 py-2 shadow-sm overflow-x-auto">
          <span className="text-[10px] font-body text-muted-foreground uppercase tracking-wide mr-2 flex-shrink-0">Jump to:</span>
          {[
            { id: "section-top", label: "Most Common" },
            { id: "section-dist", label: "Distribution" },
            { id: "section-trends", label: "Trends Over Time" },
            { id: "section-breakdown", label: "By Group" },
            { id: "section-insights", label: "Key Insights" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="text-xs font-body px-3 py-1.5 rounded-sm border border-border text-muted-foreground hover:text-foreground hover:border-olive/50 hover:bg-olive/10 transition-all whitespace-nowrap"
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      {fullscreen === "top" && (
        <Overlay title={topTitle} onClose={() => setFullscreen(null)}>
          <div style={{ height: topChartType === "bar" && commonOffences.length > 8 ? `${Math.max(70 * window.innerHeight / 100, commonOffences.length * 42)}px` : "70vh" }}>
            {loading ? <LoadingChart /> : <RealChart data={commonOffences} chartType={topChartType} primaryKey="name" xAxisLabel="Offence Type" yAxisLabel="Number of Cases" valueLabel="Number of Cases" />}
          </div>
          <InsightBox items={topInsight} />
        </Overlay>
      )}
      <div id="export-capture">
        <div id="section-top" className="scroll-mt-28" />
        <SectionBox title={topTitle} description={topDesc} accent="rust">
         <p className="text-xs font-body text-muted-foreground -mt-2 mb-3">
          The bar chart ranks offences by total count, revealing which violations most frequently led to courts martial proceedings. Switch to a table view for exact figures or a pie chart to see proportional  share.
        </p>
        <div className="flex items-center justify-between mb-2">
          <WireChartTypeSelector defaultType="bar" onChange={setTopChartType} />
          <ExpandBtn section="top" />
        </div>
        <div style={{ height: topChartType === "bar" && commonOffences.length > 8 ? `${Math.max(500, commonOffences.length * 42)}px` : "28rem" }}>
          {loading ? <LoadingChart /> : <RealChart data={commonOffences} chartType={topChartType} primaryKey="name" xAxisLabel="Offence Type" yAxisLabel="Number of Cases" valueLabel="Number of Cases" />}
        </div>
        <InsightBox items={topInsight} />
      </SectionBox>

      {fullscreen === "dist" && (
        <Overlay title={distTitle} onClose={() => setFullscreen(null)}>
          <div style={{ height: distChartType === "bar" && distribution.length > 8 ? `${Math.max(70 * window.innerHeight / 100, distribution.length * 42)}px` : "70vh" }}>
            {loading ? <LoadingChart /> : <RealChart data={distribution} chartType={distChartType} primaryKey="name" xAxisLabel="Offence Type" yAxisLabel="Share (%)" valueLabel="Share (%)" />}
          </div>
          <InsightBox items={distInsight} />
        </Overlay>
      )}
      <div id="section-dist" className="scroll-mt-28" />
      <SectionBox title={distTitle} description={distDesc} accent="navy">
        <p className="text-xs font-body text-muted-foreground -mt-2 mb-3">
           The pie chart shows each offence category as a share of all recorded cases, making it easy to identify which violations dominated the disciplinary record relative to others.
        </p>
        <div className="flex items-center justify-between mb-2">
          <WireChartTypeSelector defaultType="pie" onChange={setDistChartType} />
          <ExpandBtn section="dist" />
        </div>
        <div style={{ height: distChartType === "bar" && distribution.length > 8 ? `${Math.max(500, distribution.length * 42)}px` : "28rem" }}>
          {loading ? <LoadingChart /> : <RealChart data={distribution} chartType={distChartType} primaryKey="name" xAxisLabel="Offence Type" yAxisLabel="Share (%)" valueLabel="Share (%)" />}
        </div>
        <InsightBox items={distInsight} />
      </SectionBox>

      {fullscreen === "trends" && (
        <Overlay title={trendsTitle} onClose={() => setFullscreen(null)}>
          <div style={{ height: trendsChartType === "bar" && trendsOverTime.length > 8 ? `${Math.max(70 * window.innerHeight / 100, trendsOverTime.length * 36)}px` : "70vh" }}>
            {loading ? <LoadingChart /> : <RealChart data={trendsOverTime} chartType={trendsChartType} primaryKey="year" visibleKeys={Array.from(visibleOffences)} xAxisLabel="Year" yAxisLabel="Number of Cases" />}
          </div>
          <InsightBox items={trendsInsight} />
        </Overlay>
      )}
      <div id="section-trends" className="scroll-mt-28" />
      <SectionBox title={trendsTitle} description={trendsDesc} accent="olive">
          <p className="text-xs font-body text-muted-foreground -mt-2 mb-3">
          The line chart traces offence counts year by year, highlighting how disciplinary patterns shifted as the war progressed - from mobilization in 1914 through the major engagements of 1916-1917 to the armistice in 1918.  Use the toggles below to isolate specific offence types.
        </p>
        <div className="flex items-center justify-between mb-2">
          <WireChartTypeSelector defaultType="line" onChange={setTrendsChartType} />
          <ExpandBtn section="trends" />
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {trendOffences.map((offence, i) => (
            <button
              key={offence}
              onClick={() => toggleOffence(offence)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-body rounded-sm border transition-colors ${
                visibleOffences.has(offence)
                  ? "border-olive bg-olive/10 text-foreground font-medium"
                  : "border-border text-muted-foreground hover:border-olive/40"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length], opacity: visibleOffences.has(offence) ? 1 : 0.3 }} />
              {offence}
            </button>
          ))}
        </div>
        <div style={{ height: trendsChartType === "bar" && trendsOverTime.length > 8 ? `${Math.max(500, trendsOverTime.length * 36)}px` : "28rem" }}>
          {loading ? <LoadingChart /> : <RealChart data={trendsOverTime} chartType={trendsChartType} primaryKey="year" visibleKeys={Array.from(visibleOffences)} xAxisLabel="Year" yAxisLabel="Number of Cases" />}
        </div>
        <InsightBox items={trendsInsight} />
      </SectionBox>

      <div id="section-breakdown" className="scroll-mt-28" />
      {fullscreen === "breakdown" && (
        <Overlay title={bdTitle} onClose={() => setFullscreen(null)}>
          <div style={{ height: breakdownChartType === "bar" && byGroupData.length > 8 ? `${Math.max(70 * window.innerHeight / 100, byGroupData.length * 36)}px` : "70vh" }}>
            {loading ? <LoadingChart /> : <RealChart data={byGroupData} chartType={breakdownChartType} primaryKey="group" xAxisLabel={bdLabel} yAxisLabel="Number of Cases" />}
          </div>
          <InsightBox items={bdInsight} />
        </Overlay>
      )}
      <SectionBox title={bdTitle} description={bdDesc} accent="teal">
        <p className="text-xs font-body text-muted-foreground -mt-2 mb-3">
          The stacked bar chart compares offence distributions across demographic groups, revealing whether certain ranks, unit types, occupations, or birthplaces were disproportionately represented in courts martial records.
         </p>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <WireChartTypeSelector defaultType="bar" onChange={setBreakdownChartType} />
            <span className="text-xs text-muted-foreground font-body">View by:</span>
          </div>
          <ExpandBtn section="breakdown" />
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {bdOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setBreakdownDimension(opt.value)}
              className={`px-3 py-1.5 text-xs font-body rounded-sm border transition-colors ${
                groupBy === opt.value
                  ? "border-olive bg-olive/10 text-foreground font-semibold"
                  : "border-border text-muted-foreground hover:border-olive/60 hover:bg-olive/10 hover:shadow-sm"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ height: breakdownChartType === "bar" && byGroupData.length > 8 ? `${Math.max(500, byGroupData.length * 36)}px` : "28rem" }}>
          {loading ? <LoadingChart /> : <RealChart data={byGroupData} chartType={breakdownChartType} primaryKey="group" xAxisLabel={bdLabel} yAxisLabel="Number of Cases" />}
        </div>
        <InsightBox items={bdInsight} />
      </SectionBox>

      </div>
      <div id="section-insights" className="scroll-mt-28" />
      <WireBox dashed={false} label="KEY INSIGHTS FROM THE DATA" accent="gold">
        <p className="text-sm font-body text-muted-foreground mb-4">
          These observations are drawn from aggregate patterns in the dataset. Results may vary when filtered to specific time periods, ranks, or unit types.
        </p>
        <div className="space-y-3">
          {buildOffenceInsights(commonOffences, distribution, trendsOverTime, byGroupData, groupBy, appliedFilters).map((insight, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm font-body text-foreground">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gold/15 text-gold text-xs font-semibold flex items-center justify-center mt-0.5">{i + 1}</span>
              <span>{insight}</span>
            </div>
          ))}
        </div>
      </WireBox>

      <WireBox dashed={false} label="HISTORICAL CONTEXT" accent="navy">
        <div className="flex items-start gap-3">
          <History className="w-5 h-5 text-navy flex-shrink-0 mt-0.5" />
          <div className="space-y-3">
            <p className="text-sm font-body text-foreground">
              Courts martial were military trials used to enforce discipline within the Canadian Expeditionary Force during the First World War.
            </p>
            <p className="text-sm font-body text-muted-foreground">
              Offences could range from minor disciplinary violations such as drunkenness to more serious offences such as desertion.
            </p>
            <p className="text-sm font-body text-muted-foreground">
              The patterns shown here reflect recorded disciplinary proceedings rather than the full experience of soldiers during the war.
            </p>
          </div>
        </div>
      </WireBox>

      <div className="flex justify-center gap-4">
        <WireButton filled accent onClick={async() => {
          const el = document.getElementById("export-capture")
          let imageData: string | undefined
          if(el) {
            try {
              const canvas = await html2canvas(el, {backgroundColor: "#ffffff", scale: 2, useCORS: true, logging: false})
              imageData = canvas.toDataURL("image/png")
            } catch(e) { console.warn("Chart capture failed:", e) }
          }
          setExportPayload({
            title: "Offence Trends - WWI Courts Martial Records",
            subtitle: appliedFilters.yearStart && appliedFilters.yearEnd ? `${appliedFilters.yearStart}-${appliedFilters.yearEnd}` : "All Years",
            insights: [...topInsight, ...distInsight],
            imageData
          })
          navigate("/export?from=offence_trends")
        }} className="gap-2 text-sm py-2.5 px-6">
          <Download className="w-4 h-4" /> Export Results
        </WireButton>
        <SaveToDashboard reportName="Offence Trends Analysis" reportType="Overview" />
      </div>

      <HelpFloatMenu manualSectionId="um-offence-trends" />
    </PageLayout>
  );
};

export default CourtsMartialAnalysis;
