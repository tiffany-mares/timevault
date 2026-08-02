import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { WireButton } from "@/components/wireframe";
import { HelpFloatMenu } from "@/components/HelpFloatMenu";
import { Loader2, Check, Circle } from "lucide-react";

const methodLabels: Record<string, string> = {
  decision_tree: "Decision Tree",
   logistic_regression: "Logistic Regression",
    naive_bayes: "Naive Bayes",
};

const methodDescriptions: Record<string, string> = {
    decision_tree: "Building a classification tree that discovers the rules and conditions predicting whether a soldier was court-martialled.",
  logistic_regression: "Fitting a regression model to rank how strongly each feature value increases or decreases court martial likelihood.",
    naive_bayes: "Running Naive Bayes pattern discovery to identify overrepresented and underrepresented demographic features within each offence category.",
};

const methodSteps: Record<string, string[]> = {
  decision_tree: [
      "Loading CEF enlistment and courts martial records",
    "Encoding demographic features and labelling outcomes",
       "Splitting data into training and test sets",
    "Building decision tree splits to separate  groups",
      "Pruning tree and evaluating accuracy",
    "Generating tree visualization",
    ],
    logistic_regression: [
    "Loading CEF enlistment and courts martial records",
        "Encoding features with one-hot encoding",
      "Splitting data into training and test sets",
    "Fitting logistic regression model",
       "Computing feature coefficients and odds ratios",
      "Generating coefficient chart data",
   ],
   naive_bayes: [
        "Loading courts martial records and offence labels",
     "Computing prior probabilities for 9 offence categories",
      "Building conditional probability tables per feature",
    "Calculating lift (rate vs baseline) for all feature-value pairs",
       "Identifying overrepresented and underrepresented patterns",
      "Generating pattern analysis visualizations",
    ],
};

const defaultSteps = [
    "Gathering Canadian unit data",
    "Comparing offence patterns across units",
    "Identifying groups of similar units",
    "Generating results",
];

const STEP_DURATION = 800;

