import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import html2canvas from "html2canvas"
import { setExportPayload } from "@/lib/exportStore"
import { PageLayout } from "@/components/PageLayout";
import { WireBox, WireButton } from "@/components/wireframe";
import { Maximize2, X, HelpCircle, Loader2, BookOpen } from "lucide-react";
import { SaveToDashboard } from "@/components/SaveToDashboard";
import { HelpFloatMenu } from "@/components/HelpFloatMenu";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

//  Types

type ChartType = "bar" | "line" | "pie" | "scatter" | "table";

interface DataRow {
  [key: string]: string | number;
  offence: string;
  count: number;
  cat1?: string;
  cat2?: string;
}

// Colours 

const COLOURS = [
  "#2d4a7a", "#8b3a2a", "#6b7c3a", "#a07c2a", "#4a6b8a",
  "#7a4a6b", "#3a7a6b", "#8a6b3a", "#4a4a7a", "#7a3a4a",
  "#5a8a5a", "#8a5a2a", "#3a5a8a", "#6a3a7a", "#7a6a3a",
];

// Helpers

const makeSubtitle = (mode: string, cat1: string, cat2: string) => {
  if (mode === "double" && cat1 && cat2) return `${cat1} × ${cat2} - side-by-side comparison`;
  if (cat1) return `${cat1} - side-by-side comparison`;
  return "Side-by-side Canadian CEF disciplinary patterns";
};

// buildCompareFindings

