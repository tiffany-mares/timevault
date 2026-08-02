import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { AdminHeader } from "@/components/AdminHeader";
import { WireBox } from "@/components/wireframe";

const endpoints = [
    { method: "POST", path: "/api/auth/login", desc: "Authenticate a user and return a JWT token" },
    { method: "POST", path: "/api/auth/signup", desc: "Register a new viewer account" },
    { method: "GET", path: "/api/auth/me", desc: "Return the currently authenticated user's profile" },
    { method: "POST", path: "/api/trends", desc: "Query offence trends with year range, rank, unit, and offence filters" },
    { method: "POST", path: "/api/compare", desc: "Compare offence distributions between two soldier groups (single or double category)" },
    { method: "POST", path: "/api/run-decision-tree", desc: "Train a decision tree classifier on live database data and return results" },
    { method: "POST", path: "/api/run-logistic-regression", desc: "Train a logistic regression model on live database data and return coefficients" },
    { method: "POST", path: "/api/run-naive-bayes", desc: "Run naive bayes pattern discovery on live database data and return class probabilities" },
];

const methodColors: Record<string, string> = {
    GET: "text-teal bg-teal/10",
    POST: "text-olive bg-olive/10",
};

const AdminLogs = () => {
    const navigate = useNavigate();

    return (
        <PageLayout
            code="P-20"
            title="API Reference"
            subtitle="All available backend endpoints, their HTTP methods, and what they do"
            showBackToMenu={true}
            backButtonPath="/admin-dashboard"
            headerOverride={<AdminHeader />}
            backButtonLabel="Back to Admin Dashboard"
        >
            <WireBox dashed={false} label="ENDPOINTS" accent="olive">
                <p className="text-xs text-muted-foreground font-body mb-4 leading-relaxed">
                    The Flask backend serves on port <span className="font-mono text-foreground">5001</span>. The Vite dev server proxies all <span className="font-mono text-foreground">/api</span> requests to it automatically.
                </p>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-2 px-3 font-body font-semibold uppercase tracking-wide text-olive w-20">Method</th>
                                <th className="text-left py-2 px-3 font-body font-semibold uppercase tracking-wide text-olive">Path</th>
                                <th className="text-left py-2 px-3 font-body font-semibold uppercase tracking-wide text-olive">Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {endpoints.map((ep, i) => (
                                <tr key={ep.path} className={`border-b border-border/40 ${i % 2 === 0 ? "bg-card" : "bg-parchment-dark/20"}`}>
                                    <td className="py-2.5 px-3">
                                        <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${methodColors[ep.method] ?? ""}`}>
                                            {ep.method}
                                        </span>
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-foreground">{ep.path}</td>
                                    <td className="py-2.5 px-3 font-body text-muted-foreground">{ep.desc}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </WireBox>

            <WireBox dashed={false} label="ML MODEL FEATURES" accent="teal">
                <p className="text-xs text-muted-foreground font-body mb-4 leading-relaxed">
                    Each ML endpoint accepts an optional <span className="font-mono text-foreground">features</span> array in the request body.
                    If omitted, the model uses all allowed features. Invalid feature names return a 400 error.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                        { model: "Decision Tree", features: ["Rank", "Unit Type", "Birthplace", "Occupation", "Marital Status", "Enlistment Year", "Birth Year"] },
                        { model: "Logistic Regression", features: ["Rank", "Unit Type", "Birthplace", "Occupation", "Marital Status", "Enlistment Year", "Birth Year"] },
                        { model: "Naive Bayes", features: ["Rank", "Unit Type", "Enlistment Year"] },
                    ].map((m) => (
                        <div key={m.model} className="border border-border rounded-sm p-3">
                            <p className="font-serif font-semibold text-sm mb-2">{m.model}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {m.features.map((f) => (
                                    <span key={f} className="text-[11px] font-mono bg-parchment-dark/30 px-1.5 py-0.5 rounded-sm">{f}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </WireBox>
        </PageLayout>
    );
};

export default AdminLogs;
