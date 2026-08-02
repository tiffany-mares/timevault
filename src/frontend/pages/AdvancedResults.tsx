import { useSearchParams, useNavigate, Link } from "react-router-dom";
import React, { useState, useEffect, useMemo } from "react";
import html2canvas from "html2canvas"
import { setExportPayload } from "@/lib/exportStore"
import { PageLayout } from "@/components/PageLayout";
import { WireBox, WireButton } from "@/components/wireframe";
import { ChevronDown, ChevronUp, ArrowLeft, Maximize2, X, Download, BookOpen, AlignVerticalSpaceAround, AlignHorizontalSpaceAround, Code } from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpFloatMenu } from "@/components/HelpFloatMenu";
import { SaveToDashboard } from "@/components/SaveToDashboard";
import { OffenceDistributionChart, TopPatternLiftsChart, ConditionalHeatmap, PerCapitaStackedChart, generateKeyFindings, computeModelMetrics, type HeatmapViewMode } from "@/components/NaiveBayesViz";
import lrFallback from "@/data/logistic_regression_results.json";
import dtResults from "@/data/decision_tree_results.json";
import { VerticalTree, HorizontalTree, ExpandedContext, type TreeNode } from "@/components/DecisionTreeViz";

// Mapping from display names (URL params) to backend feature keys
type BayesFeatureKey = "rank" | "unit_type" | "enlistment_year";
const DISPLAY_TO_BAYES_KEY: Record<string, BayesFeatureKey> = {
  "Rank": "rank",
  "Unit Type": "unit_type",
  "Enlistment Year": "enlistment_year",
};

