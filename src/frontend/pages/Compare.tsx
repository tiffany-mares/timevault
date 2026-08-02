import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { WireBox, WireButton, WireDropdown } from "@/components/wireframe";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import { ArrowLeftRight, Info, Lightbulb, HelpCircle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpFloatMenu } from "@/components/HelpFloatMenu";
import { UNIT_TYPES } from "@/data/unitTypes";
import { RANKS } from "@/data/ranks";
import { PROVINCES } from "@/data/provinces";
import { OCCUPATIONS } from "@/data/occupations";
import { OFFENCE_CODE_OPTIONS } from "@/data/offences";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const unitTypeOpts = UNIT_TYPES.map((u) => ({ id: u, label: u }));

const rankOpts = RANKS.map((r) => ({ id: r, label: r }));
const provOpts = PROVINCES.map((p) => ({ id: p, label: p }));
const occOpts = OCCUPATIONS.map((o) => ({ id: o, label: o }));
type CompareMode = "single" | "double";

const singleModes = [
  { label: "Unit Type", color: "hover:border-navy hover:bg-navy/10 hover:shadow-sm hover:text-navy", activeColor: "border-navy bg-navy/10" },
  { label: "Rank", color: "hover:border-olive hover:bg-olive/10 hover:shadow-sm hover:text-olive", activeColor: "border-olive bg-olive/10" },
  { label: "Enlistment Year", color: "hover:border-rust hover:bg-rust/10 hover:shadow-sm hover:text-rust", activeColor: "border-rust bg-rust/10" },
  { label: "Year of Birth", color: "hover:border-gold hover:bg-gold/10 hover:shadow-sm hover:text-gold", activeColor: "border-gold bg-gold/10" },
  { label: "Place of Birth", color: "hover:border-navy hover:bg-navy/10 hover:shadow-sm hover:text-navy", activeColor: "border-navy bg-navy/10" },
  { label: "Occupation", color: "hover:border-olive hover:bg-olive/10 hover:shadow-sm hover:text-olive", activeColor: "border-olive bg-olive/10" },
  { label: "Marital Status", color: "hover:border-rust hover:bg-rust/10 hover:shadow-sm hover:text-rust", activeColor: "border-rust bg-rust/10" },
];

const categories = ["Unit Type", "Rank", "Enlistment Year", "Year of Birth", "Place of Birth", "Occupation", "Marital Status"];
const summarize = (set: Set<string>, maxShow = 2): string => {
  if (set.size === 0) return "Not selected";
  const items = Array.from(set);
  if (items.length <= maxShow) return items.join(", ");
  return `${items.slice(0, maxShow).join(", ")} +${items.length - maxShow} more`;
};

