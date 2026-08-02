import { useEffect, useMemo, useState } from "react";
import { Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import patternDataStatic from "@/data/pattern_analysis.json";

type FeatureKey = "rank" | "unit_type" | "enlistment_year";

function getPatternData(): typeof patternDataStatic {
  try {
    const stored = sessionStorage.getItem("nb_live_results");
    if (stored) return JSON.parse(stored) as typeof patternDataStatic;
  } catch { /* fall through */ }
  return patternDataStatic;
}

// ---------------------------------------------------------------------------
// Utility Functions for Dynamic Naive Bayes Analysis
// ---------------------------------------------------------------------------

export interface Finding {
  text: string;
  feature: 'prevalence' | 'rank' | 'unit_type' | 'enlistment_year';
  offence: string;
  lift?: number;
  impact?: number;
}

interface PatternInfo {
  feature: FeatureKey;
  offence: string;
  value: string;
  lift: number;
  impact: number;
}

// Context maps for generating interpretive text
const contextMap: Record<FeatureKey, Record<string, string>> = {
  rank: {
    'Sergeant': 'likely due to their supervisory responsibilities over prisoners and guard duties',
    'Corporal': 'as junior NCOs frequently assigned to guard and supervision duties',
    'Lieutenant': 'possibly reflecting the stresses of frontline command and access to officers\' messes',
    'Private': 'representing the vast majority of enlisted soldiers',
    'Captain': 'despite their leadership positions and greater responsibilities',
    'Sergeant-Major': 'reflecting their senior NCO responsibilities',
    'Major': 'despite their senior officer status',
    'Colonel': 'at the highest echelons of command',
    'Cadet': 'still in training and learning military discipline',
  },
  unit_type: {
    'Cavalry & Mounted': 'these mobile units often had more access to establishments behind the lines',
    'Medical': 'potentially reflecting access to medical supplies and different operational tempos',
    'Infantry': 'the most common unit type bearing the brunt of trench warfare',
    'Artillery': 'supporting roles with different daily routines and operational pressures',
    'Service': 'logistical and support roles with access to supplies and equipment',
    'Reserves & Training': 'units often stationed away from the front lines',
    'Engineers & Signals': 'technical roles with specialized duties and equipment',
    'Forestry Corps': 'labour-intensive work often isolated from main forces',
    'Machine Gun Corps': 'specialized combat units with distinct operational patterns',
    'Headquarters': 'administrative roles with different disciplinary oversight',
    'Police': 'military police with unique access and responsibilities',
  },
  enlistment_year: {
    '1914': 'these early volunteers may have had stronger expectations about the war that clashed with military discipline',
    '1915': 'as initial optimism faded during the first full year of war',
    '1916': 'coinciding with conscription bringing soldiers less prepared for military life',
    '1917': 'during some of the war\'s bloodiest battles and mounting exhaustion',
    '1918': 'in the final year as the war drew to a close',
    '1919': 'in the immediate post-war period with different circumstances',
  },
};

// Prevalence context based on offence type
const prevalenceContext: Record<string, string> = {
  'Absence/Desertion': 'reflecting the immense psychological toll of trench warfare and the harsh conditions soldiers endured',
  'Drunkenness': 'a common escape from the stresses of military life and combat',
  'Insubordination': 'reflecting tensions between soldiers and military authority',
  'Misconduct': 'covering a broad range of behavioral violations',
  'Fraud/Theft/Property': 'involving misappropriation of military or personal property',
  'Combat/Enemy': 'related to behavior in the face of the enemy',
  'Custody Offences': 'involving responsibilities over prisoners and detainees',
  'Neglect/Orders': 'failures to carry out military duties properly',
  'Other': 'encompassing various other disciplinary matters',
};

function generatePrevalenceText(offence: string, prior: number): string {
  const pct = Math.round(prior * 100);
  const context = prevalenceContext[offence] || 'a significant portion of all disciplinary records';
  return `${offence} was the most common offence, representing ${pct}% of all disciplinary records-${context}.`;
}

function generatePatternText(pattern: PatternInfo): string {
  const liftText = pattern.lift.toFixed(1) + '×';
  const context = contextMap[pattern.feature]?.[pattern.value] || '';
  const contextSuffix = context ? `-${context}` : '';

  switch (pattern.feature) {
    case 'rank':
      return `${pattern.value} soldiers were ${liftText} more likely to face ${pattern.offence} charges${contextSuffix}.`;
    case 'unit_type':
      return `${pattern.value} units showed ${liftText} higher rates of ${pattern.offence}${contextSuffix}.`;
    case 'enlistment_year':
      return `Soldiers enlisting in ${pattern.value} showed ${liftText} higher ${pattern.offence} rates${contextSuffix}.`;
  }
}

function generateUnderrepText(pattern: PatternInfo): string {
  const pctLower = Math.round((1 - pattern.lift) * 100);
  const context = contextMap[pattern.feature]?.[pattern.value] || '';
  const contextSuffix = context ? `-${context}` : '';

  switch (pattern.feature) {
    case 'rank':
      return `${pattern.value} soldiers were ${pctLower}% less likely to face ${pattern.offence} charges than expected${contextSuffix}.`;
    case 'unit_type':
      return `${pattern.value} units showed ${pctLower}% fewer ${pattern.offence} cases than their population share would suggest${contextSuffix}.`;
    case 'enlistment_year':
      return `Soldiers who enlisted in ${pattern.value} were ${pctLower}% less likely to face ${pattern.offence} charges${contextSuffix}.`;
  }
}

interface TemporalTrend {
  offence: string;
  earlyYear: string;
  lateYear: string;
  earlyLift: number;
  lateLift: number;
  direction: 'increase' | 'decrease';
}

/**
 * Generates up to 5 key findings from the pattern analysis data.
 * Slot 1 is always the prevalence finding (most common offence).
 * Remaining slots are distributed for variety: overrepresentation, underrepresentation, temporal trends.
 * @param selectedFeatures - Optional array of features to filter by. If not provided, uses all features.
 */
export function generateKeyFindings(selectedFeatures?: FeatureKey[]): Finding[] {
  const findings: Finding[] = [];
  const featureTypes: FeatureKey[] = selectedFeatures && selectedFeatures.length > 0
    ? selectedFeatures
    : ['rank', 'unit_type', 'enlistment_year'];

  // Slot 1: Always include prevalence finding (most common offence)
  const sortedClasses = Object.entries(getClasses())
    .sort((a, b) => b[1].prior - a[1].prior);
  const topOffence = sortedClasses[0];

  findings.push({
    text: generatePrevalenceText(topOffence[0], topOffence[1].prior),
    feature: 'prevalence',
    offence: topOffence[0],
  });

  // Collect overrepresented patterns (lift >= 1.5)
  const overrepPatterns: PatternInfo[] = [];
  // Collect underrepresented patterns (lift <= 0.6)
  const underrepPatterns: PatternInfo[] = [];
  // Collect temporal trends
  const temporalTrends: TemporalTrend[] = [];

  for (const [offence, classData] of Object.entries(getClasses())) {
    for (const feature of featureTypes) {
      const featureData = classData.features?.[feature];
      if (!featureData || !featureData.significant) continue;

      for (const entry of featureData.full_distribution) {
        const lift = entry.rate_vs_baseline ?? 1;
        const impact = classData.prior * Math.abs(1 - lift);

        if (lift >= 1.5) {
          overrepPatterns.push({
            feature,
            offence,
            value: entry.value,
            lift,
            impact: classData.prior * lift,
          });
        } else if (lift <= 0.6) {
          underrepPatterns.push({
            feature,
            offence,
            value: entry.value,
            lift,
            impact,
          });
        }
      }

      // Detect temporal trends for enlistment_year
      if (feature === 'enlistment_year') {
        const yearEntries = featureData.full_distribution
          .filter(e => ['1914', '1915', '1916', '1917', '1918', '1919'].includes(e.value))
          .sort((a, b) => parseInt(a.value) - parseInt(b.value));

        if (yearEntries.length >= 2) {
          const early = yearEntries.find(e => e.value === '1914' || e.value === '1915');
          const late = yearEntries.find(e => e.value === '1918' || e.value === '1919');

          if (early && late) {
            const earlyLift = early.rate_vs_baseline ?? 1;
            const lateLift = late.rate_vs_baseline ?? 1;
            const diff = Math.abs(earlyLift - lateLift);

            if (diff >= 0.4) {
              temporalTrends.push({
                offence,
                earlyYear: early.value,
                lateYear: late.value,
                earlyLift,
                lateLift,
                direction: earlyLift > lateLift ? 'decrease' : 'increase',
              });
            }
          }
        }
      }
    }
  }

  // Sort all collections by impact
  overrepPatterns.sort((a, b) => b.impact - a.impact);
  underrepPatterns.sort((a, b) => b.impact - a.impact);
  temporalTrends.sort((a, b) => Math.abs(b.earlyLift - b.lateLift) - Math.abs(a.earlyLift - a.lateLift));

  // Build a diverse set of findings (up to 4 more after prevalence)
  const usedOffences = new Set<string>([topOffence[0]]);
  const usedFeatures = new Set<FeatureKey>();

  // Slot 2: Top overrepresentation pattern
  if (overrepPatterns.length > 0) {
    const pattern = overrepPatterns[0];
    findings.push({
      text: generatePatternText(pattern),
      feature: pattern.feature,
      offence: pattern.offence,
      lift: pattern.lift,
      impact: pattern.impact,
    });
    usedOffences.add(pattern.offence);
    usedFeatures.add(pattern.feature);
  }

  // Slot 3: Underrepresentation pattern (prefer different offence)
  const underrep = underrepPatterns.find(p => !usedOffences.has(p.offence)) || underrepPatterns[0];
  if (underrep) {
    findings.push({
      text: generateUnderrepText(underrep),
      feature: underrep.feature,
      offence: underrep.offence,
      lift: underrep.lift,
      impact: underrep.impact,
    });
    usedOffences.add(underrep.offence);
    usedFeatures.add(underrep.feature);
  }

  // Slot 4: Temporal trend (if available and enlistment_year is in selected features)
  if (featureTypes.includes('enlistment_year') && temporalTrends.length > 0) {
    const trend = temporalTrends.find(t => !usedOffences.has(t.offence)) || temporalTrends[0];
    const diffText = trend.direction === 'decrease'
      ? `${(trend.earlyLift / trend.lateLift).toFixed(1)}× higher`
      : `${(trend.lateLift / trend.earlyLift).toFixed(1)}× higher`;
    const trendText = trend.direction === 'decrease'
      ? `Early enlistees (${trend.earlyYear}) showed ${diffText} ${trend.offence} rates than late-war recruits (${trend.lateYear})-possibly reflecting changing army composition or war weariness.`
      : `Late-war enlistees (${trend.lateYear}) showed ${diffText} ${trend.offence} rates than early volunteers (${trend.earlyYear})-possibly reflecting different circumstances in the war's final phase.`;

    findings.push({
      text: trendText,
      feature: 'enlistment_year',
      offence: trend.offence,
    });
    usedOffences.add(trend.offence);
  }

  // Slot 5: Another overrepresentation from a different feature type if possible
  if (findings.length < 5) {
    const unusedFeature = featureTypes.find(f => !usedFeatures.has(f));
    const nextPattern = unusedFeature
      ? overrepPatterns.find(p => p.feature === unusedFeature && !usedOffences.has(p.offence))
      : overrepPatterns.find(p => !usedOffences.has(p.offence));

    if (nextPattern) {
      findings.push({
        text: generatePatternText(nextPattern),
        feature: nextPattern.feature,
        offence: nextPattern.offence,
        lift: nextPattern.lift,
        impact: nextPattern.impact,
      });
    } else if (overrepPatterns.length > 1) {
      // Fallback: use second-best overrep pattern even if offence repeats
      const fallback = overrepPatterns[1];
      findings.push({
        text: generatePatternText(fallback),
        feature: fallback.feature,
        offence: fallback.offence,
        lift: fallback.lift,
        impact: fallback.impact,
      });
    }
  }

  return findings;
}

export interface ModelMetrics {
  classCount: number;
  featureCount: number;
  totalRecords: number;
  significantPairs: number;
  totalPairs: number;
  strongPatterns: number;
  averageLift: string;
}

/**
 * Computes model metrics from the pattern analysis data.
 */
export function computeModelMetrics(selectedFeatures?: FeatureKey[]): ModelMetrics {
  const classNames = Object.keys(getClasses());
  const features: FeatureKey[] = selectedFeatures && selectedFeatures.length > 0
    ? selectedFeatures
    : ['rank', 'unit_type', 'enlistment_year'];

  let significantCount = 0;
  let strongPatternCount = 0;
  let totalLift = 0;
  let liftCount = 0;

  for (const cls of classNames) {
    for (const feat of features) {
      const featureData = getClasses()[cls]?.features?.[feat];
      if (!featureData) continue;
      if (featureData.significant) significantCount++;

      for (const entry of featureData.full_distribution) {
        const lift = entry.rate_vs_baseline ?? 1;
        // Count patterns with lift >= 1.3 (overrepresented threshold)
        if (lift >= 1.3) {
          strongPatternCount++;
          totalLift += lift;
          liftCount++;
        }
      }
    }
  }

  return {
    classCount: classNames.length,
    featureCount: features.length,
    totalRecords: getTotalRecords(),
    significantPairs: significantCount,
    totalPairs: classNames.length * features.length,
    strongPatterns: strongPatternCount,
    averageLift: liftCount > 0 ? (totalLift / liftCount).toFixed(2) : '1.00',
  };
}

interface DistEntry {
  value: string;
  probability: number;
  rate_vs_baseline?: number;
}

interface FeatureBlock {
  significant: boolean;
  full_distribution: DistEntry[];
}

interface OffenceClass {
  prior: number;
  count?: number;
  features: Record<FeatureKey, FeatureBlock>;
}

function getClasses(): Record<string, OffenceClass> {
  return getPatternData().classes as Record<string, OffenceClass>;
}
function getTotalRecords(): number {
  return (getPatternData() as { total_records: number }).total_records;
}

const FEATURE_LABELS: Record<FeatureKey, string> = {
  rank: "Rank",
  unit_type: "Unit Type",
  enlistment_year: "Enlistment Year",
};

// Military rank hierarchy from lowest (left) to highest (right)
const RANK_ORDER: string[] = [
  "Cadet",
  "Private",
  "Corporal",
  "Sergeant",
  "Sergeant-Major",
  "Lieutenant",
  "Captain",
  "Major",
  "Colonel",
];

// Unit type hierarchy from front-line combat (left) to rear-echelon/administrative (right)
const UNIT_TYPE_ORDER: string[] = [
  "Infantry",
  "Machine Gun Corps",
  "Artillery",
  "Cavalry & Mounted",
  "Engineers & Signals",
  "Medical",
  "Service",
  "Forestry Corps",
  "Reserves & Training",
  "Headquarters",
  "Police",
];

export const OFFENCE_COLORS: Record<string, string> = {
  "Absence/Desertion": "#3b82f6", // Blue
  "Combat/Enemy":      "#f59e0b", // Amber
  "Custody Offences":  "#10b981", // Emerald
  "Drunkenness":       "#8b5cf6", // Purple
  "Fraud/Theft/Property": "#ef4444",// Red
  "Insubordination":   "#ec4899", // Pink
  "Misconduct":        "#6b7280", // Gray
  "Neglect/Orders":    "#f97316", // Orange
  "Other":             "#06b6d4", // Cyan
};

const tooltipStyle = {
  fontSize: 13,
  borderRadius: 4,
  borderColor: "hsl(var(--border))",
  backgroundColor: "hsl(var(--background))",
  color: "hsl(var(--foreground))",
};

// Axis tick numbers - should be readable but not dominate
const tickStyle = { fontSize: 12, fill: "hsl(var(--muted-foreground))" };

// Axis title style - slightly larger than tick numbers for hierarchy
const axisLabelStyle = { fontSize: 13, fill: "hsl(var(--muted-foreground))" };

function computeBaseline(feature: FeatureKey, value: string): number {
  let baseline = 0;
  for (const cls of Object.values(getClasses())) {
    const entry = cls.features[feature].full_distribution.find(e => e.value === value);
    baseline += (entry?.probability ?? 0) * cls.prior;
  }
  return baseline;
}

// ---------------------------------------------------------------------------
// 1. OffenceDistributionChart
// ---------------------------------------------------------------------------

export function OffenceDistributionChart() {
  const data = useMemo(() => {
    return Object.entries(getClasses())
      .map(([name, c]) => ({
        name,
        prior: +(c.prior * 100).toFixed(1),
        count: c.count,
      }))
      .sort((a, b) => a.prior - b.prior);
  }, []);

  const barColor = "#5b93c5";
  const barColorDark = "#2b6491";

  return (
    <>
      <ResponsiveContainer width="100%" height={data.length * 46 + 50}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 100, top: 8, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis
            type="number"
            tick={tickStyle}
            tickFormatter={(v: number) => `${(v / 100).toFixed(2)}`}
            domain={[0, "auto"]}
            label={{ value: "Proportion of All Records", position: "insideBottom", offset: -6, ...axisLabelStyle }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={160}
            tick={{ fontSize: 13, fill: "hsl(var(--muted-foreground))" }}
            label={{ value: "Offence Type", angle: -90, position: "insideLeft", offset: 10, ...axisLabelStyle }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number, _: string, props: { payload: { count?: number } }) =>
              [`${v.toFixed(1)}%${props.payload.count !== undefined ? ` (n=${props.payload.count.toLocaleString()})` : ''}`, "Proportion"]
            }
          />
          <Bar
            dataKey="prior"
            radius={[0, 3, 3, 0]}
            label={{
              position: "right",
              fontSize: 12,
              fill: "hsl(var(--foreground))",
              formatter: (_: number, entry: { name: string; prior: number; count: number }) => {
                if (typeof entry === "object" && entry.count !== undefined)
                  return `${entry.prior.toFixed(1)}%  (n=${entry.count.toLocaleString()})`;
                return "";
              },
            }}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.prior > 10 ? barColorDark : barColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="insight-bar mt-3 text-sm text-muted-foreground flex items-start gap-2">
        <Lightbulb className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
        <span>Offence types with greater proportions will sway the model's results toward patterns involving those offence types.</span>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// 2. TopPatternLiftsChart
// ---------------------------------------------------------------------------

interface LiftEntry {
  label: string;
  lift: number;
  offence: string;
  feature: string;
  value: string;
  probability: number;
}

function liftGradient(idx: number, total: number): string {
  const t = total <= 1 ? 0 : idx / (total - 1);
  if (t < 0.25) {
    const s = t / 0.25;
    const r = Math.round(34 + s * (130 - 34));
    const g = Math.round(170 + s * (190 - 170));
    const b = Math.round(60 + s * (50 - 60));
    return `rgb(${r},${g},${b})`;
  }
  if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    const r = Math.round(130 + s * (220 - 130));
    const g = Math.round(190 + s * (200 - 190));
    const b = Math.round(50 + s * (60 - 50));
    return `rgb(${r},${g},${b})`;
  }
  if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    const r = Math.round(220 + s * (230 - 220));
    const g = Math.round(200 - s * (200 - 150));
    const b = Math.round(60 + s * (50 - 60));
    return `rgb(${r},${g},${b})`;
  }
  const s = (t - 0.75) / 0.25;
  const r = Math.round(230 - s * (230 - 200));
  const g = Math.round(150 - s * (150 - 80));
  const b = Math.round(50 + s * (60 - 50));
  return `rgb(${r},${g},${b})`;
}

interface TopPatternLiftsChartProps {
  features: FeatureKey[];
  initialLimit?: number;
}

const BAR_HEIGHT = 44;
const DEFAULT_INITIAL_LIMIT = 8;

export function TopPatternLiftsChart({ features, initialLimit = DEFAULT_INITIAL_LIMIT }: TopPatternLiftsChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const allData = useMemo(() => {
    const all: LiftEntry[] = [];
    for (const [offence, cls] of Object.entries(getClasses())) {
      for (const feat of features) {
        const block = cls.features[feat];
        for (const entry of block.full_distribution) {
          const baseline = computeBaseline(feat, entry.value);
          if (baseline <= 0) continue;
          const lift = entry.probability / baseline;
          if (lift >= 1.3) {
            // Create context-aware user-friendly labels based on feature type
            let lbl: string;
            if (feat === "rank") {
              // Pluralize rank: "Cadet" -> "Cadets charged with..."
              const pluralRank = entry.value.endsWith("s") ? entry.value : `${entry.value}s`;
              lbl = `${pluralRank} charged with ${offence}`;
            } else if (feat === "unit_type") {
              // Add "units" for unit types: "Police units in..."
              lbl = `${entry.value} units in ${offence}`;
            } else if (feat === "enlistment_year") {
              // Add context for years: "1914 enlistees in..."
              lbl = `${entry.value} enlistees in ${offence}`;
            } else {
              lbl = `${entry.value} in ${offence}`;
            }
            all.push({
              label: lbl,
              lift: +lift.toFixed(1),
              offence,
              feature: FEATURE_LABELS[feat],
              value: entry.value,
              probability: entry.probability,
            });
          }
        }
      }
    }
    return all.sort((a, b) => b.lift - a.lift).slice(0, 25);
  }, [features]);

  const displayData = isExpanded ? allData : allData.slice(0, initialLimit);
  const hiddenCount = allData.length - initialLimit;
  const canExpand = allData.length > initialLimit;

  return (
    <div>
      <ResponsiveContainer width="100%" height={displayData.length * BAR_HEIGHT + 70}>
        <BarChart data={displayData} layout="vertical" margin={{ left: 10, right: 55, top: 28, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis
            type="number"
            tick={tickStyle}
            domain={[0, "auto"]}
            label={{ value: "Lift vs Baseline (x)", position: "insideBottom", offset: -6, ...axisLabelStyle }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={290}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number, _name: string, props: { payload: LiftEntry }) => {
              const p = props.payload;
              return [
                `${v.toFixed(1)}× baseline  (P = ${(p.probability * 100).toFixed(0)}%)`,
                "Lift",
              ];
            }}
          />
          <Bar
            dataKey="lift"
            radius={[0, 3, 3, 0]}
            label={{ position: "right", fontSize: 12, fill: "hsl(var(--foreground))", formatter: (v: number) => `${v.toFixed(1)}x` }}
          >
            {displayData.map((_, i) => (
              <Cell key={i} fill={liftGradient(i, allData.length)} />
            ))}
          </Bar>
          <ReferenceLine
            x={1}
            stroke="#b45309"
            strokeWidth={2}
            strokeDasharray="6 3"
            label={{
              value: "BASELINE (1.0x)",
              fontSize: 11,
              fill: "#b45309",
              position: "top",
              fontWeight: 600,
            }}
          />
        </BarChart>
      </ResponsiveContainer>

      {canExpand && (
        <div className="flex justify-center mt-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-body border border-border rounded-md hover:bg-secondary hover:border-olive/40 hover:shadow-sm transition-all duration-200 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show Top {initialLimit} Patterns
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show All {allData.length} Patterns ({hiddenCount} more)
              </>
            )}
          </button>
        </div>
      )}

      <div className="insight-bar mt-4 text-sm text-muted-foreground flex items-start gap-2">
        <Lightbulb className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
        <span>
          <strong>What is lift?</strong> Lift shows how much more common a group is in an offence category compared to the overall population.
          For example, a lift of <strong>7.2x</strong> means that group appears 7.2 times more often than expected.
          A lift of 1.0x would mean no difference from the{" "}
          <span className="group relative inline-block">
            <span className="underline italic cursor-help text-foreground/80">baseline</span>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs bg-foreground text-background rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
              The baseline is the overall rate of each group in the entire dataset.
              <br />
              For example, if Cadets make up 1% of all soldiers, that's their baseline.
            </span>
          </span>.
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. ConditionalHeatmap
// ---------------------------------------------------------------------------

interface ConditionalHeatmapProps {
  feature: FeatureKey;
  viewMode?: HeatmapViewMode;
  onViewModeChange?: (mode: HeatmapViewMode) => void;
}

function textColorForBg(bgColor: string): string {
  const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return "#000";
  const [, r, g, b] = match.map(Number);
  // Perceived luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#1a1a1a" : "#fff";
}

function ylOrRdColor(t: number): string {
  const clamp = Math.max(0, Math.min(1, t));
  if (clamp < 0.25) {
    const s = clamp / 0.25;
    return `rgb(${255}, ${255 - Math.round(s * 30)}, ${230 - Math.round(s * 100)})`;
  }
  if (clamp < 0.5) {
    const s = (clamp - 0.25) / 0.25;
    return `rgb(${255}, ${225 - Math.round(s * 55)}, ${130 - Math.round(s * 60)})`;
  }
  if (clamp < 0.75) {
    const s = (clamp - 0.5) / 0.25;
    return `rgb(${255 - Math.round(s * 30)}, ${170 - Math.round(s * 80)}, ${70 - Math.round(s * 30)})`;
  }
  const s = (clamp - 0.75) / 0.25;
  return `rgb(${225 - Math.round(s * 80)}, ${90 - Math.round(s * 60)}, ${40 - Math.round(s * 20)})`;
}

export type HeatmapViewMode = "raw" | "lift";

function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export function ConditionalHeatmap({ feature, viewMode: controlledViewMode, onViewModeChange }: ConditionalHeatmapProps) {
  // Support both controlled and uncontrolled modes.
  // When in controlled mode (viewMode prop is provided), we ALWAYS use it.
  // The internal state is only used as fallback for uncontrolled mode.
  // Initialize internal state from the controlled value to handle remounts correctly.
  const isControlled = controlledViewMode !== undefined;
  const [internalViewMode, setInternalViewMode] = useState<HeatmapViewMode>(
    controlledViewMode ?? "raw"
  );

  // In controlled mode, always use the controlled value. Never fall back to internal state.
  const viewMode = isControlled ? controlledViewMode : internalViewMode;

  const setViewMode = (mode: HeatmapViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setInternalViewMode(mode);
    }
  };
  const isDarkMode = useIsDarkMode();

  const { offenceNames, featureValues, grid, maxProb, maxLift } = useMemo(() => {
    const offenceNames = Object.keys(getClasses());
    const valSet = new Set<string>();
    let maxProb = 0;
    let maxLift = 0;
    for (const cls of Object.values(getClasses())) {
      for (const entry of cls.features[feature].full_distribution) {
        valSet.add(entry.value);
        if (entry.probability > maxProb) maxProb = entry.probability;
        const lift = entry.rate_vs_baseline ?? 1;
        if (lift > maxLift) maxLift = lift;
      }
    }
    let featureValues = Array.from(valSet);

    // Sort based on feature type
    if (feature === "rank") {
      // Sort ranks by military hierarchy (lowest to highest)
      featureValues = featureValues.sort((a, b) => {
        const indexA = RANK_ORDER.indexOf(a);
        const indexB = RANK_ORDER.indexOf(b);
        const orderA = indexA === -1 ? RANK_ORDER.length : indexA;
        const orderB = indexB === -1 ? RANK_ORDER.length : indexB;
        return orderA - orderB;
      });
    } else if (feature === "unit_type") {
      // Sort unit types by combat exposure (front-line to rear-echelon)
      featureValues = featureValues.sort((a, b) => {
        const indexA = UNIT_TYPE_ORDER.indexOf(a);
        const indexB = UNIT_TYPE_ORDER.indexOf(b);
        const orderA = indexA === -1 ? UNIT_TYPE_ORDER.length : indexA;
        const orderB = indexB === -1 ? UNIT_TYPE_ORDER.length : indexB;
        return orderA - orderB;
      });
    } else if (feature === "enlistment_year") {
      // Sort enlistment years chronologically (earliest to latest)
      featureValues = featureValues.sort((a, b) => {
        const yearA = parseInt(a, 10);
        const yearB = parseInt(b, 10);
        return yearA - yearB;
      });
    }

    const grid: Record<string, Record<string, { prob: number; lift: number }>> = {};
    for (const [offence, cls] of Object.entries(getClasses())) {
      grid[offence] = {};
      for (const entry of cls.features[feature].full_distribution) {
        grid[offence][entry.value] = {
          prob: entry.probability,
          lift: entry.rate_vs_baseline ?? 1,
        };
      }
    }
    return { offenceNames, featureValues, grid, maxProb, maxLift };
  }, [feature]);

  // Color function for lift mode (diverging: teal for under, neutral for baseline, coral for over)
  const liftColor = (lift: number): string => {
    if (isDarkMode) {
      // Dark mode: more muted colors that work on dark backgrounds
      if (lift < 1) {
        // Underrepresented: muted teal
        const t = Math.max(0, lift);
        const intensity = 1 - t;
        // Dark neutral: rgb(45, 55, 72) to Muted teal: rgb(56, 178, 172)
        const r = Math.round(45 + intensity * 11);
        const g = Math.round(55 + intensity * 123);
        const b = Math.round(72 + intensity * 100);
        return `rgb(${r},${g},${b})`;
      } else {
        // Overrepresented: muted coral/rose
        const t = Math.min((lift - 1) / (maxLift - 1), 1);
        // Dark neutral: rgb(45, 55, 72) to Muted coral: rgb(190, 90, 100)
        const r = Math.round(45 + t * 145);
        const g = Math.round(55 + t * 35);
        const b = Math.round(72 + t * 28);
        return `rgb(${r},${g},${b})`;
      }
    } else {
      // Light mode: vibrant colors
      if (lift < 1) {
        // Underrepresented: vibrant teal/cyan tones
        const t = Math.max(0, lift);
        const intensity = 1 - t;
        // Deep teal: rgb(13, 148, 136) to White: rgb(255, 255, 255)
        const r = Math.round(255 - intensity * 242);
        const g = Math.round(255 - intensity * 107);
        const b = Math.round(255 - intensity * 119);
        return `rgb(${r},${g},${b})`;
      } else {
        // Overrepresented: vibrant coral/orange tones
        const t = Math.min((lift - 1) / (maxLift - 1), 1);
        // White: rgb(255, 255, 255) to Coral: rgb(244, 63, 94)
        const r = Math.round(255 - t * 11);
        const g = Math.round(255 - t * 192);
        const b = Math.round(255 - t * 161);
        return `rgb(${r},${g},${b})`;
      }
    }
  };

  // Color function for raw mode with dark mode support
  const rawColor = (intensity: number): string => {
    if (isDarkMode) {
      // Dark mode: muted warm gradient
      const clamp = Math.max(0, Math.min(1, intensity));
      // From dark base rgb(45, 42, 40) to muted amber rgb(180, 120, 60)
      const r = Math.round(45 + clamp * 135);
      const g = Math.round(42 + clamp * 78);
      const b = Math.round(40 + clamp * 20);
      return `rgb(${r},${g},${b})`;
    } else {
      return ylOrRdColor(intensity);
    }
  };

  return (
    <div className="overflow-x-auto">
      {/* View mode toggle */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground font-body mr-1">View:</span>
        <button
          onClick={() => setViewMode("raw")}
          className={`text-[13px] px-3 py-1.5 rounded border font-body transition-colors ${
            viewMode === "raw"
              ? "bg-olive/15 border-olive/40 text-foreground font-semibold"
              : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-olive/5 hover:border-olive/30"
          }`}
        >
          Raw %
        </button>
        <button
          onClick={() => setViewMode("lift")}
          className={`text-[13px] px-3 py-1.5 rounded border font-body transition-colors ${
            viewMode === "lift"
              ? "bg-olive/15 border-olive/40 text-foreground font-semibold"
              : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-olive/5 hover:border-olive/30"
          }`}
        >
          vs Baseline
        </button>
        <span className="text-xs text-muted-foreground/60 ml-2 italic">
          {viewMode === "raw" ? "Showing composition within each offence" : "Showing over/under-representation vs population"}
        </span>
      </div>

      <table className="w-full text-sm font-body" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr className="border-b border-border">
            <th
              className="text-left py-2.5 px-2 pr-4 text-muted-foreground font-semibold sticky left-0 z-10 min-w-[140px] border-r-2 border-border"
              style={{ backgroundColor: "hsl(var(--background))" }}
            >
              Offence Class
            </th>
            {featureValues.map((v) => (
              <th
                key={v}
                className="text-center py-2.5 px-3 text-muted-foreground font-semibold font-body whitespace-nowrap"
                style={{ minWidth: "105px" }}
              >
                {v}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {offenceNames.map((offence) => (
            <tr key={offence} className="border-b border-border/40">
              <td
                className="py-2 px-2 pr-4 text-[13px] font-body whitespace-nowrap sticky left-0 z-10 font-medium text-foreground border-r-2 border-border"
                style={{ backgroundColor: "hsl(var(--background))" }}
              >
                {offence}
              </td>
              {featureValues.map((val) => {
                const data = grid[offence]?.[val] ?? { prob: 0, lift: 1 };
                const { prob, lift } = data;

                let bg: string;
                let textColor: string;
                let displayValue: string;

                if (viewMode === "raw") {
                  const intensity = maxProb > 0 ? prob / maxProb : 0;
                  bg = rawColor(intensity);
                  textColor = textColorForBg(bg);
                  displayValue = `${Math.round(prob * 100)}%`;
                } else {
                  bg = liftColor(lift);
                  textColor = textColorForBg(bg);
                  displayValue = `${lift.toFixed(2)}×`;
                }

                return (
                  <td
                    key={val}
                    className="text-center py-2 px-1.5 font-mono text-[13px] font-semibold"
                    style={{ backgroundColor: bg, color: textColor }}
                    title={viewMode === "raw"
                      ? `P(${val} | ${offence}) = ${(prob * 100).toFixed(1)}%`
                      : `${lift.toFixed(2)}× baseline (${(prob * 100).toFixed(1)}% raw)`
                    }
                  >
                    {displayValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-2 text-xs text-muted-foreground font-body">
        {viewMode === "raw" ? (
          <>
            <span>Low</span>
            <div className="flex h-3 rounded-sm overflow-hidden">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="w-2 h-full" style={{ backgroundColor: rawColor(i / 19) }} />
              ))}
            </div>
            <span>High</span>
            <span className="ml-2 italic">P(value | class)</span>
          </>
        ) : (
          <>
            <span>Under</span>
            <div className="flex h-3 rounded-sm overflow-hidden">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="w-2 h-full" style={{ backgroundColor: liftColor(i / 10) }} />
              ))}
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i + 10} className="w-2 h-full" style={{ backgroundColor: liftColor(1 + (i / 10) * (maxLift - 1)) }} />
              ))}
            </div>
            <span>Over</span>
            <span className="ml-2 italic">vs baseline (1.0× = expected)</span>
          </>
        )}
      </div>

      <div className="insight-bar mt-3 text-sm text-muted-foreground flex items-start gap-2">
        <Lightbulb className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
        <span>
          {viewMode === "raw" ? (
            <>
              {feature === "rank" && "Ranks are ordered from lowest (Cadet) to highest (Colonel). Higher percentages for lower ranks often reflect that Privates made up the vast majority of the army. Switch to \"vs Baseline\" to see which groups are truly over- or under-represented."}
              {feature === "unit_type" && "Unit types are ordered from front-line combat (Infantry) to rear-echelon/administrative (Police). These percentages show raw composition. Switch to \"vs Baseline\" to account for population size."}
              {feature === "enlistment_year" && "Years are shown chronologically. These percentages show raw composition within each offence. Switch to \"vs Baseline\" to see which years are over- or under-represented relative to their share of the army."}
            </>
          ) : (
            <>
              {feature === "rank" && "Values above 1.0× indicate overrepresentation (e.g., 2.0× means twice as common as expected). Values below 1.0× indicate underrepresentation. This accounts for the fact that Privates made up most of the army."}
              {feature === "unit_type" && "Values above 1.0× mean a unit type appears more often in that offence than their population share would predict. This reveals genuine patterns rather than just reflecting unit sizes."}
              {feature === "enlistment_year" && "Values above 1.0× mean soldiers from that year are overrepresented in the offence. This accounts for how many soldiers enlisted each year, revealing true temporal patterns."}
            </>
          )}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. PerCapitaStackedChart
// ---------------------------------------------------------------------------

interface PerCapitaStackedChartProps {
  feature: FeatureKey;
}

// Shortened labels for legend to prevent overlap
const OFFENCE_SHORT_LABELS: Record<string, string> = {
  "Absence/Desertion": "Absence/Desertion",
  "Combat/Enemy": "Combat/Enemy",
  "Custody Offences": "Custody",
  "Drunkenness": "Drunkenness",
  "Fraud/Theft/Property": "Fraud/Property",
  "Insubordination": "Insubordination",
  "Misconduct": "Misconduct",
  "Neglect/Orders": "Neglect/Orders",
  "Other": "Other",
};

export function PerCapitaStackedChart({ feature }: PerCapitaStackedChartProps) {
  const { data, offenceNames } = useMemo(() => {
    const offenceNames = Object.keys(getClasses());
    const valSet = new Set<string>();
    for (const cls of Object.values(getClasses())) {
      for (const entry of cls.features[feature].full_distribution) {
        valSet.add(entry.value);
      }
    }
    const featureValues = Array.from(valSet);

    const rows = featureValues.map((val) => {
      const raw: Record<string, number> = {};
      let total = 0;
      for (const [offence, cls] of Object.entries(getClasses())) {
        const entry = cls.features[feature].full_distribution.find((e) => e.value === val);
        const weighted = (entry?.probability ?? 0) * cls.prior;
        raw[offence] = weighted;
        total += weighted;
      }
      const row: Record<string, number | string> = { name: val };
      for (const offence of offenceNames) {
        row[offence] = total > 0 ? +((raw[offence] / total) * 100).toFixed(2) : 0;
      }
      return row;
    });

    return { data: rows, offenceNames };
  }, [feature]);

  // Custom legend renderer for better spacing
  const renderLegend = (props: { payload?: Array<{ value: string; color: string }> }) => {
    const { payload } = props;
    if (!payload) return null;
    return (
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-4 mt-6">
        {payload.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-1.5">
            <div
              className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[13px] font-body text-muted-foreground whitespace-nowrap">
              {OFFENCE_SHORT_LABELS[entry.value] || entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={data.length * 46 + 120}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 8, bottom: 70 }} stackOffset="expand" barSize={24}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis
            type="number"
            tick={tickStyle}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            domain={[0, 1]}
            label={{ value: "Proportion of Records", position: "insideBottom", offset: -12, ...axisLabelStyle }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fontSize: 13, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
          />
          <Legend
            content={renderLegend}
            verticalAlign="bottom"
          />
          {offenceNames.map((offence) => (
            <Bar
              key={offence}
              dataKey={offence}
              stackId="a"
              fill={OFFENCE_COLORS[offence] ?? "hsl(var(--muted))"}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
