import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import html2canvas from "html2canvas"
import { setExportPayload } from "@/lib/exportStore"
import { PageLayout } from "@/components/PageLayout";
import { WireBox, WireButton } from "@/components/wireframe";
import { SaveToDashboard } from "@/components/SaveToDashboard";
import { HelpFloatMenu } from "@/components/HelpFloatMenu";
import { ChevronDown, ChevronUp, Maximize2, X, HelpCircle, Lightbulb, Info, Download, BookOpen } from "lucide-react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

const dots = [
    { x: 12, y: 45, unit: "Artillery", cluster: 0, topOffence: "AWOL", rankComp: "78% Private", freq: 29 },
    { x: 15, y: 42, unit: "Cavalry & Mounted", cluster: 0, topOffence: "Desertion", rankComp: "80% Private", freq: 31 },
    { x: 18, y: 48, unit: "Machine Gun Corps", cluster: 0, topOffence: "AWOL", rankComp: "75% Private", freq: 27 },
    { x: 14, y: 44, unit: "Engineers & Signals", cluster: 0, topOffence: "AWOL", rankComp: "79% Private", freq: 33 },
    { x: 55, y: 30, unit: "Service", cluster: 1, topOffence: "Drunkenness", rankComp: "70% Private", freq: 22 },
    { x: 58, y: 35, unit: "Forestry Corps", cluster: 1, topOffence: "Drunkenness", rankComp: "65% Private", freq: 19 },
    { x: 52, y: 28, unit: "Reserves & Training", cluster: 1, topOffence: "Drunkenness", rankComp: "72% Private", freq: 25 },
    { x: 35, y: 70, unit: "Medical", cluster: 2, topOffence: "Insubordination", rankComp: "60% Private", freq: 15 },
    { x: 38, y: 75, unit: "Headquarters", cluster: 2, topOffence: "Desertion", rankComp: "55% Private", freq: 12 },
    { x: 40, y: 72, unit: "Police", cluster: 2, topOffence: "Disobedience", rankComp: "58% Private", freq: 14 },
];

const offenceHeaders = ["Desertion", "AWOL", "Drunkenness", "Neglect of Duty", "Conduct Prejudicial"];
const rankRows = [
    { rank: "Cadet", values: [3, 5, 4, 2, 1] },
    { rank: "Private", values: [120, 180, 150, 90, 65] },
    { rank: "Corporal", values: [45, 60, 55, 30, 22] },
    { rank: "Sergeant", values: [25, 35, 30, 18, 12] },
    { rank: "Sergeant-Major", values: [10, 15, 12, 7, 5] },
    { rank: "Lieutenant", values: [8, 12, 14, 6, 4] },
    { rank: "Captain", values: [5, 7, 9, 4, 3] },
    { rank: "Major", values: [3, 4, 5, 2, 1] },
    { rank: "Colonel", values: [1, 2, 2, 1, 1] },
];

const maxVal = Math.max(...rankRows.flatMap(r => r.values));
const warmColor = (value: number) => {
  const t = value / maxVal;
  if (t < 0.33) {
    return `hsl(45 90% ${90 - t * 60}%)`;
  } else if (t < 0.66) {
    return `hsl(30 85% ${75 - (t - 0.33) * 80}%)`;
  }
  return `hsl(12 75% ${55 - (t - 0.66) * 50}%)`;
};

const textColor = (value: number) => {
  const t = value / maxVal;
  return t > 0.5 ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))";
};
const treeSummary = [
    { group: "Group A", characteristics: "Private, Combat Unit Types", offence: "AWOL" },
    { group: "Group B", characteristics: "Corporal / Sergeant", offence: "Drunkenness" },
    { group: "Group C", characteristics: "Support Unit Types", offence: "Conduct Prejudicial" },
];

