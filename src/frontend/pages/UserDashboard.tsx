
import { useEffect, useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { WireBox, WireButton } from "@/components/wireframe";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInHours } from "date-fns";
import { BarChart3, GitCompare, Search, Database, BookOpen, Trash2, ArrowRight, Lightbulb, ChevronRight, LogOut } from "lucide-react";
import { HelpFloatMenu } from "@/components/HelpFloatMenu";

interface Report {
   id: string;
   name: string;
   type: string;
   status: string;
   is_saved: boolean;
   created_at: string;
}
interface SavedQuery {
   id: string;
   name: string;
   query_type: string;
   created_at: string;
}
const getTag = (type: string): { label: string; className: string } => {
    const t = type.toLowerCase();
    if (t.includes("comparison") || t.includes("compare")) return { label: "Comparison", className: "bg-navy/10 text-navy" };
    if (t.includes("pattern") || t.includes("cluster") || t.includes("ml") || t.includes("advanced") || t.includes("pca") || t.includes("outlier")) return { label: "ML Analysis", className: "bg-teal/10 text-teal" };
    return { label: "Offence Trends", className: "bg-olive/10 text-olive" };
};

const getReportRoute = (report: Report): string => {
  const name = report.name.toLowerCase();
  if (name.includes("offence trends")) return "/overview";
    if (name.includes("single category")) return "/compare-results?mode=single&cat1=Unit Type";
    if (name.includes("double category")) return "/compare-results?mode=double&cat1=Unit Type&cat2=Rank";
  if (name.includes("k-means")) return "/advanced-results?method=clustering";
  if (name.includes("hierarchical")) return "/advanced-results?method=hierarchical";
    if (name.includes("anomaly")) return "/advanced-results?method=outlier";
  return "/overview";
};

const demoReports: Report[] = [];

const demoQueries: SavedQuery[] = [];

const modules = [
    { icon: BarChart3, title: "Offence Trends", path: "/overview", desc: "Browse offence frequencies and demographic breakdowns across 800+ courts martial records.", color: "from-olive to-olive-light", badgeColor: "bg-olive/10 text-olive" },
    { icon: GitCompare, title: "Compare", path: "/compare", desc: "Side-by-side comparison of disciplinary patterns between two soldier groups.", color: "from-navy to-slate-blue", badgeColor: "bg-navy/10 text-navy" },
      { icon: Search, title: "ML Analysis", path: "/advanced", desc: "Apply decision tree, logistic regression, or naive bayes to identify predictive patterns.", color: "from-teal to-sage", badgeColor: "bg-teal/10 text-teal" },
    { icon: Database, title: "Dataset Info", path: "/metadata", desc: "Database schema, data quality metrics, and known limitations.", color: "from-slate-blue to-navy", badgeColor: "bg-navy/10 text-navy" },
      { icon: BookOpen, title: "User Manual", path: "/user-manual", desc: "Step-by-step guide to each module and how to interpret results.", color: "from-sage to-olive", badgeColor: "bg-sage/10 text-sage" },
];

const gettingStartedSteps = [
    { step: 1, title: "Explore Offence Trends", desc: "Start with the Offence Trends module to see the most common disciplinary offences across the CEF. You can filter by rank, unit type, enlistment year, and more.", path: "/overview" },
      { step: 2, title: "Compare Soldier Groups", desc: "Use the Compare module to examine how offence patterns differ between two groups - for example, Privates vs Corporals, or Ontario-born vs Quebec-born soldiers.", path: "/compare" },
    { step: 3, title: "Run ML Analysis", desc: "Apply machine learning methods (decision tree, logistic regression, naive bayes) to discover which soldier attributes are most predictive of court martial outcomes.", path: "/advanced" },
      { step: 4, title: "Review the Dataset", desc: "Check the Dataset Info page to understand the data sources, their coverage (1914-1918), and any known limitations before drawing conclusions.", path: "/metadata" },
];