const AnalysisProcessing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const method = searchParams.get("method") || "decision_tree";
    const features = searchParams.get("features") || "";
  const steps = methodSteps[method] || defaultSteps;

  const needsApi = method === "decision_tree" || method === "logistic_regression" || method === "naive_bayes";
  const [currentStep, setCurrentStep] = useState(0);
    const [complete, setComplete] = useState(false);
  const [apiReady, setApiReady] = useState(!needsApi);
  const [apiError, setApiError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const apiReadyRef = useRef(!needsApi);
  const completeRef = useRef(false);

  const doNavigate = () => {
    const featParam = features ? `&features=${features}` : "";
    navigate(`/advanced-results?method=${method}${featParam}`, { replace: true });
  };

  useEffect(() => {
    if (!needsApi) return;
    const featureList = features ? decodeURIComponent(features).split(",") : null;

    const apiUrl = method === "decision_tree"
      ? "/api/run-decision-tree"
      : method === "naive_bayes"
        ? "/api/run-naive-bayes"
        : "/api/run-logistic-regression";
    const storageKey = method === "decision_tree"
      ? "dt_live_results"
      : method === "naive_bayes"
        ? "nb_live_results"
        : "lr_live_results";

    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features: featureList }),
    })
      .then(r => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then(data => {
        sessionStorage.setItem(storageKey, JSON.stringify(data));
        apiReadyRef.current = true;
        setApiReady(true);
        if (completeRef.current) setTimeout(doNavigate, 600);
      })
      .catch(err => {
        setApiError(`Analysis failed: ${err.message}. Make sure the backend is running.`);
      });
  }, [method, features]);

  useEffect(() => {
      timerRef.current = setInterval(() => {
        setCurrentStep(prev => {
          const next = prev + 1;
            if (next >= steps.length) {
              if (timerRef.current) clearInterval(timerRef.current);
              completeRef.current = true;
            setComplete(true);
            if (apiReadyRef.current) setTimeout(doNavigate, 600);
              return prev;
          }
          return next;
        });
      }, STEP_DURATION);

    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [steps.length]);

  const fullyDone = complete && apiReady;
  const stepsFinishedWaiting = complete && !apiReady;
  const progressPercent = fullyDone
    ? 100
    : Math.min(((currentStep + (complete ? 1 : 0)) / steps.length) * 95, 95);

    const featureList = features ? decodeURIComponent(features).split(",") : [];

  return (
    <PageLayout code="P-08" centered showBackToMenu={false} showHeader={false} showFooter={false}>
        <div className="panel w-full max-w-lg text-center py-10 px-8 shadow-lg space-y-6">
          <div>
            <Loader2 className={`w-10 h-10 text-olive mx-auto mb-4 ${fullyDone ? "" : "animate-spin"}`} />
          <h2 className="text-lg font-serif font-bold mb-1">
              {fullyDone
                ? "Analysis Complete"
                : stepsFinishedWaiting
                  ? "Processing on server…"
                  : `Running ${methodLabels[method] || "Analysis"}…`}
            </h2>
            <p className="text-xs text-muted-foreground font-body leading-relaxed max-w-sm mx-auto">
                {stepsFinishedWaiting
                  ? "The model is being trained with your selected features. This may take a moment depending on the number of features."
                  : (methodDescriptions[method] || "Processing your analysis request.")}
              </p>
          </div>

          {featureList.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {featureList.map(f => (
                  <span key={f} className="text-[10px] font-body px-2 py-0.5 rounded-sm bg-olive/10 text-olive border border-olive/20">
                      {f}
                  </span>
                ))}
              </div>
          )}

        <div>
            <div className="flex justify-between text-[10px] font-body text-muted-foreground mb-1.5">
              <span>{fullyDone ? "Complete" : stepsFinishedWaiting ? "Waiting for server…" : `Step ${currentStep + 1} of ${steps.length}`}</span>
                <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-2.5 border border-border bg-background rounded-sm overflow-hidden">
                <div
                  className={`h-full rounded-sm transition-all duration-500 ease-out ${stepsFinishedWaiting ? "bg-gradient-to-r from-olive to-olive-light animate-pulse" : "bg-gradient-to-r from-olive to-olive-light"}`}
                style={{ width: `${progressPercent}%` }}
                />
            </div>
          </div>

          <div className="text-left space-y-2">
            {steps.map((step, i) => {
                const isDone = i < currentStep || complete;
              const isActive = i === currentStep && !complete;
              return (
                  <div
                    key={i}
                  className={`flex items-center gap-2.5 text-xs font-body py-1 transition-all duration-300 ${
                      isDone ? "text-olive" : isActive ? "text-foreground" : "text-muted-foreground/50"
                    }`}
                  >
                  {isDone ? (
                      <Check className="w-3.5 h-3.5 text-olive flex-shrink-0" strokeWidth={2.5} />
                  ) : isActive ? (
                    <Loader2 className="w-3.5 h-3.5 text-olive animate-spin flex-shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                    <span className={isActive ? "font-medium" : ""}>{step}</span>
                  </div>
              );
            })}
            {stepsFinishedWaiting && (
              <div className="flex items-center gap-2.5 text-xs font-body py-1 text-foreground">
                <Loader2 className="w-3.5 h-3.5 text-olive animate-spin flex-shrink-0" />
                <span className="font-medium">Training model with selected features…</span>
              </div>
            )}
          </div>

          <div className="pt-2">
              <WireButton onClick={() => navigate("/advanced")}>Cancel</WireButton>
          </div>

          {apiError && (
            <p className="text-xs font-body text-red-500 border border-red-200 bg-red-50 rounded px-3 py-2">
              {apiError}
            </p>
          )}
        </div>
      <HelpFloatMenu manualSectionId="um-ml" />
    </PageLayout>
  );
};

export default AnalysisProcessing;