function buildCompareFindings(dataA: DataRow[], dataB: DataRow[]): string[] {
  if (dataA.length === 0 && dataB.length === 0) return [];

  const findings: string[] = [];

  // Aggregate counts per offence for each group 
  const sumByOffence = (data: DataRow[]) => {
    const map: Record<string, number> = {};
    data.forEach((row) => {
      const offences = String(row.offence).split(",").map((o) => o.trim()).filter(Boolean);
      // No rounding here - divide evenly and accumulate as floats
      const perOffence = (row.count as number) / offences.length;
      offences.forEach((o) => { map[o] = (map[o] ?? 0) + perOffence; });
    });
    return map;
  };

  const mapA = sumByOffence(dataA);
  const mapB = sumByOffence(dataB);

  const totalA = Object.values(mapA).reduce((s, v) => s + v, 0);
  const totalB = Object.values(mapB).reduce((s, v) => s + v, 0);

  if (totalA === 0 && totalB === 0) return ["No court martial records matched the selected filters for either group."];

  const allOffenceKeys = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
  const isSingleOffence = allOffenceKeys.size === 1;
  const singleOffenceName = isSingleOffence ? [...allOffenceKeys][0] : null;

  //  Finding 1: Overall volume 
  if (totalA > 0 && totalB > 0) {
    const higher = totalA > totalB ? "A" : "B";
    const lower  = totalA > totalB ? "B" : "A";
    const highTotal = Math.round(totalA > totalB ? totalA : totalB);
    const lowTotal  = Math.round(totalA > totalB ? totalB : totalA);
    const ratio = (highTotal / lowTotal).toFixed(1);
    if (isSingleOffence) {
      findings.push(
        `Both groups are filtered to the same offence type - ${singleOffenceName}. ` +
        `Group ${higher} recorded more proceedings (${highTotal.toLocaleString()} vs ${lowTotal.toLocaleString()}, ` +
        `approximately ${ratio}× more than Group ${lower}).`
      );
    } else {
      findings.push(
        `Group ${higher} has a higher overall volume of proceedings (${highTotal.toLocaleString()} vs ${lowTotal.toLocaleString()}), ` +
        `approximately ${ratio}× more than Group ${lower}.`
      );
    }
  } else if (totalA === 0) {
    findings.push("Group A returned no court martial records for the selected filters.");
  } else {
    findings.push("Group B returned no court martial records for the selected filters.");
  }

  // Finding 2: Top offence / single-offence direct comparison 
  const topA = Object.entries(mapA).sort(([, a], [, b]) => b - a)[0];
  const topB = Object.entries(mapB).sort(([, a], [, b]) => b - a)[0];

  if (isSingleOffence && totalA > 0 && totalB > 0) {
    const higher = totalA > totalB ? "A" : "B";
    findings.push(
      `Since only one offence type is selected, the comparison reflects how frequently each group was charged with ` +
      `${singleOffenceName}. Group ${higher} accounts for more of these proceedings, ` +
      `suggesting ${higher === "A" ? "Group A's" : "Group B's"} demographic profile is more associated with this offence.`
    );
  } else if (topA && topB) {
    const pctA = totalA > 0 ? Math.round((topA[1] / totalA) * 10000) / 100 : 0;
    const pctB = totalB > 0 ? Math.round((topB[1] / totalB) * 10000) / 100 : 0;

    if (topA[0] === topB[0]) {
      findings.push(
        `Both groups share the same dominant offence - ${topA[0]} - ` +
        `accounting for ${pctA.toFixed(2)}% of Group A's proceedings and ${pctB.toFixed(2)}% of Group B's. ` +
        `The similarity in top offence suggests comparable disciplinary pressures, though the proportions differ.`
      );
    } else {
      findings.push(
        `The leading offence differs between groups: Group A is concentrated in ${topA[0]} (${pctA.toFixed(2)}% of proceedings), ` +
        `while Group B's highest category is ${topB[0]} (${pctB.toFixed(2)}%). ` +
        `This divergence suggests distinct disciplinary patterns between the two groups.`
      );
    }
  }

  // Finding 3: Concentration vs spread 
  if (!isSingleOffence && totalA > 0 && totalB > 0) {
    const top3Pct = (map: Record<string, number>, total: number) => {
      if (total === 0) return 0;
      const sorted = Object.values(map).sort((a, b) => b - a).slice(0, 3);
      return Math.round((sorted.reduce((s, v) => s + v, 0) / total) * 10000) / 100;
    };

    const concA = top3Pct(mapA, totalA);
    const concB = top3Pct(mapB, totalB);
    const moreConc = concA > concB ? "A" : "B";
    const lessConc = concA > concB ? "B" : "A";
    const highConc = Math.max(concA, concB);
    const lowConc  = Math.min(concA, concB);

    if (Math.abs(concA - concB) >= 8) {
      findings.push(
        `Group ${moreConc}'s proceedings are more concentrated - the top 3 offences account for ${highConc.toFixed(2)}% of its total, ` +
        `compared to ${lowConc.toFixed(2)}% for Group ${lessConc}. ` +
        `Group ${lessConc} has a more distributed pattern across offence types.`
      );
    } else {
      findings.push(
        `Both groups show similar concentration: the top 3 offences account for ${concA.toFixed(2)}% of Group A's proceedings ` +
        `and ${concB.toFixed(2)}% of Group B's, suggesting comparable offence distributions overall.`
      );
    }
  }

  // Finding 4: Offences unique to one group 
  const onlyInA = isSingleOffence ? [] : Object.keys(mapA).filter((o) => !mapB[o] && mapA[o] > 0);
  const onlyInB = isSingleOffence ? [] : Object.keys(mapB).filter((o) => !mapA[o] && mapB[o] > 0);

  if (onlyInA.length > 0 || onlyInB.length > 0) {
    const parts: string[] = [];
    if (onlyInA.length > 0) parts.push(`Group A has ${onlyInA.length} offence type${onlyInA.length > 1 ? "s" : ""} not present in Group B (${onlyInA.slice(0, 2).join(", ")}${onlyInA.length > 2 ? ", and others" : ""})`);
    if (onlyInB.length > 0) parts.push(`Group B has ${onlyInB.length} offence type${onlyInB.length > 1 ? "s" : ""} not present in Group A (${onlyInB.slice(0, 2).join(", ")}${onlyInB.length > 2 ? ", and others" : ""})`);
    findings.push(parts.join("; ") + ". These exclusive offences may reflect different operational contexts or record-keeping practices.");
  }

  // Finding 5: Largest relative difference on a shared offence 
  const sharedOffences = isSingleOffence ? [] : Object.keys(mapA).filter((o) => mapB[o] !== undefined && mapA[o] > 0 && mapB[o] > 0);
  if (sharedOffences.length > 0 && totalA > 0 && totalB > 0) {
    const diffs = sharedOffences.map((o) => {
      const rateA = mapA[o] / totalA;
      const rateB = mapB[o] / totalB;
      return { offence: o, diff: Math.abs(rateA - rateB), rateA, rateB };
    }).sort((a, b) => b.diff - a.diff);

    const biggest = diffs[0];
    const higherGroup = biggest.rateA > biggest.rateB ? "A" : "B";
    const lowerGroup  = biggest.rateA > biggest.rateB ? "B" : "A";
    const highPct = Math.round(Math.max(biggest.rateA, biggest.rateB) * 10000) / 100;
    const lowPct  = Math.round(Math.min(biggest.rateA, biggest.rateB) * 10000) / 100;

    findings.push(
      `The largest proportional gap between groups is on ${biggest.offence}: ` +
      `${highPct.toFixed(2)}% of Group ${higherGroup}'s proceedings vs ${lowPct.toFixed(2)}% of Group ${lowerGroup}'s - ` +
      `a ${(highPct - lowPct).toFixed(2)} percentage point difference.`
    );
  }

  // Finding 6: Caveat 
  findings.push(
    "Statistical significance testing is recommended before drawing firm conclusions - " +
    "observed differences may reflect group size disparities or selection filters rather than genuine behavioural patterns."
  );

  return findings;
}