const features = [
    { name: "Offence Type", value: 35, desc: "What soldiers were charged with" },
    { name: "Offence Frequency", value: 28, desc: "How often offences occurred" },
    { name: "Rank Structure", value: 22, desc: "Mix of ranks in each unit type" },
    { name: "Age Group", value: 10, desc: "Ages of personnel" },
    { name: "Origin", value: 5, desc: "Where personnel came from" },
];

const clusterColors = [
    "hsl(var(--navy))",
    "hsl(var(--olive))",
    "hsl(var(--rust))",
];
const patternGroups: Record<string, { label: string; desc: string; unitTypes: string }[]> = {
    clustering: [
        { label: "Group A - Combat unit types", desc: "Mostly absence-related offences like AWOL and desertion", unitTypes: "Artillery, Cavalry & Mounted, Machine Gun Corps, Engineers & Signals" },
        { label: "Group B - Support & logistics", desc: "Mostly alcohol-related offences", unitTypes: "Service, Forestry Corps, Reserves & Training" },
        { label: "Group C - Administrative & specialist", desc: "Insubordination, disobedience, and other offences", unitTypes: "Medical, Headquarters, Police" },
    ],
  heatmap: [
    { label: "Lower ranks - High frequency", desc: "Privates and Corporals account for the majority of cases across all offence types", unitTypes: "Private, Corporal" },
    { label: "NCOs - Moderate frequency", desc: "Sergeants and Sergeant-Majors show moderate but consistent offence patterns", unitTypes: "Sergeant, Sergeant-Major" },
    { label: "Officers - Lower frequency", desc: "Lieutenants and Captains have fewer cases overall but drunkenness remains notable", unitTypes: "Lieutenant, Captain" },
  ],
    hierarchical: [
        { label: "Group A - AWOL & Neglect", desc: "Privates in combat unit types show highest concentrations of AWOL and neglect of duty", unitTypes: "Private, Artillery, Cavalry & Mounted" },
        { label: "Group B - Drunkenness", desc: "Corporals and sergeants are most associated with drunkenness offences", unitTypes: "Corporal, Sergeant" },
        { label: "Group C - Conduct Prejudicial", desc: "Support unit type personnel show more conduct prejudicial cases", unitTypes: "Service, Medical, Headquarters" },
    ],
};

const keyFindings: Record<string, string[]> = {
    clustering: [
        "Lower ranks appear more frequently in offences across all unit type groups.",
        "Combat unit types show very similar disciplinary patterns - particularly Artillery and Cavalry & Mounted.",
        "Age group differences appear in some offence types, especially insubordination.",
    ],
  heatmap: [
    "AWOL appears most frequently among lower ranks.",
    "Drunkenness cases occur across multiple ranks but are concentrated among Privates.",
    "Some offences are concentrated in specific ranks - Neglect of Duty drops sharply above Corporal.",
  ],
    hierarchical: [
        "Rank appears to be the strongest factor associated with disciplinary outcomes.",
        "Lower ranks show higher concentrations of AWOL cases.",
        "Certain unit types show different offence patterns - combat vs. support unit types.",
    ],
};

const ChartTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-md p-3 text-xs font-body shadow-lg max-w-[200px]">
      <p className="font-semibold text-sm mb-1">{d.unit}</p>
      {d.topOffence && <p className="text-muted-foreground">Most common offence: <span className="text-foreground font-medium">{d.topOffence}</span></p>}
      {d.rankComp && <p className="text-muted-foreground">Rank makeup: <span className="text-foreground font-medium">{d.rankComp}</span></p>}
      {d.freq && <p className="text-muted-foreground">Total cases: <span className="text-foreground font-medium">{d.freq}</span></p>}
    </div>
  );
};

const guideTitles: Record<string, string> = {
  clustering: "How to Read the Pattern Map",
  heatmap: "How to Read the Heatmap",
  hierarchical: "How to Read This Diagram",
};
const ReadingGuide = ({ lines, method }: { lines: string[]; method?: string }) => (
  <div className="flex items-start gap-2.5 bg-muted/50 border border-border rounded-md px-3 py-2.5 mb-4">
    <HelpCircle className="w-4 h-4 text-navy flex-shrink-0 mt-0.5" />
    <div className="text-xs font-body text-muted-foreground space-y-0.5">
      <p className="font-semibold text-foreground text-xs">{guideTitles[method || "clustering"] || "How to Read This"}</p>
      {lines.map((line, i) => <p key={i}>{line}</p>)}
    </div>
  </div>
);