const UserDashboard = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading, signOut } = useAuth();
    const { toast } = useToast();

    const [reports, setReports] = useState<Report[]>([]);
    const [queries, setSavedQueries] = useState<SavedQuery[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (authLoading) return;
        const token = localStorage.getItem("auth_token");
        if (!token) {
            setReports(demoReports);
            setSavedQueries(demoQueries);
            setLoading(false);
            return;
        }
        fetch("/api/reports", { headers: { Authorization: `Bearer ${token}` } })
          .then(res => res.ok ? res.json() : [])
          .then((data: { id: string; name: string; type: string; created_at: string }[]) => {
              setReports(data.map(r => ({ ...r, status: "completed", is_saved: true })));
          })
          .catch(() => setReports([]))
          .finally(() => { setSavedQueries(demoQueries); setLoading(false); });
    }, [authLoading]);

    const doSignOut = async () => {
        await signOut();
        toast({ title: "Signed out" });
        navigate("/");
    };

    const removeReport = async (id: string) => {
        setReports(prev => prev.filter(r => r.id !== id));
        toast({ title: "Removed", description: "Report removed from saved items" });
        const token = localStorage.getItem("auth_token");
        if (token) {
            try { await fetch(`/api/reports/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); } catch { /* best-effort */ }
        }
    };
    const removeQuery = (id: string) => {
        setSavedQueries(prev => prev.filter(q => q.id !== id));
        toast({ title: "Removed", description: "Query removed from dashboard" });
    };

    if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground font-body">Loading...</p></div>;

    const isNew = (dateStr: string) => differenceInHours(new Date(), new Date(dateStr)) < 24;

    const pinned = reports.filter(r => r.is_saved).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const hasActivity = reports.length > 0 || pinned.length > 0 || queries.length > 0;

    return (
        <PageLayout code="P-17" title="Your Dashboard" subtitle={`Welcome back${user?.user_metadata?.display_name ? `, ${user.user_metadata.display_name}` : ""}. Explore analysis tools, saved reports, and previous queries.`} showFooter={false} showBackToMenu={false}>

          {!hasActivity && (
              <div className="panel border-olive/30 bg-gradient-to-br from-olive/[0.04] via-transparent to-gold/[0.04]">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-md bg-olive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Lightbulb className="w-4 h-4 text-olive" />
                  </div>
                    <div>
                      <h3 className="font-serif font-semibold text-sm">New to TimeVault?</h3>
                    <p className="text-xs text-muted-foreground font-body mt-1 leading-relaxed">
                        TimeVault provides tools for exploring Canadian Expeditionary Force courts martial records from World War I (1914-1918). The system contains aggregate disciplinary data that you can browse, compare, and analyse using machine learning methods.
                    </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 pl-11">
                    <WireButton filled accent onClick={() => navigate("/guest-menu")} className="gap-1.5 text-xs py-2 px-4">
                      Open Menu <ArrowRight className="w-3 h-3" />
                    </WireButton>
                  <Link
                      to="/user-manual"
                    className="inline-flex items-center gap-1.5 text-xs font-body text-olive hover:text-olive-light hover:bg-olive/10 transition-all duration-200 underline underline-offset-2 rounded-sm px-1 py-0.5"
                    >
                    <BookOpen className="w-3.5 h-3.5" />
                      Read the User Manual
                  </Link>
                </div>
              </div>
          )}

          {hasActivity && (
              <div className="flex justify-center gap-3">
                <WireButton filled accent onClick={() => navigate("/guest-menu")} className="gap-1.5 text-sm py-2.5 px-6">
                    Explore Menu <ArrowRight className="w-3.5 h-3.5" />
                </WireButton>
              </div>
          )}

          {hasActivity && (
            <div className="grid grid-cols-3 gap-4">
                {[["Reports", reports.length], ["Saved", pinned.length], ["Queries", queries.length]].map(([label, val]) => (
                  <div key={label as string} className="stat-card">
                    <p className="text-2xl font-serif font-bold text-olive">{val}</p>
                      <p className="text-xs text-muted-foreground font-body">{label}</p>
                  </div>
                ))}
            </div>
          )}

          {!hasActivity && (
              <WireBox label="GETTING STARTED" dashed={false} accent="olive">
                <p className="text-xs text-muted-foreground font-body mb-4 leading-relaxed">
                  Follow these steps to begin exploring the dataset. Each module builds on the previous one, but you can use them in any order.
                </p>
              <div className="space-y-3">
                  {gettingStartedSteps.map((s) => (
                    <div
                        key={s.step}
                      className="flex items-start gap-3 p-3 border border-border rounded-sm cursor-pointer hover:border-olive/50 hover:bg-olive/[0.03] hover:shadow-sm transition-all duration-200 group"
                        onClick={() => navigate(s.path)}
                    >
                        <div className="w-6 h-6 rounded-full bg-olive/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-serif font-bold text-olive group-hover:bg-olive/20 transition-colors">
                          {s.step}
                        </div>
                      <div className="flex-1 min-w-0">
                            <p className="text-sm font-body font-medium group-hover:text-olive transition-colors">{s.title}</p>
                          <p className="text-xs text-muted-foreground font-body mt-0.5 leading-relaxed">{s.desc}</p>
                      </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-olive mt-0.5 flex-shrink-0 transition-colors" />
                    </div>
                  ))}
                </div>
            </WireBox>
          )}

          <WireBox label="ANALYSIS MODULES" dashed={false}>
              <p className="text-xs text-muted-foreground font-body mb-4 leading-relaxed">
                {hasActivity ? "Jump back into any module to continue your analysis." : "Each module offers a different way to explore the courts martial dataset. Click any card to get started."}
              </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {modules.map((m) => (
                  <div
                      key={m.path}
                    className="panel cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-olive/50 hover:bg-card/80 transition-all duration-200 group relative overflow-hidden p-4"
                      onClick={() => navigate(m.path)}
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${m.color}`} />
                      <div className="flex items-center gap-2 mb-1.5 pt-0.5">
                        <div className={`w-7 h-7 rounded-md ${m.badgeColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <m.icon className="w-3.5 h-3.5" />
                        </div>
                          <h3 className="font-serif font-semibold text-xs group-hover:text-olive transition-colors">{m.title}</h3>
                      </div>
                    <p className="text-[11px] text-muted-foreground font-body leading-relaxed">{m.desc}</p>
                  </div>
                ))}
            </div>
          </WireBox>

          <div className="grid grid-cols-2 gap-6">
            <WireBox label="RECENT ACTIVITY" dashed={false}>
              {loading ? (
                <p className="text-muted-foreground text-center py-4 font-body text-sm">Loading...</p>
              ) : reports.length === 0 ? (
                  <div className="text-center py-6 space-y-2">
                    <div className="w-10 h-10 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                      <BarChart3 className="w-4.5 h-4.5 text-muted-foreground/50" />
                    </div>
                      <p className="text-sm text-muted-foreground font-body">No activity yet</p>
                    <p className="text-xs text-muted-foreground/70 font-body leading-relaxed max-w-[250px] mx-auto">
                        Your recent analyses will appear here once you run Offence Trends, Compare, or ML Analysis.
                    </p>
                    <WireButton accent className="text-xs mt-2 gap-1" onClick={() => navigate("/overview")}>
                        Start exploring <ArrowRight className="w-3 h-3" />
                    </WireButton>
                  </div>
              ) : (
                <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                    {reports.slice(0, 10).map((r) => {
                      const tag = getTag(r.type);
                      return (
                        <div key={r.id} className="p-3 border border-border rounded-sm hover:border-olive/30 hover:shadow-sm transition-all duration-200 cursor-pointer" onClick={() => navigate(getReportRoute(r))}>
                            <div className="flex justify-between items-start mb-1.5">
                              <p className="text-sm font-body font-medium">{r.name}</p>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] font-body px-1.5 py-0.5 rounded-sm ${tag.className}`}>
                                      {tag.label}
                                  </span>
                                </div>
                            </div>
                          <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-body px-1.5 py-0.5 rounded-sm ${r.status === "completed" ? "bg-olive/10 text-olive" : "bg-muted text-muted-foreground"}`}>{r.status}</span>
                            <span className="text-xs text-muted-foreground font-body">&middot;</span>
                              <span className="text-xs text-muted-foreground font-body">{format(new Date(r.created_at), "MMM d, yyyy")}</span>
                            {r.is_saved && <span className="text-xs text-gold font-body">★ Saved</span>}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </WireBox>

            <WireBox label="SAVED ITEMS" dashed={false}>
              {loading ? (
                <p className="text-muted-foreground text-center py-4 font-body text-sm">Loading...</p>
              ) : pinned.length === 0 && queries.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                    <div className="w-10 h-10 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                      <BookOpen className="w-4.5 h-4.5 text-muted-foreground/50" />
                    </div>
                  <p className="text-sm text-muted-foreground font-body">No saved items yet</p>
                    <p className="text-xs text-muted-foreground/70 font-body leading-relaxed max-w-[250px] mx-auto">
                      Save reports and queries from your analysis sessions to revisit them later from this panel.
                    </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                  {pinned.slice(0, 10).map((r) => {
                      const tag = getTag(r.type);
                    return (
                        <div key={r.id} className="p-3 border border-gold/30 rounded-sm bg-gold/5 cursor-pointer hover:border-gold/50 hover:shadow-sm transition-all duration-200" onClick={() => navigate(getReportRoute(r))}>
                          <div className="flex justify-between items-start mb-1.5">
                           <p className="text-sm font-body font-medium flex items-center gap-2">
                               {r.name}
                             {isNew(r.created_at) && <span className="text-[9px] font-body font-bold px-1.5 py-0.5 rounded-sm bg-destructive/15 text-destructive animate-pulse">NEW</span>}
                           </p>
                             <div className="flex items-center gap-1.5">
                                 <span className={`text-[10px] font-body px-1.5 py-0.5 rounded-sm ${tag.className}`}>{tag.label}</span>
                              <button onClick={(e) => { e.stopPropagation(); removeReport(r.id); }} className="p-1 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Remove">
                                  <Trash2 className="w-3 h-3" />
                              </button>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground font-body">Saved {format(new Date(r.created_at), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                    );
                  })}
                    {queries.slice(0, 10).map((q) => {
                      const tag = getTag(q.query_type);
                        return (
                      <div key={q.id} className="p-3 border border-gold/30 rounded-sm bg-gold/5">
                          <div className="flex justify-between items-start mb-1.5">
                           <p className="text-sm font-body font-medium flex items-center gap-2">
                               {q.name}
                               {isNew(q.created_at) && <span className="text-[9px] font-body font-bold px-1.5 py-0.5 rounded-sm bg-destructive/15 text-destructive animate-pulse">NEW</span>}
                           </p>
                             <div className="flex items-center gap-1.5">
                               <span className={`text-[10px] font-body px-1.5 py-0.5 rounded-sm ${tag.className}`}>{tag.label}</span>
                                <button onClick={() => removeQuery(q.id)} className="p-1 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Remove">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                             </div>
                          </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground font-body">Saved {format(new Date(q.created_at), "MMM d, yyyy")}</span>
                            </div>
                      </div>
                        );
                    })}
                </div>
              )}
            </WireBox>
          </div>

          <div className="flex justify-center gap-3">
              <WireButton onClick={doSignOut} className="gap-1.5">
                <LogOut className="w-3.5 h-3.5" /> Back to Sign In
              </WireButton>
          </div>

          <HelpFloatMenu manualSectionId="um-overview" />
        </PageLayout>
    );
};

export default UserDashboard;