const Compare = () => {
    const navigate = useNavigate();
    const [compareMode, setCompareMode] = useState<CompareMode>("single");
    const [activeSingle, setActiveSingle] = useState<string | null>(null);
    const [doubleCat1, setDoubleCat1] = useState<string>("");
    const [doubleCat2, setDoubleCat2] = useState<string>("");
    const [unitA, setUnitA] = useState<Set<string>>(new Set());
    const [unitB, setUnitB] = useState<Set<string>>(new Set());
    const [rankA, setRankA] = useState<Set<string>>(new Set());
    const [rankB, setRankB] = useState<Set<string>>(new Set());
    const [timeStartA, setTimeStartA] = useState("");
    const [timeEndA, setTimeEndA] = useState("");
    const [timeStartB, setTimeStartB] = useState("");
    const [timeEndB, setTimeEndB] = useState("");
    const [ageStartA, setAgeStartA] = useState("");
    const [ageEndA, setAgeEndA] = useState("");
    const [ageStartB, setAgeStartB] = useState("");
    const [ageEndB, setAgeEndB] = useState("");
    const [provinceA, setProvinceA] = useState<Set<string>>(new Set());
    const [provinceB, setProvinceB] = useState<Set<string>>(new Set());
    const [occupationA, setOccupationA] = useState<Set<string>>(new Set());
    const [occupationB, setOccupationB] = useState<Set<string>>(new Set());
    const [marriageA, setMarriageA] = useState<Set<string>>(new Set());
    const [marriageB, setMarriageB] = useState<Set<string>>(new Set());
    const [offenceA, setOffenceA] = useState<Set<string>>(new Set());
    const [offenceB, setOffenceB] = useState<Set<string>>(new Set());
    const isDouble = compareMode === "double";
    const hasDoubleSelection = doubleCat1 !== "" && doubleCat2 !== "";
    const doubleCategories = [doubleCat1, doubleCat2];
    const cat2Options = categories.filter(c => c !== doubleCat1);

    const handleSwap = () => {
        const prevUnitA = new Set(unitA); const prevUnitB = new Set(unitB);
        const prevRankA = new Set(rankA); const prevRankB = new Set(rankB);
        const prevProvinceA = new Set(provinceA); const prevProvinceB = new Set(provinceB);
        const prevOccupationA = new Set(occupationA); const prevOccupationB = new Set(occupationB);
        const prevMarriageA = new Set(marriageA); const prevMarriageB = new Set(marriageB);
        const prevOffenceA = new Set(offenceA); const prevOffenceB = new Set(offenceB);
        const prevTSA = timeStartA; const prevTSB = timeStartB;
        const prevTEA = timeEndA; const prevTEB = timeEndB;
        const prevASA = ageStartA; const prevASB = ageStartB;
        const prevAEA = ageEndA; const prevAEB = ageEndB;

        setUnitA(prevUnitB); setUnitB(prevUnitA);
        setRankA(prevRankB); setRankB(prevRankA);
        setProvinceA(prevProvinceB); setProvinceB(prevProvinceA);
        setOccupationA(prevOccupationB); setOccupationB(prevOccupationA);
        setMarriageA(prevMarriageB); setMarriageB(prevMarriageA);
        setOffenceA(prevOffenceB); setOffenceB(prevOffenceA);
        setTimeStartA(prevTSB); setTimeStartB(prevTSA);
        setTimeEndA(prevTEB); setTimeEndB(prevTEA);
        setAgeStartA(prevASB); setAgeStartB(prevASA);
        setAgeEndA(prevAEB); setAgeEndB(prevAEA);
    };

    const handlers = (
        getA: () => Set<string>, setA: React.Dispatch<React.SetStateAction<Set<string>>>,
        getB: () => Set<string>, setB: React.Dispatch<React.SetStateAction<Set<string>>>,
        group: string
    ) => ({
        selected: group === "A" ? getA() : getB(),
        onToggle: (id: string) => {
            const setter = group === "A" ? setA : setB;
            setter(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
        },
        onSelectAll: (ids: string[]) => { const setter = group === "A" ? setA : setB; setter(prev => new Set([...prev, ...ids])); },
        onDeselectAll: (ids: string[]) => { const setter = group === "A" ? setA : setB; setter(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; }); },
        onClearAll: () => { const setter = group === "A" ? setA : setB; setter(new Set()); },
    });

    const renderControl = (category: string, group: string) => {
        switch (category) {
           case "Unit Type":
              return <MultiSelectDropdown label="Unit Type" placeholder="Select unit types..." options={unitTypeOpts} {...handlers(() => unitA, setUnitA, () => unitB, setUnitB, group)} />;
           case "Rank":
              return <MultiSelectDropdown label="Rank" placeholder="Select ranks..." options={rankOpts} {...handlers(() => rankA, setRankA, () => rankB, setRankB, group)} />;
           case "Enlistment Year":
              return (
                 <div className="space-y-2">
                   <label className="text-xs font-body font-semibold uppercase tracking-wide text-muted-foreground">Enlistment Year</label>
                   <div className="flex items-center gap-2">
                     <WireDropdown label="From" options={[{ value: "1914", label: "1914" }, { value: "1915", label: "1915" }, { value: "1916", label: "1916" }, { value: "1917", label: "1917" }, { value: "1918", label: "1918" }]} value={group === "A" ? timeStartA : timeStartB} onChange={group === "A" ? setTimeStartA : setTimeStartB} />
                     <span className="text-sm text-muted-foreground pt-5">to</span>
                     <WireDropdown label="To" options={[{ value: "1914", label: "1914" }, { value: "1915", label: "1915" }, { value: "1916", label: "1916" }, { value: "1917", label: "1917" }, { value: "1918", label: "1918" }]} value={group === "A" ? timeEndA : timeEndB} onChange={group === "A" ? setTimeEndA : setTimeEndB} />
                   </div>
                 </div>
              );
           case "Year of Birth":
              return (
                 <div className="space-y-2">
                   <label className="text-xs font-body font-semibold uppercase tracking-wide text-muted-foreground">Year of Birth</label>
                   <div className="flex items-center gap-2">
                     <WireDropdown label="From" options={Array.from({ length: 31 }, (_, i) => ({ value: String(1870 + i), label: String(1870 + i) }))} value={group === "A" ? ageStartA : ageStartB} onChange={group === "A" ? setAgeStartA : setAgeStartB} />
                     <span className="text-sm text-muted-foreground pt-5">to</span>
                     <WireDropdown label="To" options={Array.from({ length: 31 }, (_, i) => ({ value: String(1870 + i), label: String(1870 + i) }))} value={group === "A" ? ageEndA : ageEndB} onChange={group === "A" ? setAgeEndA : setAgeEndB} />
                   </div>
                 </div>
              );
           case "Place of Birth":
              return <MultiSelectDropdown label="Place of Birth" placeholder="Select places..." options={provOpts} {...handlers(() => provinceA, setProvinceA, () => provinceB, setProvinceB, group)} />;
           case "Occupation":
              return <MultiSelectDropdown label="Occupation" placeholder="Select occupations..." options={occOpts} {...handlers(() => occupationA, setOccupationA, () => occupationB, setOccupationB, group)} />;
           case "Marital Status":
              return <MultiSelectDropdown label="Marital Status" placeholder="Select status..." options={[{ id: "Single", label: "Single" }, { id: "Married", label: "Married" }, { id: "Widowed", label: "Widowed" }]} {...handlers(() => marriageA, setMarriageA, () => marriageB, setMarriageB, group)} />;
           default:
              return <WireDropdown label={category} value="Select..." />;
        }
    };

    const getSummary = (group: string, category: string): string => {
        switch (category) {
           case "Unit Type": return summarize(group === "A" ? unitA : unitB);
           case "Rank": return summarize(group === "A" ? rankA : rankB);
           case "Enlistment Year": {
              const s = group === "A" ? timeStartA : timeStartB;
              const e = group === "A" ? timeEndA : timeEndB;
              return s && e ? `${s}-${e}` : s || e || "Not selected";
           }
           case "Year of Birth": {
              const s = group === "A" ? ageStartA : ageStartB;
              const e = group === "A" ? ageEndA : ageEndB;
              return s && e ? `${s}-${e}` : s || e || "Not selected";
           }
           case "Place of Birth": return summarize(group === "A" ? provinceA : provinceB);
           case "Occupation": return summarize(group === "A" ? occupationA : occupationB);
           case "Marital Status": return summarize(group === "A" ? marriageA : marriageB);
           default: return "Not selected";
        }
    };

    const activeCategory = isDouble ? (hasDoubleSelection ? doubleCat1 : null) : activeSingle;
    const hasSelection = isDouble ? hasDoubleSelection : !!activeSingle;

    const isGroupFilled = (category: string, group: string): boolean => {
        switch (category) {
            case "Unit Type": return (group === "A" ? unitA : unitB).size > 0;
            case "Rank": return (group === "A" ? rankA : rankB).size > 0;
            case "Enlistment Year": {
                const s = group === "A" ? timeStartA : timeStartB;
                const e = group === "A" ? timeEndA : timeEndB;
                return s !== "" && e !== "";
            }
            case "Year of Birth": {
                const s = group === "A" ? ageStartA : ageStartB;
                const e = group === "A" ? ageEndA : ageEndB;
                return s !== "" && e !== "";
            }
            case "Place of Birth": return (group === "A" ? provinceA : provinceB).size > 0;
            case "Occupation": return (group === "A" ? occupationA : occupationB).size > 0;
            case "Marital Status": return (group === "A" ? marriageA : marriageB).size > 0;
            default: return false;
        }
    };

    const canProceed = (() => {
        if (!hasSelection) return false;
        const cats = isDouble ? [doubleCat1, doubleCat2] : [activeSingle!];
        return cats.every(cat => isGroupFilled(cat, "A") && isGroupFilled(cat, "B"));
    })();
    return (
      <PageLayout
          code="P-05"
          title="Comparative Analysis"
          subtitle="Compare disciplinary patterns across different groups in the Canadian Expeditionary Force during WWI."
          marqueeItems={["Comparative Analysis", "Group A", "Group B", "By Rank", "By Unit Type", "By Year", "Offence Distribution"]}
      >
        <div className="p-4 bg-muted/30 border border-border rounded-md -mt-2">
           <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-olive flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                <p className="text-sm font-body text-foreground">
                  Select two groups to compare how their courts martial records differ.
                </p>
                 <p className="text-sm font-body text-muted-foreground">
                  This tool lets you examine whether courts martial patterns varied between soldier demographics - for example, comparing Infantry vs Artillery unit types, or single vs married soldiers,  can reveal whether certain groups faced higher disciplinary rates or different types of charges.
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
                      to="/user-manual#um-compare"
                    className="inline-flex items-center gap-1.5 text-xs font-body text-olive hover:text-olive-light hover:bg-olive/10 transition-all duration-200 underline underline-offset-2 rounded-sm px-1 -mx-1 py-0.5"
                  >
                      <BookOpen className="w-3.5 h-3.5" />
                    View in User Manual
                  </Link>
                </div>
               </div>
          </div>
        </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          {([
            { key: "single" as CompareMode, label: "Single Category", desc: "Compare two groups within one category" },
             { key: "double" as CompareMode, label: "Double Category", desc: "Compare combinations of two categories" },
          ]).map(m => (
            <button
              key={m.key}
              className={cn(
                "flex-1 px-4 py-3 text-left border rounded-md font-body transition-all",
                compareMode === m.key
                  ? "border-olive bg-olive/10 shadow-sm"
                  : "border-border text-muted-foreground hover:border-olive/60 hover:bg-olive/10 hover:shadow-sm"
              )}
              onClick={() => setCompareMode(m.key)}
            >
              <span className="text-sm font-medium block">{m.label}</span>
               <span className="text-xs text-muted-foreground">{m.desc}</span>
            </button>
          ))}
        </div>

        <div className="p-3 bg-muted/20 border border-border rounded-md">
           <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
             <div className="space-y-1.5 text-xs font-body text-muted-foreground">
              <p className="font-semibold text-foreground/80 text-[11px] uppercase tracking-wide">How comparisons work</p>
               <p>
                <span className="font-medium text-foreground/70">Single Category</span> - Compare two groups within the same category.
                <span className="italic ml-1">Example: Rank Private vs Rank Corporal</span>
              </p>
              <p>
                <span className="font-medium text-foreground/70">Double Category</span> - Compare combinations of two categories, letting you control for one variable while examining another.
                 <span className="italic ml-1">Example: Unit Type Artillery + Rank Private vs Unit Type Medical + Rank Private</span>
              </p>
             </div>
           </div>
        </div>
      </div>

      <WireBox dashed={false} label={isDouble ? "STEP 1: CHOOSE TWO CATEGORIES TO COMBINE" : "STEP 1: CHOOSE WHAT TYPE OF GROUP TO COMPARE"} accent="olive">
          <p className="text-sm font-body text-muted-foreground mb-3">
            {isDouble
                ? "Select two categories to create combined comparison groups."
                : "Select the category you want to compare across the two groups."
            }
          </p>
          {isDouble ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <WireDropdown
                  label="Category 1"
                  options={categories.map(c => ({ value: c, label: c }))}
                  value={doubleCat1}
                  onChange={(v) => { setDoubleCat1(v); if (v === doubleCat2) setDoubleCat2(""); }}
                />
                <WireDropdown
                  label="Category 2"
                  options={cat2Options.map(c => ({ value: c, label: c }))}
                  value={doubleCat2}
                  onChange={setDoubleCat2}
                />
            </div>
          ) : (
            <>
            <div className="flex gap-2 flex-wrap">
              {singleModes.map((opt) => (
                <button
                    key={opt.label}
                    className={cn(
                      "px-4 py-2 text-sm border rounded-md font-body transition-all",
                      activeSingle === opt.label
                          ? opt.activeColor
                          : `border-border ${opt.color}`
                    )}
                    onClick={() => setActiveSingle(opt.label)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {activeSingle && (
               <p className="text-xs font-body text-muted-foreground mt-2">
                {activeSingle === "Unit Type" && "The branch or corps the soldier served in, such as Infantry, Artillery, or Medical."}
                 {activeSingle === "Rank" && "The soldier's military rank at the time of their court martial, e.g. Private, Corporal, or Sergeant."}
                {activeSingle === "Enlistment Year" && "The year the soldier enlisted in the CEF, ranging from 1914 to 1918."}
                  {activeSingle === "Year of Birth" && "The soldier's birth year, useful for comparing disciplinary patterns across age groups."}
                {activeSingle === "Place of Birth" && "The soldier's province or country of birth as recorded on enlistment."}
                 {activeSingle === "Occupation" && "The soldier's civilian occupation prior to enlistment, grouped into broad categories."}
                {activeSingle === "Marital Status" && "Whether the soldier was single, married, or widowed at the time of enlistment."}
               </p>
            )}
            </>
          )}
      </WireBox>

      <WireBox dashed={false} label="STEP 2: SELECT THE TWO GROUPS TO COMPARE" accent="navy">
        <p className="text-sm font-body text-muted-foreground mb-4">
          {hasSelection
            ? "Choose values for each group to analyze their disciplinary patterns."
            : "Select a comparison type above to begin configuring your groups."
          }
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { group: "A", color: "from-navy to-slate-blue" },
            { group: "B", color: "from-rust to-copper" },
          ].map(({ group, color }) => (
            <div key={group} className="panel p-6 relative overflow-visible">
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${color}`} />
              <div className="text-center mb-4 pt-1">
                <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br ${color} font-serif font-bold text-parchment text-sm shadow-sm`}>{group}</span>
                <p className="text-xs font-body text-muted-foreground mt-1">Group {group}</p>
              </div>
              {hasSelection ? (
                <div className="space-y-3">
                  {isDouble && hasDoubleSelection ? (
                    <>
                      {doubleCategories.map((cat, i) => (
                        <div key={i}>{renderControl(cat, group)}</div>
                      ))}
                      <MultiSelectDropdown label="Offence Category" placeholder="Select offences..." options={OFFENCE_CODE_OPTIONS} {...handlers(() => offenceA, setOffenceA, () => offenceB, setOffenceB, group)} />
                    </>
                  ) : (
                    <>
                      {renderControl(activeSingle!, group)}
                      <MultiSelectDropdown label="Offence Category" placeholder="Select offences..." options={OFFENCE_CODE_OPTIONS} {...handlers(() => offenceA, setOffenceA, () => offenceB, setOffenceB, group)} />
                    </>
                  )}
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground/70 mb-1 font-body">Group {group} Summary</p>
                    {(isDouble ? doubleCategories : [activeSingle!]).map(cat => (
                      <p key={cat} className="text-xs font-body text-muted-foreground">
                        <span className="font-medium text-foreground/70">{cat}:</span> {getSummary(group, cat)}
                      </p>
                    ))}
                    <p className="text-xs font-body text-muted-foreground italic mt-1">
                      This panel will show disciplinary patterns for soldiers in this group.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground font-body">Select a comparison type above</p>
                  <p className="text-xs text-muted-foreground/60 font-body mt-1">Then configure the group selections here.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </WireBox>

      <div className="flex justify-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={handleSwap} className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-md font-body hover:border-gold hover:bg-gold/10 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <ArrowLeftRight className="w-4 h-4 text-gold" /> Swap A / B
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs font-body">
              <p>Swap the two groups to reverse the comparison.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {activeSingle === "Occupation" && !isDouble && (
        <div className="p-3 rounded-md border border-border bg-muted/30 text-xs font-body text-muted-foreground space-y-1.5">
          <p className="font-semibold text-foreground/70 uppercase tracking-wide text-[10px] mb-1">Occupation Category Examples</p>
          <p><span className="font-medium text-foreground/80">1. Agriculture</span> - Farmer, Farm Labourer, Farm Hand, Rancher</p>
          <p><span className="font-medium text-foreground/80">2. Industrial / Skilled Trades</span> - Machinist, Carpenter, Electrician, Plumber, Boilermaker, Iron Worker, Mason, Cabinet Maker</p>
          <p><span className="font-medium text-foreground/80">3. Transportation / Rail</span> - Teamster, Brakeman, Conductor, Switchman, Railroad Labourer, Locomotive Fireman</p>
          <p><span className="font-medium text-foreground/80">4. Maritime</span> - Sailor, Seaman, Marine Engineer, Fisherman, Sea Farer</p>
          <p><span className="font-medium text-foreground/80">5. Professional / White-Collar</span> - Lawyer, Civil Engineer, Surveyor, Actuary, Journalist, Clerk, Bank Clerk</p>
          <p><span className="font-medium text-foreground/80">6. Service / Retail</span> - Waiter, Cook, Baker, Hotel Keeper, Salesman</p>
          <p><span className="font-medium text-foreground/80">7. Students</span> - Student, Law Student, Medical Student</p>
          <p><span className="font-medium text-foreground/80">8. Military / Government</span> - Soldier, R.N.W.M. Police, Civil Servant</p>
        </div>
      )}

      {hasSelection && (
        <div className="p-4 bg-muted/20 border border-border rounded-md">
          <div className="flex items-start gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
            <span className="text-xs font-body font-semibold uppercase tracking-wide text-gold">Comparison Preview</span>
          </div>
          <p className="text-sm font-body text-muted-foreground mb-2">The system will compare:</p>
          <ul className="space-y-1 text-sm font-body text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-gold">•</span> Offence type distributions</li>
            <li className="flex items-start gap-2"><span className="text-gold">•</span> Offence frequency</li>
            <li className="flex items-start gap-2"><span className="text-gold">•</span> Rank composition</li>
            <li className="flex items-start gap-2"><span className="text-gold">•</span> Demographic characteristics</li>
          </ul>
          <p className="text-xs font-body text-muted-foreground/70 mt-2 italic">between the two selected groups.</p>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
          <WireButton
            filled
            accent
            disabled={!canProceed}
            className="w-full max-w-md py-3"
            onClick={() => {
                const params = new URLSearchParams();
                params.set("mode", compareMode);
                if (isDouble) {
                    params.set("cat1", doubleCat1);
                    params.set("cat2", doubleCat2);
                } else if (activeSingle) {
                    params.set("cat1", activeSingle);
                }
                const encodeSet = (s: Set<string>) => Array.from(s).join(",");
                if (activeSingle || isDouble) {
                    const cats = isDouble ? [doubleCat1, doubleCat2] : [activeSingle!];
                    cats.forEach(cat => {
                       switch (cat) {
                          case "Unit Type":
                             if (unitA.size) params.set("unitA", encodeSet(unitA));
                             if (unitB.size) params.set("unitB", encodeSet(unitB));
                             break;
                          case "Rank":
                             if (rankA.size) params.set("rankA", encodeSet(rankA));
                             if (rankB.size) params.set("rankB", encodeSet(rankB));
                             break;
                          case "Place of Birth":
                             if (provinceA.size) params.set("provinceA", encodeSet(provinceA));
                             if (provinceB.size) params.set("provinceB", encodeSet(provinceB));
                             break;
                          case "Occupation":
                             if (occupationA.size) params.set("occupationA", encodeSet(occupationA));
                             if (occupationB.size) params.set("occupationB", encodeSet(occupationB));
                             break;
                          case "Marital Status":
                             if (marriageA.size) params.set("marriageA", encodeSet(marriageA));
                             if (marriageB.size) params.set("marriageB", encodeSet(marriageB));
                             break;
                          case "Enlistment Year":
                             if (timeStartA) params.set("timeStartA", timeStartA);
                             if (timeEndA) params.set("timeEndA", timeEndA);
                             if (timeStartB) params.set("timeStartB", timeStartB);
                             if (timeEndB) params.set("timeEndB", timeEndB);
                             break;
                          case "Year of Birth":
                             if (ageStartA) params.set("ageStartA", ageStartA);
                             if (ageEndA) params.set("ageEndA", ageEndA);
                             if (ageStartB) params.set("ageStartB", ageStartB);
                             if (ageEndB) params.set("ageEndB", ageEndB);
                             break;
                       }
                    });
                }
                if (offenceA.size) params.set("offenceA", encodeSet(offenceA));
                if (offenceB.size) params.set("offenceB", encodeSet(offenceB));
                navigate(`/compare-results?${params.toString()}`);
            }}
          >
            Run Comparison
          </WireButton>
          {!canProceed && (
            <p className="text-xs font-body text-rust/80 text-center max-w-md">
              {!hasSelection
                ? "Please complete Step 1 by selecting a comparison category."
                : "Please complete Step 2 by filling in selections for both Group A and Group B."
              }
            </p>
          )}
          <p className="text-xs font-body text-muted-foreground text-center max-w-md">
            This will generate charts showing differences in offence patterns between the two selected groups.
          </p>
      </div>

      <HelpFloatMenu manualSectionId="um-compare" />
    </PageLayout>
  );
};

export default Compare;