const ExpandableViz = ({ label, filterLabel, children }: {
  label: string; filterLabel?: string; children: React.ReactNode
}) => {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <ExpandedContext.Provider value={true}>
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-auto p-8 md:p-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <span className="text-xl font-serif font-bold text-foreground">{label}</span>
                {filterLabel && <span className="text-sm font-body text-muted-foreground mt-1 normal-case tracking-normal">{filterLabel}</span>}
              </div>
              <button onClick={() => setExpanded(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-body border border-border rounded-md hover:bg-secondary hover:border-olive/40 hover:shadow-sm transition-all duration-200">
                <X className="w-4 h-4" /> Close
              </button>
            </div>
            {children}
          </div>
        </div>
      </ExpandedContext.Provider>
    );
  }

  return (
    <ExpandedContext.Provider value={false}>
      <WireBox dashed={false} label={label}>
        <div className="flex items-start justify-between -mt-2 mb-3">
          {filterLabel && <p className="text-xs font-body text-muted-foreground normal-case tracking-normal pr-8">{filterLabel}</p>}
          <button onClick={() => setExpanded(true)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 -mt-1"
            title="Expand fullscreen">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        <div>
          {children}
        </div>
      </WireBox>
    </ExpandedContext.Provider>
  );
};

const methodInfo: Record<string, { label: string; subtitle: string; technical: string }> = {
  decision_tree: { label: "Decision Tree", subtitle: "Predicting Court Martial", technical: "Decision Tree Classification" },
  logistic_regression: { label: "Logistic Regression", subtitle: "Ranking Feature Importance", technical: "Logistic Regression" },
  naive_bayes: { label: "Naive Bayes", subtitle: "Pattern Discovery by Offence", technical: "Naive Bayes Pattern Discovery" },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type DtTreeNode = {
  rate: number;
  samples: number;
  label?: string;
  ratio?: number;
  question?: string;
  yes?: DtTreeNode;
  no?: DtTreeNode;
};

type DtResults = {
  tree_structure: DtTreeNode;
  baseline_rate: number;
  findings: string[];
  metrics: { precision: number; recall: number; accuracy: number };
  model_info: { features: string[]; train_size: number; test_size: number; max_depth: number; min_samples_leaf: number };
};

// ── buildTreeFindings ─────────────────────────────────────────────────────────
// Traverses the structured tree_structure JSON from dtResults rather than
// parsing the raw text tree_lines. Uses recursive helpers to collect nodes,
// leaves, and feature depths.

function buildTreeFindings(dt: DtResults): string[] {
  const findings: string[] = [];
  const root = dt.tree_structure;
  const baseline = dt.baseline_rate;

  // Collect ALL nodes via DFS
  function collectNodes(node: DtTreeNode): DtTreeNode[] {
    const acc: DtTreeNode[] = [node];
    if (node.yes) acc.push(...collectNodes(node.yes));
    if (node.no)  acc.push(...collectNodes(node.no));
    return acc;
  }

  // Collect leaf nodes only (no children)
  function collectLeaves(node: DtTreeNode): DtTreeNode[] {
    if (!node.yes && !node.no) return [node];
    const acc: DtTreeNode[] = [];
    if (node.yes) acc.push(...collectLeaves(node.yes));
    if (node.no)  acc.push(...collectLeaves(node.no));
    return acc;
  }

  // Walk the tree collecting split features with their depth of first appearance
  function collectFeatures(node: DtTreeNode, depth = 0): { feature: string; depth: number }[] {
    if (!node.question) return [];
    const feature = node.question.replace(/\s*(<=|=|>=)\s*.+\??$/, "").trim();
    return [
      { feature, depth },
      ...(node.yes ? collectFeatures(node.yes, depth + 1) : []),
      ...(node.no  ? collectFeatures(node.no,  depth + 1) : []),
    ];
  }

  const leaves = collectLeaves(root);
  const featureOccurrences = collectFeatures(root);

  // Finding 1: Root split, most important feature
  if (root.question) {
    const feature = root.question.replace(/\s*(<=|=|>=)\s*.+\??$/, "").trim();
    if (root.yes && root.no) {
      const high = Math.max(root.yes.rate, root.no.rate);
      const low  = Math.min(root.yes.rate, root.no.rate);
      const ratio = low > 0 ? (high / low).toFixed(1) : "∞";
      findings.push(
        `${feature} is the strongest predictor. As the root split it produces the largest single separation in court martial rates (${high}% vs ${low}%, a ${ratio}× difference).`
      );
    }
  }

  // ── Finding 2: Leaf rate range and spread ────────────────────────────────
  const leafRates = leaves.map(l => l.rate).sort((a, b) => a - b);
  if (leafRates.length >= 2) {
    const minRate = leafRates[0];
    const maxRate = leafRates[leafRates.length - 1];
    const spread  = (maxRate - minRate).toFixed(1);
    const ratio   = minRate > 0 ? (maxRate / minRate).toFixed(0) : null;
    const ratioClause = ratio
      ? `, approximately ${ratio}× higher at the extreme than the lowest-risk group`
      : "";
    findings.push(
      `Court martial rates across the ${leaves.length} leaf segments span ${spread} percentage points ` +
      `(${minRate}% to ${maxRate}%)${ratioClause}, showing that specific feature combinations produce dramatically different outcomes.`
    );
  }

  // ── Finding 3: Highest- and lowest-risk leaves using ratio labels ─────────
  const labelledLeaves = leaves.filter(l => l.ratio !== undefined);
  if (labelledLeaves.length > 0) {
    const sorted = [...labelledLeaves].sort((a, b) => b.ratio! - a.ratio!);
    const highest = sorted[0];
    const lowest  = sorted[sorted.length - 1];

    if (highest.ratio !== undefined && highest.ratio > 1) {
      findings.push(
        `The highest-risk profile is ${highest.ratio.toFixed(1)}× more likely to result in a court martial than the average soldier ` +
        `(${highest.rate}% vs ${baseline}% baseline), based on ${highest.samples.toLocaleString()} soldiers matching that profile.`
      );
    }
    if (lowest.ratio !== undefined && lowest.ratio < 1) {
      findings.push(
        `The lowest-risk profile is ${(1 / lowest.ratio).toFixed(1)}× less likely than average to face a court martial ` +
        `(${lowest.rate}% vs ${baseline}% baseline), across ${lowest.samples.toLocaleString()} soldiers.`
      );
    }
  }

  // ── Finding 4: Feature depth ranking ─────────────────────────────────────
  const firstDepth: Record<string, number> = {};
  const featureCount: Record<string, number> = {};
  featureOccurrences.forEach(({ feature, depth }) => {
    if (firstDepth[feature] === undefined || depth < firstDepth[feature]) {
      firstDepth[feature] = depth;
    }
    featureCount[feature] = (featureCount[feature] ?? 0) + 1;
  });

  const rankedFeatures = Object.entries(firstDepth)
    .sort(([, a], [, b]) => a - b)
    .map(([f]) => `${f} (used ${featureCount[f]} time${featureCount[f] > 1 ? "s" : ""})`);

  if (rankedFeatures.length > 0) {
    findings.push(
      `Features in order of first split depth: ${rankedFeatures.join(", ")}. ` +
      `Features appearing earlier in the tree account for more variance in court martial outcomes.`
    );
  }

  // Finding 5: Sample coverage, largest vs smallest leaf
  const leafBySamples = [...leaves].sort((a, b) => b.samples - a.samples);
  const largest  = leafBySamples[0];
  const smallest = leafBySamples[leafBySamples.length - 1];
  const totalSamples = root.samples;

  if (largest && smallest) {
    const largestPct  = ((largest.samples  / totalSamples) * 100).toFixed(1);
    const smallestPct = ((smallest.samples / totalSamples) * 100).toFixed(1);
    findings.push(
      `The largest leaf group covers ${largest.samples.toLocaleString()} soldiers (${largestPct}% of the dataset) ` +
      `with a court martial rate of ${largest.rate}%, while the smallest covers only ` +
      `${smallest.samples.toLocaleString()} (${smallestPct}%) at ${smallest.rate}%, ` +
      `highlighting that rare high-risk profiles are also small in population.`
    );
  }

  // ── Finding 6: Low-risk leaf count (below baseline) ──────────────────────
  const lowLeaves = leaves.filter(l => l.rate < baseline);
  if (lowLeaves.length > 0) {
    const avgLow = (lowLeaves.reduce((s, l) => s + l.rate, 0) / lowLeaves.length).toFixed(2);
    findings.push(
      `${lowLeaves.length} of ${leaves.length} leaf segments fall below the ${baseline}% baseline, ` +
      `averaging ${avgLow}%. These branches represent soldier profiles where court martial proceedings were exceptionally rare.`
    );
  }

  return findings;
}

const allLrCoefficients = lrFallback.coefficients;

const fmtCoeff = (v: number) => (v > 0 ? "+" : "") + v.toFixed(2);
const valLabel = (c: {feature: string; value: number}) => c.feature.split(": ").pop() || c.feature;

const allAvailableFeatures  = [
  "Rank", "Unit Type", "Birthplace", "Occupation",
  "Marital Status", "Enlistment Year", "Birth Year",
];

function coeffBelongsToFeature(coeffName: string, feature: string): boolean {
  if (coeffName === feature)  return true;
  return coeffName.startsWith(feature + ": ");
}

function filterCoefficients(
  coeffs: typeof allLrCoefficients, features: string[]
) {
  return coeffs.filter(c =>
    features.some(f => coeffBelongsToFeature(c.feature, f))
  );
}

function groupByFeature(
  coeffs: typeof allLrCoefficients, features: string[],
) {
  const groups: Record<string, typeof allLrCoefficients>  = {};
  for (const f of features) {
    groups[f] = coeffs.filter(c => coeffBelongsToFeature(c.feature, f))
                      .sort((a, b) => b.value - a.value);
  }
  return groups;
}

function buildRegressionFindings(
  filteredCoeffs: typeof allLrCoefficients,
  displayFeatures: string[],
  excluded: string[],
  lr: typeof lrFallback
) {
  const findings: string[] = [];
  const {metrics, model_details} = lr;
  const groups = groupByFeature(filteredCoeffs, displayFeatures);
  const sorted = [...filteredCoeffs].sort((a,b) => Math.abs(b.value) - Math.abs(a.value));

  if (excluded.length > 0) {
    findings.push(`Analysis scope: ${displayFeatures.length} of ${allAvailableFeatures.length} features selected (${excluded.join(", ")} excluded). Results reflect only the selected features.`);
  }

  const featureSpread = displayFeatures.map(f => {
    const g = groups[f];
    if (!g || g.length === 0) return null;
    const maxAbs = Math.max(...g.map(c => Math.abs(c.value)));
    return { feature: f, maxAbs, group: g };
  }).filter(Boolean).sort((a, b) => b!.maxAbs - a!.maxAbs);

  if (featureSpread.length > 0) {
    const top = featureSpread[0]!;
    const topHighest = top.group[0];
    const topLowest = top.group[top.group.length - 1];
    if (top.group.length > 1 && topHighest.value > 0 && topLowest.value < 0) {
      findings.push(
        `${top.feature} shows the widest variation in court martial risk. ${valLabel(topHighest)} has the highest coefficient (${fmtCoeff(topHighest.value)}) while ${valLabel(topLowest)} has the lowest (${fmtCoeff(topLowest.value)}), a spread of ${(topHighest.value - topLowest.value).toFixed(2)}.`
      );
    } else if (top.group.length > 1) {
      findings.push(
        `${top.feature} is the most influential feature. ${valLabel(topHighest)} (${fmtCoeff(topHighest.value)}) and ${valLabel(topLowest)} (${fmtCoeff(topLowest.value)}) sit at opposite ends.`
      );
    } else {
      findings.push(`${top.feature} has a single coefficient: ${topHighest.feature} (${fmtCoeff(topHighest.value)}).`);
    }
  }

  if (groups["Unit Type"]  && groups["Unit Type"].length > 1) {
    const ut = groups["Unit Type"];
    const combatTypes = ["Artillery","Cavalry & Mounted","Machine Gun Corps","Engineers & Signals"];
    const supportTypes = ["Forestry Corps","Medical","Service","Reserves & Training","Headquarters","Police"];
    const combat  = ut.filter(c => combatTypes.some(t => c.feature.includes(t)));
    const support = ut.filter(c => supportTypes.some(t => c.feature.includes(t)));
    const combatAvg  = combat.length  > 0 ? combat.reduce((s, c) => s + c.value, 0) / combat.length  : 0;
    const supportAvg = support.length > 0 ? support.reduce((s, c) => s + c.value, 0) / support.length : 0;

    if (combat.length > 0 && support.length > 0) {
      const higher = combatAvg > supportAvg ? "combat" : "support";
      findings.push(
        `Combat unit types (Artillery, Cavalry, Machine Gun, Engineers & Signals) have an average coefficient of ${fmtCoeff(combatAvg)}, while support unit types (Medical, Service, Forestry, Reserves & Training) average ${fmtCoeff(supportAvg)}. ${higher === "combat" ? "Front-line" : "Rear-echelon"} units show higher court martial risk.`
      );
    }
  }

  if (groups["Rank"] && groups["Rank"].length > 1) {
    const ranks = groups["Rank"];
    const pos = ranks.filter(c => c.value > 0);
    const neg = ranks.filter(c => c.value < 0);
    if (pos.length > 0 && neg.length > 0) {
      findings.push(
        `Among ranks, ${pos.map(c => valLabel(c)).join(", ")} are associated with higher court martial risk, while ${neg.map(c => valLabel(c)).slice(0, 3).join(", ")}${neg.length > 3 ? " and others" : ""} are associated with lower risk.`
      );
    }
  }

  if (groups["Birthplace"] && groups["Birthplace"].length > 1) {
    const bp = groups["Birthplace"];
    const topBp = bp[0];
    const bottomBp = bp[bp.length - 1];
    findings.push(
      `Birthplace effects range from ${valLabel(topBp)} (${fmtCoeff(topBp.value)}) to ${valLabel(bottomBp)} (${fmtCoeff(bottomBp.value)}). ${Math.abs(topBp.value - bottomBp.value) < 0.2 ? "Geographic origin has a relatively modest effect compared to other features." : "Where a soldier came from meaningfully influenced their court martial risk."}`
    );
  }

  if (groups["Enlistment Year"] && groups["Enlistment Year"].length > 1) {
    const ey = groups["Enlistment Year"];
    const highest = ey[0];
    const lowest = ey[ey.length - 1];
    findings.push(
      `Enlistment timing mattered: soldiers who enlisted in ${valLabel(highest).replace("Enlistment Year: ", "")} had the highest risk (${fmtCoeff(highest.value)}), while ${valLabel(lowest).replace("Enlistment Year: ", "")} enlisters had the lowest (${fmtCoeff(lowest.value)}).`
    );
  }

  if (groups["Birth Year"] && groups["Birth Year"].length > 1) {
    const by = groups["Birth Year"];
    const oldest = by.find(c => c.feature.includes("1870") || c.feature.includes("1875"));
    const youngest = by.find(c => c.feature.includes("1895") || c.feature.includes("1890"));
    if (oldest && youngest) {
      findings.push(
        `Age played a role: older soldiers (born ${valLabel(oldest)}, coeff ${fmtCoeff(oldest.value)}) vs. younger soldiers (born ${valLabel(youngest)}, coeff ${fmtCoeff(youngest.value)}) show ${oldest.value > youngest.value ? "older" : "younger"} cohorts at higher risk.`
      );
    }
  }

  const negligible = sorted.filter(c => Math.abs(c.value) < 0.05);
  if (negligible.length > 3) {
    const pct = Math.round(negligible.length / filteredCoeffs.length * 100);
    findings.push(`${negligible.length} of ${filteredCoeffs.length} feature values (${pct}%) have near-zero coefficients, meaning they have little independent effect on court martial likelihood after controlling for other features.`);
  }
  return findings;
}


const AdvancedResults = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [showDetails, setShowModelDetails] = useState(false);
  const [coeffLabelSide, setCoeffLabelSide] = useState<"left"|"right">("left");
  const [coeffSort, setCoeffSort]  = useState<"magnitude"|"positive"|"negative">("magnitude");
  const [lrExpanded, setLrExpanded] = useState(false);

  // Parse URL features for Naive Bayes - map display names to backend keys
  const method = params.get("method") || "decision_tree";
  const featuresParam = params.get("features");
  // Memoize selectedFeatures to prevent unnecessary re-renders that reset active visualization
  const selectedFeatures = useMemo(() =>
    featuresParam ? decodeURIComponent(featuresParam).split(",") : null,
    [featuresParam]
  );

  // Available Bayes features - filtered by what the user selected
  const availableBayesFeatures: BayesFeatureKey[] = useMemo(() => {
    const allFeatures: BayesFeatureKey[] = ["rank", "unit_type", "enlistment_year"];
    if (!selectedFeatures || method !== "naive_bayes") return allFeatures;
    const mapped = selectedFeatures
      .map(f => DISPLAY_TO_BAYES_KEY[f])
      .filter((k): k is BayesFeatureKey => !!k);
    return mapped.length > 0 ? mapped : allFeatures;
  }, [selectedFeatures, method]);

  const bayesMetrics = useMemo(() => computeModelMetrics(availableBayesFeatures), [availableBayesFeatures]);

  // Compute initial selected feature from URL params (single-select)
  const initialBayesFeature = useMemo((): BayesFeatureKey => {
    if (!selectedFeatures || method !== "naive_bayes") {
      return "rank"; // Default to rank
    }
    const mapped = selectedFeatures
      .map(f => DISPLAY_TO_BAYES_KEY[f])
      .filter((k): k is BayesFeatureKey => !!k);
    return mapped.length > 0 ? mapped[0] : "rank";
  }, [selectedFeatures, method]);

  const [selectedBayesFeature, setSelectedBayesFeature] = useState<BayesFeatureKey>(initialBayesFeature);
  const [activeHeatmap, setActiveHeatmap] = useState<BayesFeatureKey>(initialBayesFeature);
  const [heatmapViewMode, setHeatmapViewMode] = useState<HeatmapViewMode>("raw");
  const [activeStacked, setActiveStacked] = useState<BayesFeatureKey>(initialBayesFeature);

  // Sync state when URL params change (e.g., navigating back and forth)
  useEffect(() => {
    setSelectedBayesFeature(initialBayesFeature);
    setActiveHeatmap(initialBayesFeature);
    setActiveStacked(initialBayesFeature);
  }, [initialBayesFeature]);

  // Dynamic findings filtered by selected feature
  const bayesFindings = useMemo(() => {
    return generateKeyFindings([selectedBayesFeature]);
  }, [selectedBayesFeature]);

  // Decision tree state
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [treeView, setTreeView] = useState<"vertical" | "horizontal" | "text">("vertical");
  const [fetchedTreeLines, setFetchedTreeLines] = useState<string[] | null>(null);
  const [fetchedTreeStructure, setFetchedTreeStructure] = useState<TreeNode | null>(null);
  const [fetchedFindings, setFetchedFindings] = useState<string[] | null>(null);
  const [fetchedMetrics, setFetchedMetrics] = useState<{ precision: number; recall: number; accuracy: number } | null>(null);
  const [fetchedModelInfo, setFetchedModelInfo] = useState<{ train_size: number; test_size: number; max_depth: number; min_samples_leaf: number; features: string[] } | null>(null);


  const selectBayesFeature = (f: BayesFeatureKey) => {
    setSelectedBayesFeature(f);
    setActiveHeatmap(f);
    setActiveStacked(f);
  };
  const featureLabel = (f: string) => f === "rank" ? "Rank" : f === "unit_type" ? "Unit Type" : "Enlistment Year";
  const featureLabelUpper = (f: string) => f === "rank" ? "RANK" : f === "unit_type" ? "UNIT TYPE" : "ENLISTMENT YEAR";
  const info = methodInfo[method] || methodInfo.decision_tree;

  const liveDt = (() => {
    try {
      const stored = sessionStorage.getItem("dt_live_results");
      if (stored) return JSON.parse(stored) as typeof dtResults;
    } catch {}
    return dtResults;
  })();

  const liveLr = (() => {
    try {
      const stored = sessionStorage.getItem("lr_live_results");
      if (stored) return JSON.parse(stored) as typeof lrFallback;
    } catch {}
    return lrFallback;
  })();

  const displayTreeLines = liveDt.tree_lines ?? [];
  const displayTreeStructure = (liveDt.tree_structure ?? null) as TreeNode | null;
  const displayMetrics = liveDt.metrics ?? {precision: 78, recall: 72, accuracy: 85};
  const displayModelInfo = liveDt.model_info ??
    {train_size: 48000, test_size: 12000, max_depth: 5, min_samples_leaf: 50, features: []};
  const encodingGuide = (liveDt.encoding_guide ?? null) as Record<string, Record<string, number>> | null;
  const baselineRate = (liveDt as Record<string, unknown>).baseline_rate as number | undefined;

  const lrCoefficients = liveLr.coefficients;
  const displayFeatures  = selectedFeatures ?? liveLr.features_used ?? allAvailableFeatures;
  const excludedFeatures = allAvailableFeatures.filter(f => !displayFeatures.includes(f));
  const filteredCoeffs   = filterCoefficients(lrCoefficients, displayFeatures);
  const sortedCoeffs = [...filteredCoeffs].sort((a,b) => {
      if (coeffSort === "positive") return b.value - a.value;
      if (coeffSort === "negative") return a.value - b.value;
      return Math.abs(b.value) - Math.abs(a.value);
  });
  const maxCoeff = filteredCoeffs.length > 0
      ? Math.max(...filteredCoeffs.map(c => Math.abs(c.value)))  : 1;

  // Build findings from structured JSON tree
  const treeFindings = buildTreeFindings(liveDt as unknown as DtResults);
  const displayFindings = treeFindings;

  const regressionFindings = buildRegressionFindings(
    filteredCoeffs, displayFeatures, excludedFeatures, liveLr
  );
  const filteredRefCats = Object.fromEntries(
    Object.entries(liveLr.model_details.reference_categories)
      .filter(([k]) => displayFeatures.some(f => f.toLowerCase() === k || k.startsWith(f.toLowerCase())))
  );

  return (
    <PageLayout code="P-07R" title={info.label} subtitle={info.subtitle} maxWidth="max-w-7xl">

      {selectedFeatures && (<div className="flex items-center gap-2 flex-wrap mb-2 text-xs font-body">
          <span className="text-muted-foreground font-semibold">Features used:</span>
          {selectedFeatures.map(f =>
            <span key={f} className="px-2 py-0.5 rounded-full bg-gold/15 border border-gold/30 text-foreground text-[11px]">{f}</span>
          )}
        </div>
      )}
      <div className="flex items-center gap-4 mb-4">
          <Link
            to="/metadata"
          className="inline-flex items-center gap-1.5 text-xs font-body text-olive hover:text-olive-light hover:bg-olive/10 transition-all duration-200 underline underline-offset-2 rounded-sm px-1 -mx-1 py-0.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
          View dataset information
          </Link>
        <Link
            to="/user-manual#um-ml"
          className="inline-flex items-center gap-1.5 text-xs font-body text-olive hover:text-olive-light hover:bg-olive/10 transition-all duration-200 underline underline-offset-2 rounded-sm px-1 -mx-1 py-0.5"
        >
            <BookOpen className="w-3.5 h-3.5" />
          View in User Manual
        </Link>
      </div>

      {method === "decision_tree" && (
        <>
        <div id="export-capture">
          <ExpandableViz label="DECISION TREE" filterLabel={`Features: ${(selectedFeatures ?? displayFeatures).join(", ")}`}>

            {/* ── Intro + baseline ── */}
            <div className="mb-5 space-y-3">
              <p className="text-sm font-body text-muted-foreground leading-relaxed">
                This tree shows how the model splits soldiers into subgroups based on their characteristics.
                Each question divides the group further. The final nodes show the <span className="font-semibold text-foreground">court martial rate</span> for
                that subgroup, compared to the overall average.
              </p>

              {/* ── Baseline + colour legend ── */}
              <div className="px-4 py-3 rounded-md bg-secondary/60 border border-border/50 space-y-2.5">
                {baselineRate != null && (
                  <p className="text-sm font-body text-muted-foreground leading-relaxed">
                    Out of all{" "}
                    {displayModelInfo.train_size + displayModelInfo.test_size > 0
                      ? <span className="font-semibold text-foreground">{(displayModelInfo.train_size + displayModelInfo.test_size).toLocaleString()}</span>
                      : ""}{" "}
                    soldiers in the dataset, <span className="font-mono font-bold text-foreground">{baselineRate}%</span> were court-martialled.
                    This is the <span className="font-semibold text-foreground">average</span> that each leaf node is compared against.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-body">
                  <span className="text-muted-foreground font-semibold">Likelihood of being court-martialled compared to the {baselineRate != null ? `${baselineRate}%` : ""} average:</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-rust/20 border border-rust/40" />
                    <span className="text-muted-foreground">2×+ more likely</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-gold/20 border border-gold/40" />
                    <span className="text-muted-foreground">1.3-2× more likely</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-card border border-border" />
                    <span className="text-muted-foreground">Similar to average</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-olive/20 border border-olive/40" />
                    <span className="text-muted-foreground">1.4-3× less likely</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-teal/20 border border-teal/40" />
                    <span className="text-muted-foreground">3×+ less likely</span>
                  </span>
                </div>
              </div>
            </div>

            {/* ── View toggle buttons ── */}
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-body mr-1">Display:</span>
                {([
                  { id: "vertical" as const, icon: AlignVerticalSpaceAround, tip: "Vertical" },
                  { id: "horizontal" as const, icon: AlignHorizontalSpaceAround, tip: "Horizontal" },
                  { id: "text" as const, icon: Code, tip: "Text" },
                ]).map(({ id, icon: Icon, tip }) => (
                  <button
                    key={id}
                    onClick={() => setTreeView(id)}
                    title={tip}
                    className={cn(
                      "p-1.5 rounded-md border text-xs font-body transition-colors flex items-center gap-1",
                      treeView === id
                        ? "bg-olive text-parchment border-olive shadow-sm"
                        : "bg-card border-border text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tip}</span>
                  </button>
                ))}
              </div>
              {treeView !== "text" && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-olive/10 border border-olive/25">
                  <span className="inline-block w-4 h-4 rounded-full bg-olive/30 border-2 border-olive/50 flex-shrink-0" />
                  <span className="text-sm font-body text-foreground/80">
                    <span className="font-semibold">Interactive:</span> Click any of the boxes to expand or collapse its branches
                  </span>
                </div>
              )}
            </div>

            {displayTreeStructure && treeView === "vertical" && <VerticalTree root={displayTreeStructure} />}
            {displayTreeStructure && treeView === "horizontal" && <HorizontalTree root={displayTreeStructure} />}

            {(treeView === "text" || !displayTreeStructure) && (
              <div className="bg-secondary/50 rounded-sm p-6 font-mono text-xs sm:text-sm leading-relaxed whitespace-pre overflow-x-auto">
                {displayTreeLines.map((line, i) =>
                  <div key={i} className={line.includes("court_martial") || line.includes("Court martial") ? "text-foreground" : "text-muted-foreground"}>{line}</div>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground font-body mt-3 italic leading-relaxed">{
              treeView === "text"
                ? "Read top to bottom. Each branch splits soldiers into subgroups based on the feature that best separates court-martialled from non-court-martialled soldiers."
                : "Each question node splits soldiers into two groups based on one characteristic. \"Yes\" follows the left/top branch, \"No\" follows the right/bottom branch. Leaf nodes show the court martial rate and how it compares to the overall average."
            }</p>
          </ExpandableViz>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <WireBox dashed={false} accent="olive" label="KEY FINDINGS">
                <ul className="space-y-4 text-sm font-body text-muted-foreground">
                  {displayFindings.map((f, i) => (
                    <li key={i} className="flex items-start gap-3">
                        <span className="text-olive mt-0.5 font-bold">{i + 1}.</span>
                        <span className="leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>
            </WireBox>
              <WireBox dashed={false} accent="gold" label="ANALYSIS SUMMARY">
                <div className="space-y-4 text-sm font-body">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-secondary/50 rounded-sm">
                        <p className="text-2xl font-mono font-bold text-olive">{((displayModelInfo.train_size + displayModelInfo.test_size) / 1000).toFixed(1)}k</p>
                        <p className="text-sm text-muted-foreground mt-1">Soldiers Analyzed</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/50 rounded-sm">
                        <p className="text-2xl font-mono font-bold text-olive">{displayModelInfo.max_depth}</p>
                        <p className="text-sm text-muted-foreground mt-1">Tree Depth</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/50 rounded-sm">
                          <p className="text-2xl font-mono font-bold text-olive">{(selectedFeatures ?? displayModelInfo.features ?? []).length}</p>
                          <p className="text-sm text-muted-foreground mt-1">Features Used</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/50 rounded-sm">
                        <p className="text-2xl font-mono font-bold text-olive">{baselineRate ?? "1.6"}%</p>
                        <p className="text-sm text-muted-foreground mt-1">Baseline Rate</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed mt-3">
                      The decision tree splits soldiers into subgroups by asking yes/no questions about their demographics. Each leaf node represents a group with a distinct court martial rate. Groups with rates well above the <span className="font-semibold text-foreground">{baselineRate ?? "1.6"}% baseline</span> reveal higher-risk profiles, while those below it identify lower-risk populations. The tree achieved <span className="font-semibold text-foreground">{displayMetrics.recall}% recall</span> on unseen test data.
                    </p>
                    <div className="pt-2 border-t border-border/50 mt-3">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">Data source:</span> CEF enlistment and court martial records ({(displayModelInfo.train_size + displayModelInfo.test_size).toLocaleString()} soldiers)
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-semibold text-foreground">Train/test split:</span> 80/20 ({displayModelInfo.train_size.toLocaleString()} / {displayModelInfo.test_size.toLocaleString()} soldiers)
                      </p>
                    </div>
                </div>
              </WireBox>
          </div>

          {encodingGuide && Object.keys(encodingGuide).length > 0 && <div className="mt-8">
            <WireBox dashed={false} accent="teal" label="HOW TO READ THE TREE">
              <div className="space-y-4 text-sm font-body">
                <p className="text-muted-foreground leading-relaxed">
                  Each split in the tree asks <span className="font-semibold text-foreground">&ldquo;Is feature &le; value?&rdquo;</span> Categorical features like Rank or Birthplace are converted to numbers in alphabetical order.
                  The <span className="text-olive font-semibold">Yes</span> branch includes all categories with a code <strong>at or below</strong> the threshold; the <span className="text-rust font-semibold">No</span> branch includes everything above it.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Numerical features</span> like Enlistment Year and Birth Year are already numbers, so their splits are straightforward.
                  For example, <span className="font-semibold text-foreground">&ldquo;Enlistment Year &le; 1916&rdquo;</span> means soldiers who enlisted in 1916 or earlier go to the <span className="text-olive font-semibold">Yes</span> branch, and those who enlisted after 1916 go to the <span className="text-rust font-semibold">No</span> branch.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(encodingGuide).map(([feature, mapping]) =>
                    <div key={feature} className="bg-secondary/40 rounded-md p-3">
                      <p className="font-semibold text-foreground mb-2">{feature}</p>
                      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                        <span className="text-muted-foreground font-mono font-bold">Code</span>
                        <span className="text-muted-foreground font-bold">Value</span>
                        {Object.entries(mapping).sort(([,a],[,b]) => a - b).map(([label, code]) =>
                          <React.Fragment key={label}>
                            <span className="font-mono text-teal">{code}</span>
                            <span className="text-foreground">{label}</span>
                          </React.Fragment>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground italic">Example: &ldquo;Rank &le; 0&rdquo; means the Yes branch contains only the category coded 0. Check the tables above to see which category that is. For a full explanation, see the User Manual.</p>
              </div>
            </WireBox>
          </div>}

          <WireBox dashed={false} label="HOW THIS ANALYSIS WORKS">
              <div className="space-y-3 text-xs font-body text-muted-foreground leading-relaxed">
                <p>
                  A decision tree is a supervised classification algorithm. The model examines every selected feature and every possible split point, choosing the one that best separates court-martialled from non-court-martialled soldiers. This "best split" is measured using <span className="font-semibold text-foreground">Gini impurity</span>, a metric that quantifies how mixed a group is. A pure group (all court-martialled or all not) has a Gini of 0; a perfectly mixed group has a Gini of 0.5.
                </p>
                <p>
                  After the first split, the algorithm repeats the process on each resulting subgroup, building a tree of if-then rules. The tree grows until it reaches a maximum depth (here, {displayModelInfo.max_depth} levels) or a subgroup becomes too small to split further (minimum {displayModelInfo.min_samples_leaf} soldiers per leaf). The maximum depth <span className="font-semibold text-foreground">scales with the number of selected features</span>: fewer features use a shallower tree (4 levels for 1-2 features) to avoid overfitting, while more features allow a deeper tree (up to 7 levels for 6-7 features) so the model has enough room to capture meaningful interactions between them. Features appearing higher in the tree are more important predictors overall.
                </p>
                <p>
                  <span className="font-semibold text-foreground">Reading the tree:</span> The tree is interactive. Click any decision node to expand or collapse its branches. Each decision node asks a yes/no question about a single feature (e.g. "Rank ≤ Private?" or "Occupation = Labourer?"). Follow the "Yes" or "No" branch to see how the group is further divided. Categorical features like birthplace and occupation use <span className="font-semibold text-foreground">one-hot encoding</span>, so each split asks whether a soldier belongs to one specific category.
                </p>
                <p>
                  <span className="font-semibold text-foreground">Leaf nodes</span> are the final outcomes. Each one shows the court martial rate for soldiers who match all conditions along that path, along with how that rate compares to the overall baseline{baselineRate != null ? ` of ${baselineRate}%` : ""}. Leaves are colour-coded: <span className="text-rust font-semibold">red</span> for groups with much higher risk than average, <span className="text-gold font-semibold">amber</span> for moderately higher, <span className="text-olive font-semibold">green</span> for lower risk, and <span className="text-teal font-semibold">teal</span> for much lower risk.
                </p>
                <p>
                  Because only about {baselineRate ?? "1.6"}% of soldiers in the dataset were court-martialled, the model applies <span className="font-semibold text-foreground">balanced class weighting</span> during training. Without this, the model would simply predict "not court-martialled" for everyone and still achieve ~98% accuracy, while being useless for identifying actual patterns.
                </p>
                <p>
                    The tree is trained on 80% of the data and tested on the remaining 20% to verify that the patterns it finds generalize to unseen soldiers, rather than simply memorizing the training set.
                </p>
              </div>
            </WireBox>

            <WireBox dashed={false} label="HOW THE MODEL HANDLES DIFFERENT DATA TYPES">
              <div className="space-y-3 text-xs font-body text-muted-foreground leading-relaxed">
                <p>
                  The features in this dataset fall into three categories, and each is handled differently by the model:
                </p>

                <div className="space-y-3 pl-1">
                  <div className="border-l-2 border-olive/30 pl-3">
                    <p className="font-semibold text-foreground text-[11px] mb-1">Numerical features (Enlistment Year, Birth Year)</p>
                    <p>These are already numbers, so the model can use them directly. Splits appear as threshold questions like <span className="font-mono text-foreground">"Enlistment Year ≤ 1916?"</span>. Soldiers who enlisted in 1916 or earlier go one way, later enlisters go the other.</p>
                  </div>

                  <div className="border-l-2 border-gold/30 pl-3">
                    <p className="font-semibold text-foreground text-[11px] mb-1">Ordinal feature (Rank)</p>
                    <p>Rank has a natural military hierarchy. The model preserves this order by converting each rank to a number based on its position, so that splits like <span className="font-mono text-foreground">"Rank ≤ Private?"</span> meaningfully separate lower ranks from higher ones. The hierarchy used is:</p>
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 mt-2">
                      {["Private", "Corporal", "Sergeant", "Lieutenant", "Captain", "Major", "Colonel", "General"].map((rank, i) => (
                        <span key={rank} className="inline-flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded bg-gold/10 border border-gold/25 text-foreground font-mono text-[10px]">{i}</span>
                          <span className="text-foreground text-[11px]">{rank}</span>
                          {i < 7 && <span className="text-muted-foreground/40 mx-0.5">→</span>}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2">A split like <span className="font-mono text-foreground">"Rank ≤ Private?"</span> asks: "Is this soldier a Private (0) or lower?", meaning Privates go to the "Yes" branch and all higher ranks (Corporal through General) go to "No".</p>
                  </div>

                  <div className="border-l-2 border-teal/30 pl-3">
                    <p className="font-semibold text-foreground text-[11px] mb-1">Nominal features (Place of Birth, Occupation, Marital Status)</p>
                    <p>These categories have no inherent order. "England" is not greater than "Scotland", and "Labourer" is not above "Farmer". Assigning arbitrary numbers (England = 1, Scotland = 2) would mislead the model into thinking Scotland {">"} England, creating false patterns.</p>
                    <p className="mt-1.5">
                      Instead, the model uses <span className="font-semibold text-foreground">one-hot encoding</span>: each category becomes its own yes/no column. For example, "Place of Birth" with values like England, Scotland, and Ireland becomes three separate columns: <span className="font-mono text-foreground">Place_of_Birth_England</span>, <span className="font-mono text-foreground">Place_of_Birth_Scotland</span>, and <span className="font-mono text-foreground">Place_of_Birth_Ireland</span>. Each soldier gets a 1 in the column matching their birthplace and 0s everywhere else.
                    </p>
                    <p className="mt-1.5">
                      This is why tree splits on these features appear as simple equality questions like <span className="font-mono text-foreground">"Place of Birth = England?"</span> rather than <span className="font-mono text-foreground">"Place of Birth ≤ England?"</span>, because the model is really asking "is this soldier's England column equal to 1?"
                    </p>
                  </div>
                </div>
              </div>
            </WireBox>
        </>
      )}

      {method === "logistic_regression" && (
        <>
          <div id="export-capture">
            <ExpandableViz label="FEATURE COEFFICIENTS" filterLabel={`Features: ${displayFeatures.join(", ")} · Positive = increases court martial likelihood, Negative = decreases it`}>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="text-[10px] text-muted-foreground/60 font-body mr-1">Labels:</span>
                  <button onClick={() => setCoeffLabelSide("left")} className={cn("text-[11px] px-3 py-1 rounded border font-body transition-colors",
                      coeffLabelSide === "left" ? "bg-olive/15 border-olive/40 text-foreground" : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-olive/5 hover:border-olive/30"
                    )}>Left</button>
                  <button onClick={() => setCoeffLabelSide("right")} className={cn(
                    "text-[11px] px-3 py-1 rounded border font-body transition-colors",
                    coeffLabelSide === "right" ? "bg-olive/15 border-olive/40 text-foreground" : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-olive/5 hover:border-olive/30"
                  )}>Right</button>
                  <span className="w-px h-4 bg-border/50 mx-1" />
                  <span className="text-[10px] text-muted-foreground/60 font-body mr-1">Sort:</span>
                <button onClick={() => setCoeffSort("magnitude")} className={cn("text-[11px] px-3 py-1 rounded border font-body transition-colors",
                  coeffSort === "magnitude" ? "bg-olive/15 border-olive/40 text-foreground" : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-olive/5 hover:border-olive/30"
                )}>Magnitude</button>
                  <button onClick={() => setCoeffSort("positive")} className={cn(
                      "text-[11px] px-3 py-1 rounded border font-body transition-colors",
                      coeffSort === "positive" ? "bg-olive/15 border-olive/40 text-foreground" : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-olive/5 hover:border-olive/30"
                    )}>Positive → Negative</button>
                  <button onClick={() => setCoeffSort("negative")}
                    className={cn("text-[11px] px-3 py-1 rounded border font-body transition-colors",
                      coeffSort === "negative" ? "bg-olive/15 border-olive/40 text-foreground" : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-olive/5 hover:border-olive/30"
                  )}>Negative → Positive</button>
              </div>
              {(() => {
                const LR_INITIAL_LIMIT = 15;
                const displayCoeffs = lrExpanded ? sortedCoeffs : sortedCoeffs.slice(0, LR_INITIAL_LIMIT);
                const canExpandLr = sortedCoeffs.length > LR_INITIAL_LIMIT;
                const hiddenCount = sortedCoeffs.length - LR_INITIAL_LIMIT;
                return (
                  <>
                    <div className="space-y-1.5 py-2">
                      {displayCoeffs.map((c) => {
                          const pct = (Math.abs(c.value) / maxCoeff) * 100;
                          const isPositive = c.value > 0;
                          const oddsRatio = Math.exp(c.value);
                          const oddsText = isPositive
                            ? `${oddsRatio.toFixed(2)}x higher odds of court martial`
                            : `${(1 / oddsRatio).toFixed(2)}x lower odds of court martial`;
                        const labelSpan = (<span className={cn(
                          "min-w-[260px] text-xs text-muted-foreground flex-shrink-0",
                          coeffLabelSide === "left" ? "text-right" : "text-left"
                          )}>{c.feature}</span>
                        );
                          const valueSpan = (
                            <span className={cn("w-[60px] text-xs font-mono tabular-nums flex-shrink-0",
                              coeffLabelSide === "left" ? "text-right" : "text-left",
                                isPositive ? "text-olive" : "text-rust"
                            )}>
                              {isPositive ? "+" : ""}{c.value.toFixed(2)}
                            </span>
                          );
                        return (
                          <div key={c.feature} className="group/bar relative flex items-center gap-3 text-sm font-body">
                            {coeffLabelSide === "left" ? labelSpan : valueSpan}
                              <div className="flex-1 flex items-center h-7 relative">
                                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
                                {isPositive ? (
                                  <div className="absolute left-1/2 h-5 rounded-r-sm bg-olive/70 transition-all group-hover/bar:bg-olive/90" style={{ width: `${pct / 2}%` }} />
                                ) : (
                                    <div className="absolute h-5 rounded-l-sm bg-rust/70 transition-all group-hover/bar:bg-rust/90" style={{ width: `${pct / 2}%`, right: "50%" }} />
                                )}
                              </div>
                            {coeffLabelSide === "left" ? valueSpan : labelSpan}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-4 py-2.5 bg-foreground text-background rounded-md opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg whitespace-nowrap text-xs">
                              <p className="font-semibold mb-1">{c.feature}</p>
                              <p>Coefficient: <span className="font-mono">{isPositive ? "+" : ""}{c.value.toFixed(3)}</span></p>
                              <p>Odds ratio: <span className="font-mono">{oddsRatio.toFixed(2)}x</span></p>
                              <p className={isPositive ? "text-green-300" : "text-red-300"}>{oddsText}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className={cn("flex justify-between text-[10px] text-muted-foreground/60 font-body mt-2",
                        coeffLabelSide === "left" ? "px-[260px]" : "px-[60px]"
                      )}>
                        <span>Decreases likelihood</span>
                        <span>Increases likelihood</span>
                    </div>
                    {canExpandLr && (
                      <div className="flex justify-center mt-3">
                        <button
                          onClick={() => setLrExpanded(!lrExpanded)}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-body border border-border rounded-md hover:bg-secondary hover:border-olive/40 hover:shadow-sm transition-all duration-200 text-muted-foreground hover:text-foreground"
                        >
                          {lrExpanded ? (
                            <><ChevronUp className="w-4 h-4" /> Show Top {LR_INITIAL_LIMIT} Coefficients</>
                          ) : (
                            <><ChevronDown className="w-4 h-4" /> Show All {sortedCoeffs.length} Coefficients ({hiddenCount} more)</>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </ExpandableViz>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              <WireBox dashed={false} accent="olive" label="KEY FINDINGS">
                <ul className="space-y-4 text-sm font-body text-muted-foreground">
                    {regressionFindings.map((f, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="text-olive mt-0.5 font-bold">{i + 1}.</span>
                        <span className="leading-relaxed">{f}</span>
                      </li>
                    ))}
                </ul>
              </WireBox>
              <WireBox dashed={false} accent="gold" label="ANALYSIS SUMMARY">
                  <div className="space-y-4 text-sm font-body">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-secondary/50 rounded-sm">
                          <p className="text-2xl font-mono font-bold text-olive">{(liveLr.model_details.total_soldiers / 1000).toFixed(1)}k</p>
                          <p className="text-sm text-muted-foreground mt-1">Soldiers Analyzed</p>
                        </div>
                        <div className="text-center p-3 bg-secondary/50 rounded-sm">
                            <p className="text-2xl font-mono font-bold text-olive">{filteredCoeffs.length}</p>
                            <p className="text-sm text-muted-foreground mt-1">Feature Values</p>
                        </div>
                      <div className="text-center p-3 bg-secondary/50 rounded-sm">
                        <p className="text-2xl font-mono font-bold text-olive">{(liveLr.model_details.court_martial_rate * 100).toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground mt-1">Baseline Rate</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed mt-3">
                      Logistic regression assigns a <span className="font-semibold text-foreground">coefficient (weight)</span> to each feature value, measuring how much it increases or decreases the odds of court martial. Positive coefficients (blue bars) indicate higher risk, negative (red) indicate lower.
                    </p>
                    <div className="pt-2 border-t border-border/50 mt-3">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">Data source:</span> CEF enlistment and court martial records ({liveLr.model_details.total_soldiers.toLocaleString()} soldiers)
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          <span className="font-semibold text-foreground">Train/test split:</span> 80/20 ({liveLr.model_details.train_size.toLocaleString()} / {liveLr.model_details.test_size.toLocaleString()} soldiers)
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          <span className="font-semibold text-foreground">Encoding:</span> One-hot ({filteredCoeffs.length} of {liveLr.model_details.feature_columns} columns) with balanced class weighting
                        </p>
                    </div>
                  </div>
              </WireBox>
            </div>

            <WireBox dashed={false} label="HOW THIS ANALYSIS WORKS"
              >
                <div className="space-y-3 text-xs font-body text-muted-foreground leading-relaxed">
                  <p>
                    Logistic regression models the probability that a soldier was court-martialled as a function of their demographic features. Unlike a decision tree that produces rules, logistic regression fits a single mathematical equation. Specifically, it learns a <span className="font-semibold text-foreground">coefficient (weight)</span> for each feature value that represents the change in log-odds of court martial.
                  </p>
                  <p>
                    Before training, each categorical feature is <span className="font-semibold text-foreground">one-hot encoded</span>: for instance, the "Rank" feature becomes separate binary columns for Private, Corporal, Sergeant,  etc. One category per feature is dropped as the <span className="font-semibold text-foreground">reference category</span> to avoid mathematical redundancy. All coefficients are then interpreted relative to this reference. A coefficient of +0.8 on "Rank: Private" means Privates have 0.8 higher log-odds of court martial compared to the dropped reference rank.
                  </p>

                    <p>
                      In practical terms, a coefficient of +1.0 roughly <span className="font-semibold text-foreground">triples</span> the odds of court martial compared to the reference, while -1.0 roughly <span className="font-semibold text-foreground">divides them by three</span>. Values near zero indicate little independent effect. The bar chart above visualizes these coefficients: green bars extending right increase court martial likelihood, red bars extending left decrease it, and longer bars indicate stronger effects.
                </p>
                  <p>
                    The model uses <span className="font-semibold text-foreground">balanced class weighting</span> to handle the low court martial rate (~1.7%). The dataset is split 80/20 into training and test sets. The model learns coefficients from the training set and is evaluated on unseen test data to prevent overfitting.
                  </p>
                </div>
              </WireBox>
        </>
      )}

      {method === "naive_bayes" && (
          <>
            <nav className="sticky top-16 z-40 -mx-1 px-1 py-2">
              <div className="flex items-center gap-1 bg-card/90 backdrop-blur border border-border rounded-md px-3 py-2 shadow-sm overflow-x-auto">
                <span className="text-[10px] font-body text-muted-foreground uppercase tracking-wide mr-2 flex-shrink-0">Jump to:</span>
                {[
                  { id: "nb-distribution", label: "Distribution" },
                  { id: "nb-lifts", label: "Top Lifts" },
                  { id: "nb-heatmap", label: "Heatmap" },
                  { id: "nb-breakdown", label: "Breakdown" },
                  { id: "nb-findings", label: "Findings" },
                  { id: "nb-method", label: "Method" },
                  { id: "nb-details", label: "Details" },
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

            <div id="export-capture">
            <div id="nb-distribution" className="scroll-mt-28" />
            <ExpandableViz label="OFFENCE DISTRIBUTION" filterLabel="Proportion of each offence category in the courts martial dataset">
              <OffenceDistributionChart />
            </ExpandableViz>

            <div id="nb-lifts" className="scroll-mt-28" />
            <div className="relative mt-6">
              {}
              <div className="fixed left-4 top-1/2 -translate-y-1/2 w-32 hidden xl:block z-30">
                <span className="text-[10px] font-body uppercase tracking-widest text-muted-foreground block mb-2">Analyze</span>
                <div className="flex flex-col gap-1.5">
                  {availableBayesFeatures.map(f => (
                    <button key={f} onClick={() => selectBayesFeature(f)}
                      className={cn("text-[13px] px-3 py-1.5 rounded border font-body transition-colors text-left",
                        selectedBayesFeature === f ? "bg-olive/15 border-olive/40 text-foreground font-semibold" : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-olive/5 hover:border-olive/30"
                      )}>{featureLabel(f)}</button>
                  ))}
                </div>
              </div>

              {/* Inline fallback for smaller screens */}
              <div className="flex items-center gap-2 mb-4 xl:hidden">
                <span className="text-[10px] font-body uppercase tracking-widest text-muted-foreground mr-1">Analyze:</span>
                {availableBayesFeatures.map(f => (
                  <button key={f} onClick={() => selectBayesFeature(f)}
                    className={cn("text-[13px] px-3 py-1.5 rounded border font-body transition-colors",
                      selectedBayesFeature === f ? "bg-olive/15 border-olive/40 text-foreground font-semibold" : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-olive/5 hover:border-olive/30"
                    )}>{featureLabel(f)}</button>
                ))}
              </div>

              <ExpandableViz
                label={`TOP PATTERN LIFTS: ${featureLabelUpper(selectedBayesFeature)}`}
                filterLabel={`Strongest overrepresentations for ${featureLabel(selectedBayesFeature).toLowerCase()} - how much more common a value is within an offence class compared to the overall population`}>
                <TopPatternLiftsChart features={[selectedBayesFeature]} />
              </ExpandableViz>

              <div id="nb-heatmap" className="scroll-mt-28" />
              <ExpandableViz label={`CONDITIONAL PROBABILITIES: ${featureLabelUpper(activeHeatmap)}`} filterLabel={`P(feature value | offence class) - within each offence type, how are ${activeHeatmap === "rank" ? "ranks" : activeHeatmap === "unit_type" ? "unit types" : "enlistment years"} distributed?`}>
                <ConditionalHeatmap feature={activeHeatmap} viewMode={heatmapViewMode} onViewModeChange={setHeatmapViewMode} />
              </ExpandableViz>

              <div id="nb-breakdown" className="scroll-mt-28" />
              <ExpandableViz label={`OFFENCE BREAKDOWN BY ${featureLabelUpper(activeStacked)}`} filterLabel={`Within each ${featureLabel(activeStacked).toLowerCase()}, what proportion of offences falls into each category?`}>
                <PerCapitaStackedChart feature={activeStacked} />
              </ExpandableViz>
            </div>
            </div>

          <div id="nb-findings" className="scroll-mt-28" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              <WireBox dashed={false} accent="olive" label="KEY FINDINGS">
                <ul className="space-y-4 text-sm font-body text-muted-foreground">
                  {bayesFindings.map((f, i) => (
                      <li key={i} className="flex items-start gap-3">
                          <span className="text-olive mt-0.5 font-bold">{i + 1}.</span>
                          <span className="leading-relaxed">{f.text}</span>
                      </li>
                  ))}
                </ul>
              </WireBox>
            <WireBox dashed={false} accent="gold" label="ANALYSIS SUMMARY">
              <div className="space-y-4 text-sm font-body">
                <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-secondary/50 rounded-sm">
                        <p className="text-2xl font-mono font-bold text-olive">{(bayesMetrics.totalRecords / 1000).toFixed(1)}k</p>
                        <p className="text-sm text-muted-foreground mt-1">Records Analyzed</p>
                    </div>
                    <div className="text-center p-3 bg-secondary/50 rounded-sm">
                        <p className="text-2xl font-mono font-bold text-olive">{bayesMetrics.classCount}</p>
                        <p className="text-sm text-muted-foreground mt-1">Offence Classes</p>
                    </div>
                    <div className="text-center p-3 bg-secondary/50 rounded-sm">
                      <p className="text-2xl font-mono font-bold text-olive">{bayesMetrics.featureCount}</p>
                      <p className="text-sm text-muted-foreground mt-1">Features Analyzed</p>
                    </div>
                  <div className="text-center p-3 bg-secondary/50 rounded-sm">
                      <p className="text-2xl font-mono font-bold text-olive">{bayesMetrics.strongPatterns}</p>
                      <p className="text-sm text-muted-foreground mt-1">Patterns Found</p>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed mt-3">
                    Who you were shaped the trouble you faced. <span className="font-semibold text-foreground">Sergeants and officers</span> were far more likely to be charged with drunkenness, while <span className="font-semibold text-foreground">Privates</span> made up most absence and insubordination cases. Where you served and when you enlisted also mattered-soldiers in combat units and early volunteers showed different patterns than those in support roles or later recruits.
                  </p>
                <div className="pt-2 border-t border-border/50 mt-3">
                  <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Data source:</span> Court martial records ({bayesMetrics.totalRecords.toLocaleString()} proceedings)
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-semibold text-foreground">Method:</span> CategoricalNB pattern discovery mode
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-semibold text-foreground">Significant patterns:</span> {bayesMetrics.significantPairs} of {bayesMetrics.totalPairs} feature-class pairs
                  </p>
                </div>
              </div>
            </WireBox>
          </div>

          <div id="nb-method" className="scroll-mt-28" />
          <WireBox dashed={false} label="HOW THIS ANALYSIS WORKS">
              <div className="space-y-3 text-sm font-body text-muted-foreground leading-relaxed">
                <p>
                  Naive Bayes is a probabilistic classifier based on <span className="font-semibold text-foreground">Bayes' theorem</span>. This analysis uses it in <span className="font-semibold text-foreground">pattern discovery mode</span>: rather than just predicting offences, it builds detailed probability tables showing how each demographic feature is distributed within each offence category. We analyzed <span className="font-semibold text-foreground">{bayesMetrics.totalRecords.toLocaleString()} court martial records</span> across <span className="font-semibold text-foreground">{bayesMetrics.classCount} offence categories</span> and <span className="font-semibold text-foreground">{bayesMetrics.featureCount} demographic features</span> (rank, unit type, and enlistment year).
                </p>
                <p>
                  For each offence type, the model calculates the <span className="font-semibold text-foreground">conditional probability</span> of each feature value. For example, P(Private | Drunkenness) = 78% means that 78% of all Drunkenness charges involved Privates. These probabilities are then compared against the <span className="font-semibold text-foreground">baseline rate</span> (overall population distribution) to identify overrepresented and underrepresented groups.
                </p>
                <p>
                  The <span className="font-semibold text-foreground">lift</span> metric (rate vs baseline) is the key measure. A lift of 1.0 means a group appears at exactly the expected rate. Values above 1.3 indicate meaningful overrepresentation, while values below 0.77 indicate underrepresentation. For instance, a lift of 2.85× for Machine Gun Corps in Combat/Enemy offences means soldiers in that unit type were charged with combat-related offences nearly three times more often than their overall representation would predict.
                </p>
                <p>
                  The <span className="font-semibold text-foreground">per-capita stacked charts</span> invert this view: instead of asking "within each offence, what ranks are common?", they ask "within each rank, what offences are common?" This dual perspective reveals whether patterns are driven by the size of a group or by genuine behavioral differences.
                </p>
              </div>
            </WireBox>
          </>
      )}

      <div id="nb-details" className="scroll-mt-28" />
      <div className="panel mt-8 p-5">
          <div className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowModelDetails(!showDetails)}>
            <span className="text-sm font-body font-semibold text-foreground">Model Details</span>
              {showDetails
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />
              }
          </div>
          {showDetails && (
            <div className="mt-4 space-y-2.5 text-sm font-body text-muted-foreground">
                <p className="text-xs italic text-muted-foreground leading-relaxed mb-3">
                  Technical details about the model configuration, data encoding, and train/test split used for this analysis. These parameters control how the algorithm processes the raw data and what constraints are placed on the model  during training.
                </p>
              <p><span className="font-semibold text-foreground">Method:</span> {info.technical}</p>
                {method === "decision_tree" && (
                  <>
                    <p><span className="font-semibold text-foreground">Task:</span> Binary classification (court-martialled vs not)</p>
                    <p><span className="font-semibold text-foreground">Features:</span> {displayModelInfo.features.length > 0 ? displayModelInfo.features.join(", ") : displayFeatures.join(", ")} ({(displayModelInfo.features.length || displayFeatures.length)} of {allAvailableFeatures.length})</p>
                      <p><span className="font-semibold text-foreground">Encoding:</span> Label encoding (categorical features assigned integer values)</p>
                    <p><span className="font-semibold text-foreground">Class weight:</span> Balanced (each court-martialled soldier weighted ~59x)</p>
                    <p><span className="font-semibold text-foreground">Max tree depth:</span> {displayModelInfo.max_depth} levels</p>
                      <p><span className="font-semibold text-foreground">Split criterion:</span> Gini impurity</p>
                  </>
                )}
                {method === "logistic_regression" && (<>
                      <p><span className="font-semibold text-foreground">Task:</span> Binary classification (court-martialled vs not)</p>
                      <p><span className="font-semibold text-foreground">Features used:</span> {displayFeatures.join(", ")} ({displayFeatures.length} of {allAvailableFeatures.length})</p>
                      {excludedFeatures.length > 0 &&
                        <p><span className="font-semibold text-foreground">Features excluded:</span> {excludedFeatures.join(", ")}</p>}
                      <p><span className="font-semibold text-foreground">Encoding:</span> {liveLr.model_details.encoding} ({filteredCoeffs.length} feature columns displayed)</p>
                      <p><span className="font-semibold text-foreground">Class weight:</span> {liveLr.model_details.class_weight}</p>
                      {Object.keys(filteredRefCats).length > 0 && (
                        <p><span className="font-semibold text-foreground">Reference categories:</span> {Object.entries(filteredRefCats).map(([k,v]) => `${v} (${k})`).join(", ")}</p>
                      )}
                      <p><span className="font-semibold text-foreground">Dataset:</span> {liveLr.model_details.total_soldiers.toLocaleString()} soldiers ({liveLr.model_details.court_martialled_count} court-martialled, {(liveLr.model_details.court_martial_rate*100).toFixed(1)}% rate)</p>
                      <p><span className="font-semibold text-foreground">Train/test split:</span> 80/20 ({liveLr.model_details.train_size.toLocaleString()} / {liveLr.model_details.test_size.toLocaleString()} soldiers)</p>
                </>)}
              {method === "naive_bayes" && (
                <>
                    <p><span className="font-semibold text-foreground">Task:</span> Pattern discovery across {bayesMetrics.classCount} offence categories</p>
                    <p><span className="font-semibold text-foreground">Data source:</span> Court martial records ({bayesMetrics.totalRecords.toLocaleString()} proceedings)</p>
                  <p><span className="font-semibold text-foreground">Features:</span> {availableBayesFeatures.map(f => featureLabel(f)).join(", ")} ({bayesMetrics.featureCount} demographic feature{bayesMetrics.featureCount !== 1 ? "s" : ""})</p>
                    <p><span className="font-semibold text-foreground">Algorithm:</span> CategoricalNB (pattern discovery mode)</p>
                    <p><span className="font-semibold text-foreground">Metrics:</span> Conditional probabilities and lift (rate vs baseline)</p>
                    <p><span className="font-semibold text-foreground">Overrepresentation threshold:</span> Lift ≥ 1.3× baseline</p>
                    <p><span className="font-semibold text-foreground">Underrepresentation threshold:</span> Lift ≤ 0.77× baseline</p>
                    <p><span className="font-semibold text-foreground">Significance test:</span> Chi-squared test (p &lt; 0.05)</p>
                    <p><span className="font-semibold text-foreground">Training:</span> Full dataset (no train/test split for maximum stability of probability estimates)</p>
                    <p><span className="font-semibold text-foreground">Significant feature-class pairs:</span> {bayesMetrics.significantPairs} of {bayesMetrics.totalPairs}</p>
                    <p><span className="font-semibold text-foreground">Strong patterns found:</span> {bayesMetrics.strongPatterns} (lift ≥ 1.3×)</p>
                </>
              )}
              {method === "decision_tree" && (
                <p><span className="font-semibold text-foreground">Train/test split:</span> 80% / 20% ({displayModelInfo.train_size.toLocaleString()} / {displayModelInfo.test_size.toLocaleString()} soldiers)</p>
              )}
              {method === "naive_bayes" && (
                <p><span className="font-semibold text-foreground">Train/test split:</span> 80% / 20%</p>
              )}
            </div>
          )}
      </div>

        <div className="flex justify-center gap-4 mt-10">
          <WireButton onClick={() => navigate("/advanced")} className="gap-2 text-sm py-2.5 px-6">
            <ArrowLeft className="w-4 h-4" /> Change Method
          </WireButton>
            <SaveToDashboard reportName={`${info.label} Analysis`} reportType="ML Analysis" />
            <WireButton filled accent className="gap-2 text-sm py-2.5 px-6" onClick={async() => {
              const el = document.getElementById("export-capture")
              let imageData: string | undefined
              if(el) {
                  const targets = el.querySelectorAll<HTMLElement>(".overflow-auto, .overflow-hidden, .overflow-x-auto, .overflow-y-auto")
                  const saved: { el: HTMLElement; ov: string; h: string; w: string; mh: string; mw: string; pos: string }[] = []
                  targets.forEach(node => {
                    saved.push({ el: node, ov: node.style.overflow, h: node.style.height, w: node.style.width, mh: node.style.maxHeight, mw: node.style.maxWidth, pos: node.style.position })
                    node.style.overflow = "visible"
                    node.style.height = "auto"
                    node.style.width = "auto"
                    node.style.maxHeight = "none"
                    node.style.maxWidth = "none"
                    node.style.position = "relative"
                  })
                  const savedEl = { ov: el.style.overflow, w: el.style.width, mw: el.style.maxWidth }
                  el.style.overflow = "visible"
                  el.style.width = "auto"
                  el.style.maxWidth = "none"
                  try {
                    const canvas = await html2canvas(el, {backgroundColor: "#ffffff", scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: -window.scrollY, windowWidth: el.scrollWidth, windowHeight: el.scrollHeight})
                    imageData = canvas.toDataURL("image/png")
                  } catch(e) { console.warn("Chart capture failed:", e) }
                  saved.forEach(({ el: node, ov, h, w, mh, mw, pos }) => { node.style.overflow = ov; node.style.height = h; node.style.width = w; node.style.maxHeight = mh; node.style.maxWidth = mw; node.style.position = pos })
                  el.style.overflow = savedEl.ov; el.style.width = savedEl.w; el.style.maxWidth = savedEl.mw
              }
              const base = {title: info.label, subtitle: info.subtitle}
              let payload;
              if (method === "decision_tree") {
                payload = {...base, insights: treeFindings, modelPerformance: [{label: "Precision", value: `${displayMetrics.precision}%`}, {label: "Recall", value: `${displayMetrics.recall}%`}, {label: "Accuracy", value: `${displayMetrics.accuracy}%`}], imageData}
              } else if (method === "logistic_regression") {
                payload = {...base, insights: regressionFindings, modelPerformance: [{label: "Precision", value: `${Math.round(liveLr.metrics.precision * 100)}%`}, {label: "Recall", value: `${Math.round(liveLr.metrics.recall * 100)}%`}], imageData}
              } else {
                payload = {...base, insights: bayesFindings.map(f => f.text), modelPerformance: [{label: "Total Records", value: `${(bayesMetrics.totalRecords / 1000).toFixed(1)}k`}, {label: "Patterns Found", value: String(bayesMetrics.strongPatterns)}, {label: "Offence Classes", value: String(bayesMetrics.classCount)}], imageData}
              }
              setExportPayload(payload)
              navigate(`/export?from=${method}`)
            }}>
              <Download className="w-4 h-4" /> Export Results
            </WireButton>
        </div>

        <HelpFloatMenu manualSectionId="um-ml" />
    </PageLayout>
  );
};

export default AdvancedResults;
