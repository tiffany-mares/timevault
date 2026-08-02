import { useNavigate, Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { HelpFloatMenu } from "@/components/HelpFloatMenu";
import { BarChart3, GitCompare, Search, Database, BookOpen } from "lucide-react";


const GuestMenu = () => {
  const navigate = useNavigate();

  const modules = [
      { icon: BarChart3, title: "Offence Trends", desc: "Browse offence frequencies and demographic breakdowns. Filter by rank, unit type, enlistment year, and other attributes.", path: "/overview", color: "from-olive to-olive-light", badgeColor: "bg-olive/10 text-olive" },
        { icon: GitCompare, title: "Compare", desc: "Side-by-side comparison of courts martial patterns between two soldier groups, such as different ranks or unit types.", path: "/compare", color: "from-navy to-slate-blue", badgeColor: "bg-navy/10 text-navy" },
      { icon: Search, title: "ML Analysis", desc: "Apply decision tree, logistic regression, or naive bayes classification to identify predictive patterns.", path: "/advanced", color: "from-teal to-sage", badgeColor: "bg-teal/10 text-teal" },
        { icon: Database, title: "Dataset Info", desc: "Database schema, table statistics, data quality metrics, and known limitations of the dataset.", path: "/metadata", color: "from-slate-blue to-navy", badgeColor: "bg-navy/10 text-navy" },
      { icon: BookOpen, title: "User Manual", desc: "Step-by-step guide to each module, offence code definitions, and how to interpret results.", path: "/user-manual", color: "from-sage to-olive", badgeColor: "bg-sage/10 text-sage" },
  ];

  return (
    <PageLayout
        code="P-02"
        title="Menu"
        subtitle="Aggregate Canadian CEF disciplinary data (1914-1918)"
        marqueeItems={["Offence Trends", "Compare", "ML Analysis", "Dataset Info", "User Manual", "CEF 1914–1918"]}
        maxWidth="max-w-3xl"
        backButtonLabel="Back to Sign In"
        backButtonPath="/"
    >
      <div className="flex items-center gap-4 mb-2">
        <Link
          to="/metadata"
          className="inline-flex items-center gap-1.5 text-xs font-body text-olive hover:text-olive-light hover:bg-olive/10 transition-all duration-200 underline underline-offset-2 rounded-sm px-1 -mx-1 py-0.5"
        >
          <BookOpen className="w-3.5 h-3.5" />
          View dataset information
        </Link>
        <Link
          to="/user-manual#um-overview"
          className="inline-flex items-center gap-1.5 text-xs font-body text-olive hover:text-olive-light hover:bg-olive/10 transition-all duration-200 underline underline-offset-2 rounded-sm px-1 -mx-1 py-0.5"
        >
          <BookOpen className="w-3.5 h-3.5" />
          View in User Manual
        </Link>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => (
              <div
                key={m.path}
                  className="panel cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-olive/50 hover:bg-card/80 transition-all duration-200 group relative overflow-hidden"
                onClick={() => navigate(m.path)}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${m.color}`} />
                  <div className="flex items-center gap-2.5 mb-2 pt-1">
                    <div className={`w-9 h-9 rounded-md ${m.badgeColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <m.icon className="w-4.5 h-4.5" />
                    </div>
                      <h3 className="font-serif font-semibold text-sm group-hover:text-olive transition-colors">{m.title}</h3>
                  </div>

                <p className="text-xs text-muted-foreground font-body leading-relaxed">{m.desc}</p>
              </div>
          ))}
      </div>
      <HelpFloatMenu manualSectionId="um-overview" />
    </PageLayout>
  );
};

export default GuestMenu;
