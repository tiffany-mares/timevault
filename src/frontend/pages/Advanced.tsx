import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { WireBox, WireButton } from "@/components/wireframe";
import { GitBranch, BarChart3, Grid3X3, Check, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpFloatMenu } from "@/components/HelpFloatMenu";

const methods = [
  {
    id: "decision_tree",
    icon: GitBranch,
    label: "Decision Tree",
    subtitle: "Predicting Court Martial",
    desc: "Discover the rules and conditions that predict whether a soldier was court-martialled.",
    technical: "Decision Tree Classification",
    explanation:
      "Combines both tables and labels each soldier as court-martialled or not. The algorithm finds the best feature splits to separate the two groups, producing a readable flowchart of rules.",
    features:  "Rank, Birthplace, Occupation, Marital Status, Enlistment Year, Birth Year",
    visualization: "Tree diagram (flowchart)",
  },
  {
      id: "logistic_regression",
      icon: BarChart3,
      label: "Logistic Regression",
      subtitle: "Ranking Feature Importance",
      desc: "Quantify which features increase or decrease the likelihood of court martial.",
      technical: "Logistic Regression",
      explanation: "Uses the same court martial labels as the decision tree, but produces a coefficient for each feature value showing how strongly it pushes the probability up or down.",
      features:  "Rank, Unit Type, Birthplace, Occupation, Marital Status, Enlistment Year, Birth Year",
      visualization:  "Horizontal bar chart (coefficients)",
  },
  {
    id: "naive_bayes",
    icon: Grid3X3,
    label: "Naive Bayes",
    subtitle: "Pattern Discovery by Offence",
    desc: "Discover which demographic features are overrepresented or underrepresented within each offence category.",
    technical: "Naive Bayes Pattern Discovery",
    explanation: "Uses conditional probability tables to identify feature-value pairs that appear more or less often within each offence category than expected. The lift metric highlights the strongest associations between soldier demographics and offence types.",
    features:  "Rank, Unit Type, Enlistment Year",
    visualization:  "Distribution charts, heatmaps, and stacked bars",
  },
];