// Chart type selector 

const CHART_TYPES: { type: ChartType; label: string }[] = [
  { type: "bar", label: "Bar" },
  { type: "line", label: "Line" },
  { type: "pie", label: "Pie" },
  { type: "scatter", label: "Scatter" },
  { type: "table", label: "Table" },
];

const CHART_DESCRIPTIONS: Record<ChartType, string> = {
  bar: "Stacked bars show raw offence counts, making it easy to compare totals and see which offences dominate.",
  line: "Lines trace offence counts across categories, highlighting trends and crossover points.",
  pie: "Pie slices show the proportional share of each group, useful for comparing relative composition.",
  scatter: "Scatter plots display total offence counts per category as individual points, revealing outliers.",
  table: "A tabular view listing every offence count for precise numeric comparison.",
};

const ChartTypeSelector = ({
  value,
  onChange,
}: {
  value: ChartType;
  onChange: (t: ChartType) => void;
}) => (
  <div className="mb-3">
    <div className="flex gap-1 flex-wrap">
      <span className="text-xs font-body font-semibold uppercase tracking-wide text-muted-foreground pt-1 mr-1">
        VIEW AS:
      </span>
      {CHART_TYPES.map(({ type, label }) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`px-3 py-1 text-xs border rounded font-body transition-all ${
            value === type
              ? "border-olive bg-olive/10 text-foreground"
              : "border-border text-muted-foreground hover:border-olive/60 hover:bg-olive/5 hover:shadow-sm"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
    <p className="text-xs font-body text-muted-foreground mt-1.5">{CHART_DESCRIPTIONS[value]}</p>
  </div>
);

// Chart renderer 

const RealChart = ({
  data,
  chartType,
}: {
  data: DataRow[];
  chartType: ChartType;
}) => {
  const hasDoubleCat = data.length > 0 && "cat1" in data[0] && "cat2" in data[0];

  const normalised: DataRow[] = hasDoubleCat
    ? data.map((row) => ({
        ...row,
        _group: `${row.cat1}, ${row.cat2}`,
      }))
    : data;

  const primaryKey = hasDoubleCat
    ? "_group"
    : Object.keys(data[0] || {}).find((k) => k !== "offence" && k !== "count");

  if (!primaryKey || normalised.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground font-body">
        No data to display.
      </div>
    );
  }

  const expandedData = normalised.flatMap((row) => {
    const offenceList = (row.offence as string).split(",").map((o) => o.trim()).filter(Boolean);
    if (offenceList.length <= 1) return [row];
    return offenceList.map((o) => ({
      ...row,
      offence: o,
      count: Math.round((row.count as number) / offenceList.length),
    }));
  });

  const offences = [...new Set(expandedData.map((d) => d.offence as string))];

  const grouped = expandedData.reduce((acc: any[], row) => {
    const existing = acc.find((r) => r[primaryKey] === row[primaryKey]);
    if (existing) {
      existing[row.offence] = (existing[row.offence] || 0) + (row.count as number);
    } else {
      acc.push({ [primaryKey]: row[primaryKey], [row.offence]: row.count });
    }
    return acc;
  }, []);

  if (chartType === "table") {
    const tableRows = grouped.flatMap((row) =>
      offences
        .filter((o) => row[o] !== undefined)
        .map((o) => ({ [primaryKey]: row[primaryKey], offence: o, count: row[o] }))
    );
    return (
      <div className="overflow-auto h-full">
        <table className="w-full text-xs font-body border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-2 text-muted-foreground uppercase tracking-wide">
                {primaryKey.replace(/_/g, " ")}
              </th>
              <th className="text-left p-2 text-muted-foreground uppercase tracking-wide">Offence</th>
              <th className="text-right p-2 text-muted-foreground uppercase tracking-wide">Count</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-olive/8">
                <td className="p-2">{String(row[primaryKey])}</td>
                <td className="p-2">{row.offence}</td>
                <td className="p-2 text-right">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const many = grouped.length > 6;
  const truncLen = many ? Math.max(8, Math.floor(60 / grouped.length) + 4) : 25;
  const xTickFmt = (v: string | number) => { const s = String(v); return s.length > truncLen ? s.slice(0, truncLen) + "..." : s; };
  const legendItems = offences.map((o, i) => ({ name: o, color: COLOURS[i % COLOURS.length] }));

  const CustomLegend = () => legendItems.length > 1 ? (
    <div className="flex-shrink-0 overflow-y-auto border-t border-border/50 px-2 pt-2 mt-1" style={{ maxHeight: 120 }}>
      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
        {legendItems.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] font-body text-foreground whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            {item.name}
          </div>
        ))}
      </div>
    </div>
  ) : null;

  if (chartType === "pie") {
    const pieData = grouped.map((row) => ({
      name: String(row[primaryKey]),
      value: offences.reduce((sum, o) => sum + (row[o] || 0), 0),
    }));
    return (
      <div className="w-full h-full flex flex-col">
        <div style={{ minHeight: "60%", flex: "1 1 auto" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius="80%">
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val) => [val, "Count"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-shrink-0 overflow-y-auto border-t border-border/50 px-2 pt-2 mt-1" style={{ maxHeight: 120 }}>
          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
            {pieData.map((entry, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] font-body text-foreground whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLOURS[i % COLOURS.length] }} />
                {String(entry.name)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (chartType === "scatter") {
    const scatterData = grouped.map((row) => ({
      [primaryKey]: row[primaryKey],
      count: offences.reduce((sum, o) => sum + (row[o] || 0), 0),
    }));
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <XAxis
            dataKey={primaryKey}
            name={primaryKey.replace(/_/g, " ")}
            tick={{ fontSize: many ? 8 : 11 }}
            interval={0}
            angle={many ? -55 : grouped.length > 4 ? -35 : 0}
            textAnchor={many || grouped.length > 4 ? "end" : "middle"}
            height={many ? 100 : grouped.length > 4 ? 80 : 30}
            tickFormatter={xTickFmt}
          />
          <YAxis dataKey="count" name="Total Offences" tick={{ fontSize: 11 }} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(val) => [val, "Total Offences"]} />
          <Scatter data={scatterData} fill={COLOURS[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "line") {
    return (
      <div className="w-full h-full flex flex-col">
        <div style={{ minHeight: "60%", flex: "1 1 auto" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={grouped}>
              <XAxis
                dataKey={primaryKey}
                tick={{ fontSize: many ? 8 : 11 }}
                interval={0}
                angle={many ? -55 : grouped.length > 4 ? -35 : 0}
                textAnchor={many || grouped.length > 4 ? "end" : "middle"}
                height={many ? 100 : grouped.length > 4 ? 80 : 30}
                tickFormatter={xTickFmt}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              {offences.map((offence, i) => (
                <Line
                  key={offence}
                  type="monotone"
                  dataKey={offence}
                  stroke={COLOURS[i % COLOURS.length]}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <CustomLegend />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div style={{ minHeight: "60%", flex: "1 1 auto" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={grouped}>
            <XAxis
              dataKey={primaryKey}
              tick={{ fontSize: many ? 8 : 10 }}
              interval={0}
              angle={many ? -55 : grouped.length > 4 ? -35 : 0}
              textAnchor={many || grouped.length > 4 ? "end" : "middle"}
              height={many ? 100 : grouped.length > 4 ? 80 : 30}
              tickFormatter={xTickFmt}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {offences.map((offence, i) => (
              <Bar
                key={offence}
                dataKey={offence}
                stackId="a"
                fill={COLOURS[i % COLOURS.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <CustomLegend />
    </div>
  );
};

// Panel 

const Panel = ({
  label,
  data,
  color,
  filterLabel,
  loading,
}: {
  label: string;
  data: DataRow[];
  color: string;
  filterLabel?: string;
  loading: boolean;
}) => {
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [fullscreen, setFullscreen] = useState(false);

  const hasDoubleCats = data.length > 0 && "cat1" in data[0] && "cat2" in data[0];
  const uniqueGroups = hasDoubleCats
    ? new Set(data.map((d) => `${d.cat1}, ${d.cat2}`)).size
    : (() => {
        const pk = Object.keys(data[0] || {}).find((k) => k !== "offence" && k !== "count");
        return pk ? new Set(data.map((d) => d[pk])).size : data.length;
      })();

  const chartContent = (
    <>
      <div className="flex flex-col items-center mb-3">
        <div className="flex items-center justify-between w-full">
          <div className="flex-1" />
          <span
            className={`inline-flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br ${color} font-serif font-bold text-parchment text-sm shadow-sm`}
          >
            {label}
          </span>
          <div className="flex-1 flex justify-end">
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-1.5 rounded-sm border border-border text-muted-foreground hover:text-foreground hover:border-olive/60 hover:bg-olive/5 hover:shadow-sm transition-all duration-200"
              title={fullscreen ? "Exit fullscreen" : "Expand"}
            >
              {fullscreen ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {filterLabel && (
          <p className="text-[10px] font-body text-muted-foreground mt-1.5 normal-case tracking-normal max-w-xs text-center">
            {filterLabel}
          </p>
        )}
      </div>

      <ChartTypeSelector value={chartType} onChange={setChartType} />

      <div style={{ height: fullscreen
        ? (chartType === "bar" && uniqueGroups > 8 ? `${Math.min(Math.max(Math.round(70 * window.innerHeight / 100), uniqueGroups * 40), Math.round(90 * window.innerHeight / 100))}px` : "70vh")
        : (chartType === "bar" && uniqueGroups > 8 ? `${Math.min(Math.max(500, uniqueGroups * 40), 700)}px` : "28rem")
      }}>
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-body">Loading data...</span>
          </div>
        ) : (
          <RealChart data={data} chartType={chartType} />
        )}
      </div>
    </>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="w-full max-w-5xl panel p-6">{chartContent}</div>
      </div>
    );
  }

  return (
    <WireBox dashed={false} className="flex-1 p-5">
      {chartContent}
    </WireBox>
  );
};

//  Main page 
const CompareResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const mode = searchParams.get("mode") || "single";
  const cat1 = searchParams.get("cat1") || "";
  const cat2 = searchParams.get("cat2") || "";

  const [dataA, setDataA] = useState<DataRow[]>([]);
  const [dataB, setDataB] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getList = (key: string) =>
    searchParams.get(key)?.split(",").filter(Boolean) || [];

  const getSummary = (group: "A" | "B"): string => {
    const parts: string[] = [];
    const cats = mode === "double" ? [cat1, cat2] : [cat1];
    cats.forEach((cat) => {
      switch (cat) {
        case "Unit Type": { const v = getList(`unit${group}`); if (v.length) parts.push(`Unit: ${v.join(", ")}`); break; }
        case "Rank": { const v = getList(`rank${group}`); if (v.length) parts.push(`Rank: ${v.join(", ")}`); break; }
        case "Place of Birth": { const v = getList(`province${group}`); if (v.length) parts.push(`Place of Birth: ${v.join(", ")}`); break; }
        case "Occupation": { const v = getList(`occupation${group}`); if (v.length) parts.push(`Occupation: ${v.join(", ")}`); break; }
        case "Marital Status": { const v = getList(`marriage${group}`); if (v.length) parts.push(`Marital Status: ${v.join(", ")}`); break; }
        case "Enlistment Year": {
          const s = searchParams.get(`timeStart${group}`);
          const e = searchParams.get(`timeEnd${group}`);
          if (s && e) parts.push(`Enlistment Year: ${s}-${e}`);
          break;
        }
        case "Year of Birth": {
          const s = searchParams.get(`ageStart${group}`);
          const e = searchParams.get(`ageEnd${group}`);
          if (s && e) parts.push(`Year of Birth: ${s}-${e}`);
          break;
        }
      }
    });
    const offences = getList(`offence${group}`);
    if (offences.length) parts.push(`Offences: ${offences.join(", ")}`);
    return parts.length > 0 ? parts.join(" · ") : "All";
  };

  const buildGroup = (group: "A" | "B") => {
    const g = group;
    const paramMap: Record<string, string> = {
      "Rank": `rank${g}`,
      "Unit Type": `unit${g}`,
      "Place of Birth": `province${g}`,
      "Occupation": `occupation${g}`,
      "Marital Status": `marriage${g}`,
    };

    const base: any = {
      offences: getList(`offence${g}`),
    };

    const cats = mode === "double" ? [cat1, cat2] : [cat1];

    cats.forEach((cat, index) => {
      if (cat === "Enlistment Year" || cat === "Year of Birth") {
        const isEnlistment = cat === "Enlistment Year";
        const s = parseInt(searchParams.get(isEnlistment ? `timeStart${g}` : `ageStart${g}`) || "0");
        const e = parseInt(searchParams.get(isEnlistment ? `timeEnd${g}` : `ageEnd${g}`) || "0");
        if (base.start !== undefined) {
          base.start2 = s;
          base.end2 = e;
        } else {
          base.start = s;
          base.end = e;
        }
      } else {
        const key = index === 0 ? "cat1Values" : "cat2Values";
        base[key] = getList(paramMap[cat] || "");
      }
    });

    return base;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            cat1,
            cat2,
            groupA: buildGroup("A"),
            groupB: buildGroup("B"),
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          setError(err.error || "An error occurred.");
          return;
        }

        const result = await response.json();
        setDataA(result.groupA);
        setDataB(result.groupB);
      } catch (e) {
        setError("Failed to connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const compareFindings = useMemo(
    () => buildCompareFindings(dataA, dataB),
    [dataA, dataB]
  );

  const subtitle = makeSubtitle(mode, cat1, cat2);

  return (
    <PageLayout code="P-06" title="Comparison Results" subtitle={subtitle}>
      <div className="p-4 bg-muted/20 border border-border rounded-md -mt-2">
        <div className="flex items-start gap-2 mb-2">
          <HelpCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
          <span className="text-xs font-body font-semibold uppercase tracking-wide text-gold">
            How to read the results
          </span>
        </div>
        <p className="text-sm font-body text-muted-foreground mb-2">
          Look for differences in offence distributions, frequencies, and proportions between Group A and Group B - larger gaps suggest a meaningful difference in how each group was disciplined.
        </p>
        <ul className="space-y-1 text-sm font-body text-muted-foreground">
          <li className="flex items-start gap-2"><span className="text-gold">•</span> Bars represent offence frequency.</li>
          <li className="flex items-start gap-2"><span className="text-gold">•</span> Colors represent different offence categories.</li>
          <li className="flex items-start gap-2"><span className="text-gold">•</span> Differences between the charts highlight how disciplinary patterns vary between the two groups.</li>
        </ul>
        <div className="flex items-center gap-4 mt-2">
          <Link
            to="/metadata"
            className="inline-flex items-center gap-1.5 text-xs font-body text-olive hover:text-olive-light hover:bg-olive/10 transition-all duration-200 underline underline-offset-2 rounded-sm px-1 -mx-1 py-0.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            View dataset information
          </Link>
          <Link
            to="/user-manual#um-compare"
            className="inline-flex items-center gap-1.5 text-xs font-body text-olive hover:text-olive-light hover:bg-olive/10 transition-all duration-200 underline underline-offset-2 rounded-sm px-1 -mx-1 py-0.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            View in User Manual
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 font-body">
          {error}
        </div>
      )}

      <div id="export-capture" className="flex flex-col lg:flex-row gap-4">
        <Panel
          label="A"
          data={dataA}
          color="from-navy to-slate-blue"
          filterLabel={getSummary("A")}
          loading={loading}
        />
        <Panel
          label="B"
          data={dataB}
          color="from-rust to-copper"
          filterLabel={getSummary("B")}
          loading={loading}
        />
      </div>

      {!loading && compareFindings.length > 0 && (
        <WireBox dashed={false} accent="olive" label="KEY DIFFERENCES">
          <ul className="space-y-4 text-sm font-body text-muted-foreground">
            {compareFindings.map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-olive mt-0.5 font-bold">{i + 1}.</span>
                <span className="leading-relaxed">{f}</span>
              </li>
            ))}
          </ul>
        </WireBox>
      )}

      <div className="flex flex-wrap gap-3 justify-center items-center">
        <SaveToDashboard
          reportName={cat2 ? "Double Category Analysis" : "Single Category Analysis"}
          reportType="Comparison"
          parameters={{ mode, cat1, cat2 }}
        />
        <WireButton onClick={() => navigate(-1)}>Adjust Comparison</WireButton>
        <WireButton onClick={async () => {
          const el = document.getElementById("export-capture");
          let imageData: string | undefined;
          if (el) {
            try {
              const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2, useCORS: true, logging: false });
              imageData = canvas.toDataURL("image/png");
            } catch (e) {
              console.warn("Chart capture failed:", e);
            }
          }
          setExportPayload({
            title: "Comparison Results",
            subtitle: subtitle,
            insights: compareFindings,
            imageData,
          });
          navigate("/export?from=compare");
        }}>Export</WireButton>
      </div>

      <HelpFloatMenu manualSectionId="um-compare" />
    </PageLayout>
  );
};

export default CompareResults;