const FullscreenPanel = ({ children, title }: { children: React.ReactNode; title: string }) => {
   const [full, setFull] = useState(false);
   const content = (
      <div className={full ? "p-6" : ""}>
         <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-muted-foreground uppercase">{title}</span>
            <button onClick={() => setFull(!full)} className="p-1.5 rounded-md border border-border hover:bg-olive/10 hover:border-olive/40 hover:shadow-sm transition-all duration-200" title={full ? "Minimize" : "Expand"}>
               {full ? <X className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
         </div>
         {children}
      </div>
   );
   if (full) {
      return (
         <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-auto flex items-start justify-center pt-8 pb-8">
            <div className="w-full max-w-4xl panel shadow-xl">{content}</div>
         </div>
      );
   }
   return <>{content}</>;
};

const guides: Record<string, string[]> = {
  clustering: [
    "Each dot represents one unit type.",
    "Dots close together had similar disciplinary records.",
    "Colours show which group each unit type belongs to.",
    "Hover over a dot to see the unit type and details.",
  ],
  heatmap: [
    "Rows represent groups being analyzed (in this case, rank).",
    "Columns represent offence categories.",
    "Darker colours indicate higher frequencies of that offence.",
    "Lighter colours indicate fewer recorded cases.",
    "This allows you to quickly identify patterns in the dataset.",
  ],
  hierarchical: [
    "Each branch splits the dataset based on a characteristic.",
    "The branches show how disciplinary patterns differ between groups.",
    "The top branches represent the strongest influences on disciplinary outcomes.",
    "In this tree, rank appears as the first split, indicating it is strongly associated with disciplinary patterns.",
  ],
};

const titles: Record<string, string> = {
  clustering: "Pattern Map",
  heatmap: "Offence Pattern Heatmap",
  hierarchical: "Disciplinary Pattern Tree",
};

const captions: Record<string, string> = {
  clustering: "Unit types within the same colour group share similar disciplinary patterns based on offence types, frequency, and personnel characteristics.",
  heatmap: "This heatmap shows how frequently different offences appear across selected groups in the dataset. Darker colours indicate higher concentrations of disciplinary cases.",
  hierarchical: "This tree diagram shows how different characteristics of court-martialed soldiers relate to disciplinary patterns. The system divides data into groups based on characteristics that best explain differences in offence patterns.",
};


const AnalysisResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const method = searchParams.get("method") || "clustering";
  const [metaOpen, setMetaOpen] = useState(false);
  const [showDataTable, setShowDataTable] = useState(false);
  const findings = keyFindings[method] || keyFindings.clustering;
  const groups = patternGroups[method] || patternGroups.clustering;

  const guide = guides[method] || guides.clustering;
  const vizTitle = titles[method] || titles.clustering;
  return (
      <PageLayout code="P-09" title="Pattern Insights from Courts Martial Records" subtitle="What the analysis found in the CEF disciplinary data">

         <p className="text-sm text-muted-foreground font-body">
          These results summarize patterns identified in Canadian Expeditionary Force courts martial records. Look for groupings of similar unit types, concentrations of specific offences, and how rank structure relates to disciplinary outcomes.
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

        {method === "clustering" && (
            <WireBox dashed={false} className="bg-navy/5 border-navy/20">
              <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-navy flex-shrink-0 mt-0.5" />
                   <div className="text-xs font-body text-muted-foreground space-y-1.5">
                    <p className="font-semibold text-foreground text-sm">Pattern Map - Courts Martial Records</p>
                    <p>This scatter plot groups CEF unit types by similarity in their disciplinary profiles. Unit types that appear close together share similar offence patterns, frequencies, and personnel characteristics.</p>
                  </div>
              </div>
            </WireBox>
        )}

        {method === "heatmap" && (
            <WireBox dashed={false} className="bg-navy/5 border-navy/20">
              <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-navy flex-shrink-0 mt-0.5" />
                <div className="text-xs font-body text-muted-foreground space-y-1.5">
                    <p className="font-semibold text-foreground text-sm">Offence Pattern Heatmap - Courts Martial Records</p>
                     <p>This heatmap shows how frequently different offences appear across selected groups in the dataset.</p>
                    <p>Rows represent military ranks, and columns represent offence types.</p>
                    <p>Darker colours indicate higher concentrations of disciplinary cases.</p>
                  </div>
              </div>
            </WireBox>
        )}
        {method === "hierarchical" && (
          <WireBox dashed={false} className="bg-navy/5 border-navy/20">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-navy flex-shrink-0 mt-0.5" />
               <div className="text-xs font-body text-muted-foreground space-y-1.5">
                <p className="font-semibold text-foreground text-sm">Disciplinary Pattern Tree - Courts Martial Records</p>
                <p>This tree diagram shows how different characteristics of court-martialed soldiers relate to disciplinary patterns in the dataset.</p>
                 <p>The system divides the data into groups based on the characteristics that best explain differences in offence patterns.</p>
              </div>
            </div>
          </WireBox>
        )}

        <WireBox dashed={false} label="KEY OBSERVATIONS" accent="olive" className="bg-olive/5 border-olive/20">
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-olive/10 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-4 h-4 text-olive" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-body text-muted-foreground mb-2">These observations help identify patterns in disciplinary behaviour across the dataset.</p>
                  <ul className="text-sm font-body space-y-2">
                    {findings.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-olive mt-0.5 flex-shrink-0">•</span>
                        <span className="text-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
            </div>
        </WireBox>

        <div id="export-capture">
          <WireBox dashed={false} label="PATTERN VISUALIZATION" accent="navy">
          <FullscreenPanel title={vizTitle}>
            <ReadingGuide lines={guide} method={method} />

              <div className={method === "heatmap" || method === "hierarchical" ? "" : "h-80"}>
                {method === "heatmap" ? (
                    <div className="space-y-4">
                      <div className="overflow-auto">
                          <table className="w-full text-xs font-body border-collapse">
                            <thead>
                              <tr>
                                <th className="text-left py-2.5 px-3 text-muted-foreground font-semibold border-b-2 border-border min-w-[120px]">Rank / Offence</th>
                                {offenceHeaders.map(o => (
                                    <th key={o} className="text-center py-2.5 px-3 text-muted-foreground font-semibold border-b-2 border-border min-w-[90px]">{o}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rankRows.map(row => (
                                <tr key={row.rank} className="border-b border-border/30 hover:bg-olive/8 transition-colors">
                                    <td className="py-2.5 px-3 font-semibold text-foreground whitespace-nowrap">{row.rank}</td>
                                    {row.values.map((val, i) => (
                                      <td key={i} className="py-1.5 px-2 text-center">
                                        <div
                                            className="w-full h-10 rounded-sm flex items-center justify-center text-[11px] font-mono font-medium transition-transform hover:scale-105"
                                            style={{
                                              backgroundColor: warmColor(val),
                                              color: textColor(val),
                                            }}
                                            title={`${row.rank} - ${offenceHeaders[i]}: ${val} cases`}
                                        >
                                            {val}
                                        </div>
                                      </td>
                                    ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                          <span>Low</span>
                          <div className="flex gap-0.5">
                            {[5, 30, 60, 100, 150, 180].map(v => (
                              <div key={v} className="w-7 h-4 rounded-sm" style={{ backgroundColor: warmColor(v) }} />
                            ))}
                          </div>
                          <span>High</span>
                      </div>
                    </div>
                ) : method === "hierarchical" ? (
                  <div className="overflow-auto px-4 py-4">
                    <pre className="font-mono text-sm text-foreground leading-relaxed whitespace-pre">
{`All Courts Martial Records
        |
        |-- Rank
        |     |
        |     |-- Private
        |     |      |
        |     |      |-- `}<span className="text-rust font-semibold">Most Common Offence: AWOL</span>{`
        |     |
        |     |-- Corporal / Sergeant
        |            |
        |            |-- `}<span className="text-rust font-semibold">Most Common Offence: Drunkenness</span>{`
        |
        |-- Unit Type
               |
               |-- Artillery / Cavalry
               |      |
               |      |-- `}<span className="text-rust font-semibold">Higher Neglect of Duty Cases</span>{`
               |
               |-- Support Unit Types
                      |
                      |-- `}<span className="text-rust font-semibold">More Conduct Prejudicial Cases</span>
                    </pre>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" dataKey="x" tick={false} axisLine={false} />
                        <YAxis type="number" dataKey="y" tick={false} axisLine={false} />
                        <Tooltip content={<ChartTip />} />
                        <Scatter data={dots}>
                          {dots.map((d, i) => (
                            <Cell key={i} fill={clusterColors[d.cluster]} />
                          ))}
                        </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </div>

            {method === "clustering" && (
              <div className="flex flex-wrap gap-4 mt-4 text-xs font-body">
                {groups.map((g, i) => (
                    <div key={g.label} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: clusterColors[i] }} />
                      <span className="text-foreground font-medium">{g.label.split(" - ")[0]}</span>
                    </div>
                ))}
              </div>
            )}
          </FullscreenPanel>

            <p className="text-xs text-muted-foreground font-body mt-3 italic">{captions[method] || captions.clustering}</p>
        </WireBox>
        </div>

        {method === "heatmap" && (
          <WireBox dashed={false} label="DATA SUMMARY" accent="gold">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground font-body">Raw case numbers behind the heatmap above.</p>
                    <button
                      onClick={() => setShowDataTable(!showDataTable)}
                      className="text-xs font-body text-olive hover:text-olive-light transition-colors flex items-center gap-1"
                    >
                      {showDataTable ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {showDataTable ? "Hide table" : "Show table"}
                    </button>
                </div>
                {showDataTable && (
                    <div className="overflow-auto border border-border rounded-md">
                      <table className="w-full text-xs font-body border-collapse">
                          <thead>
                            <tr className="bg-muted/30">
                              <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground border-b border-border">Rank</th>
                              {offenceHeaders.map(o => (
                                <th key={o} className="text-right py-2.5 px-3 font-semibold text-muted-foreground border-b border-border">{o}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rankRows.map((row, ri) => (
                                <tr key={row.rank} className={ri % 2 === 0 ? "bg-card" : "bg-muted/10"}>
                                  <td className="py-2 px-3 font-medium text-foreground border-b border-border/30">{row.rank}</td>
                                  {row.values.map((val, i) => (
                                    <td key={i} className="py-2 px-3 text-right font-mono text-foreground border-b border-border/30">{val}</td>
                                  ))}
                                </tr>
                            ))}
                          </tbody>
                      </table>
                    </div>
                )}
              </div>
          </WireBox>
        )}

        {method === "hierarchical" && (
            <WireBox dashed={false} label="GROUP SUMMARY" accent="gold">
              <p className="text-xs text-muted-foreground font-body mb-3">
                Summary of the final groups identified by the tree diagram.
              </p>
              <div className="overflow-auto border border-border rounded-md">
                  <table className="w-full text-xs font-body border-collapse">
                    <thead>
                        <tr className="bg-muted/30">
                          <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground border-b border-border">Group</th>
                          <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground border-b border-border">Characteristics</th>
                          <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground border-b border-border">Common Offence</th>
                        </tr>
                    </thead>
                    <tbody>
                      {treeSummary.map((row, ri) => (
                        <tr key={row.group} className={ri % 2 === 0 ? "bg-card" : "bg-muted/10"}>
                            <td className="py-2 px-3 font-medium text-foreground border-b border-border/30">
                              <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: clusterColors[ri] }} />
                                  {row.group}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-foreground border-b border-border/30">{row.characteristics}</td>
                            <td className="py-2 px-3 text-foreground font-medium border-b border-border/30">{row.offence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
            </WireBox>
        )}

        <WireBox dashed={false} label="VARIABLE INFLUENCE" accent="gold">
            <FullscreenPanel title="Variable Influence">
              <p className="text-xs text-muted-foreground mb-4 font-body">
                These characteristics had the biggest influence on the patterns found. Longer bars mean more influence.
              </p>
              <div className="space-y-3">
                {features.map((f, i) => (
                  <div key={f.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-body">
                        <span className="font-medium text-foreground">{f.name}</span>
                        <span className="text-muted-foreground">{f.value}%</span>
                      </div>
                      <div className="w-full h-5 bg-muted/50 rounded-sm overflow-hidden">
                        <div
                          className="h-full rounded-sm transition-all"
                          style={{ width: `${f.value}%`, backgroundColor: clusterColors[i % clusterColors.length] }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                  </div>
                ))}
              </div>
            </FullscreenPanel>
        </WireBox>

        <WireBox dashed={false} label="PATTERN GROUPS" accent="navy">
          <div className="space-y-3">
            {groups.map((g, i) => (
                <div key={g.label} className="flex items-start gap-3 p-3 border border-border/50 rounded-md bg-card">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: clusterColors[i] }} />
                    <div className="space-y-0.5">
                      <p className="text-sm font-body font-semibold text-foreground">{g.label}</p>
                      <p className="text-xs font-body text-muted-foreground">{g.desc}</p>
                      <p className="text-[10px] font-body text-muted-foreground/70">{method === "heatmap" ? "Ranks" : "Unit Types"}: {g.unitTypes}</p>
                    </div>
                </div>
            ))}
          </div>
        </WireBox>

        <div
          className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-olive transition-colors font-body px-2"
          onClick={() => setMetaOpen(!metaOpen)}
        >
          {metaOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          <span>Technical Details</span>
        </div>
        {metaOpen && (
            <div className="flex flex-wrap gap-2 text-xs font-body">
              {[
                ["Run ID", "TVT-2026-0892-A"],
                ["Timestamp", "2026-01-15 14:32 UTC"],
                ["Method", vizTitle],
              ].map(([label, val]) => (
                <div key={label} className="px-2.5 py-1.5 border border-border rounded-md font-mono bg-card shadow-sm">
                    <span className="text-muted-foreground">{label}:</span> <span className="text-olive font-semibold">{val}</span>
                </div>
              ))}
            </div>
        )}

        <div className="flex flex-wrap gap-3 justify-center items-center">
          <WireButton onClick={() => navigate("/advanced")}>← Change ML Configuration</WireButton>
          <WireButton filled accent className="gap-2 text-sm py-2.5 px-6" onClick={async () => {
            const el = document.getElementById("export-capture")
            let imageData: string | undefined
            if (el) {
                try {
                  const canvas = await html2canvas(el, {backgroundColor: "#ffffff", scale: 2, useCORS: true, logging: false});
                  imageData = canvas.toDataURL("image/png")
                } catch(e) { console.warn("Chart capture failed:", e) }
            }
            setExportPayload({title: "Pattern Insights from Courts Martial Records", subtitle: vizTitle, insights: findings, imageData})
            navigate(`/export?from=${method}`)
          }}>
            <Download className="w-4 h-4" /> Export Results
          </WireButton>
          <SaveToDashboard reportName={method === "clustering" ? "K-Means Clustering" : method === "hierarchical" ? "Hierarchical Clustering" : "Anomaly Detection"} reportType="Pattern Analysis" />
        </div>

        <HelpFloatMenu manualSectionId="um-offence-trends" />
      </PageLayout>
  );
};

export default AnalysisResults;