const Advanced = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [enabledFeatures, setEnabledFeatures] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);
  const methodObj = methods.find((m) => m.id === selected);
  const allFeatures = methodObj ? methodObj.features.split(", ") : [];
  const activeFeatures = allFeatures.filter(f => enabledFeatures[f] === true);
  const minFeatures = 1;
  const canRun  = selected !== null && activeFeatures.length >= minFeatures;
  const showError = attempted && !canRun;

  const handleSelectMethod = (id: string) => {
    setSelected(id);
    setEnabledFeatures({});
    setAttempted(false);
  };

  const toggleFeature = (feat: string) => {
    setEnabledFeatures(prev => ({ ...prev, [feat]: !prev[feat] }));
  };

  const handleRun = () => {
      if (!canRun) {
        setAttempted(true);
        return;
      }
      setAttempted(false);
      const featParam = encodeURIComponent(activeFeatures.join(","));
      navigate(`/analysis-processing?method=${selected}&features=${featParam}`);
  };

  const summary = canRun
    ? `The system will run ${methodObj?.technical} using ${activeFeatures.slice(0,3).join(", ")}${activeFeatures.length > 3 ? ` and ${activeFeatures.length - 3} more` : ""}. Results will be displayed as a ${methodObj?.visualization?.toLowerCase()}.`
    : (selected && activeFeatures.length < minFeatures)
      ?  `Select at least ${minFeatures} feature${minFeatures > 1 ? "s" : ""} to run the analysis.`
      : "Select a method above to run the analysis.";

  return (
    <PageLayout
      code="P-07"
      title="Machine Learning Analysis"
      subtitle="Use machine learning to find patterns in WWI courts martial data."
      marqueeItems={["Machine Learning", "Decision Tree", "Logistic Regression", "Naive Bayes", "Classification", "60,000+ Records"]}
    >
        <p className="text-xs text-muted-foreground font-body text-center -mt-3 mb-2">
            These algorithms analyze over 60,000 Canadian Expeditionary Force service records and courts martial proceedings from 1914-1918, searching for statistical patterns that connect soldier demographics to disciplinary outcomes.
           Each method below answers a different question about these relationships,  producing a distinct visualization of its findings.
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
                to="/user-manual#um-ml"
              className="inline-flex items-center gap-1.5 text-xs font-body text-olive hover:text-olive-light hover:bg-olive/10 transition-all duration-200 underline underline-offset-2 rounded-sm px-1 -mx-1 py-0.5"
            >
                <BookOpen className="w-3.5 h-3.5" />
              View in User Manual
            </Link>
          </div>

        <WireBox dashed={false} label="SELECT AN ANALYSIS METHOD">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {methods.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "panel cursor-pointer transition-all relative",
                  selected === m.id
                    ? "border-olive bg-olive/5 shadow-md"
                    : "hover:border-olive/60 hover:shadow-md hover:bg-olive/[0.03]"
                )}
                onClick={() => handleSelectMethod(m.id)}
              >
                  <m.icon className={cn("w-6 h-6 mb-2", selected === m.id ? "text-olive" : "text-muted-foreground")} />
                  <p className="font-serif font-semibold text-sm mb-0.5">{m.label}</p>
                  <p className="text-[11px] text-olive font-body font-medium mb-2">{m.subtitle}</p>
                  <p className="text-xs text-muted-foreground font-body mb-3">{m.desc}</p>
                <p className="text-[10px] text-muted-foreground/60 font-mono mb-2">
                  Method: {m.technical}
                </p>
                <p className="text-xs text-muted-foreground/80 font-body italic leading-relaxed mb-3">
                    {m.explanation}
                </p>
                  <div className="border-t border-border/50 pt-2 mt-auto">
                    <p className="text-[10px] text-muted-foreground/60 font-body">
                      <span className="font-semibold">Features:</span> {m.features}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 font-body mt-0.5">
                        <span className="font-semibold">Output:</span> {m.visualization}
                    </p>
                  </div>
              </div>
            ))}
          </div>
        </WireBox>

        {selected && methodObj && (
          <>
          <WireBox dashed={false} label="METHOD SUMMARY">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm font-body">
              <div className="p-4 rounded-md bg-teal/15 border border-teal/40">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-teal/30 flex items-center justify-center text-teal text-xs font-bold">?</span>
                    <p className="font-semibold text-foreground text-xs uppercase tracking-wider">Question</p>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{methodObj.desc}</p>
              </div>
                <div className="p-4 rounded-md bg-navy/15 border border-navy/40">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-navy/30 flex items-center justify-center text-navy text-xs font-bold">&#x2699;</span>
                      <p className="font-semibold text-foreground text-xs uppercase tracking-wider">Approach</p>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{methodObj.explanation}</p>
                </div>
                <div className="p-4 rounded-md bg-rust/15 border border-rust/40">
                  <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-rust/30 flex items-center justify-center text-rust text-xs font-bold">&#x25B6;</span>
                      <p className="font-semibold text-foreground text-xs uppercase tracking-wider">Output</p>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{methodObj.visualization}</p>
                </div>
            </div>
          </WireBox>

          <WireBox dashed={false} label="SELECT FEATURES">
            <p className="text-xs text-muted-foreground font-body -mt-1 mb-4">
              Click to select which features to include. At least {minFeatures} required.
            </p>
            {showError && (
              <div className="mb-4 p-3 rounded-md bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 text-sm font-body flex items-center gap-2">
                <span className="font-semibold">⚠</span> Please select at least {minFeatures} feature{minFeatures > 1 ? "s" : ""} before running the analysis.
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {allFeatures.map((f) => {
                const isOn = enabledFeatures[f] === true;
                return (<button key={f} onClick={() => toggleFeature(f)}
                    className={cn(
                      "group relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer text-center",
                      isOn ? "border-olive bg-olive/10 shadow-sm"
                           : "border-border/50 bg-secondary/30 opacity-50 hover:opacity-75"
                    )}>
                    <span className={cn(
                      "w-5 h-5 rounded flex items-center justify-center border-2 transition-colors",
                      isOn ? "bg-olive border-olive text-parchment" : "bg-transparent border-muted-foreground/30"
                    )}>
                      {isOn && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                    </span>
                    <span className={cn(
                      "text-xs font-body font-medium leading-tight",
                      isOn ? "text-foreground" : "text-muted-foreground line-through"
                    )}>{f}</span>
                  </button>);
              })}
            </div>
            <p className="text-xs text-muted-foreground/60 font-body mt-3 text-center">
              {activeFeatures.length} of {allFeatures.length} features selected
            </p>
            <p className="text-[11px] text-muted-foreground/50 font-body mt-1 text-center max-w-lg mx-auto leading-relaxed">
                More features give the model a broader view of each soldier but may dilute individual effects;  fewer features focus on specific relationships.
             </p>
          </WireBox>
          </>
        )}

        <div className="flex flex-col items-center gap-3 py-4">
            <WireButton
              filled accent
              className={cn("px-10 py-3.5 text-base", !canRun && "opacity-50 cursor-not-allowed")}
              onClick={handleRun}
            >
              Run Analysis
            </WireButton>
            <p className="text-xs text-muted-foreground font-body text-center max-w-xl leading-relaxed">
              {summary}
            </p>
        </div>
      <HelpFloatMenu manualSectionId="um-ml" />
    </PageLayout>
  );
};

export default Advanced;
