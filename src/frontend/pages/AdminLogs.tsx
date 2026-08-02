import { useCallback, useEffect, useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { AdminHeader } from "@/components/AdminHeader";
import { WireBox, WireButton } from "@/components/wireframe";
import { RefreshCw } from "lucide-react";

interface LogRow {
    id: number;
    timestamp: string | null;
    method: string;
    path: string;
    status_code: number;
    duration_ms: number | null;
    username: string | null;
}

const endpoints = [
    { method: "POST", path: "/api/auth/register", desc: "Register a new viewer account" },
    { method: "POST", path: "/api/auth/login", desc: "Viewer login, returns a JWT token" },
    { method: "POST", path: "/api/auth/admin/login", desc: "Admin login, returns a JWT token" },
    { method: "POST", path: "/api/auth/verify", desc: "Validate an existing token" },
    { method: "POST", path: "/api/trends", desc: "Offence trends with year, rank, unit, and offence filters" },
    { method: "POST", path: "/api/compare", desc: "Compare offence distributions between two soldier groups" },
    { method: "POST", path: "/api/run-decision-tree", desc: "Train a decision tree classifier on live data and return results" },
    { method: "POST", path: "/api/run-logistic-regression", desc: "Train a logistic regression model and return coefficients" },
    { method: "POST", path: "/api/run-naive-bayes", desc: "Run naive bayes pattern discovery on live data" },
    { method: "GET", path: "/api/reports", desc: "List the authenticated user's saved reports" },
    { method: "POST", path: "/api/reports", desc: "Save a report to the user dashboard" },
    { method: "DELETE", path: "/api/reports/<id>", desc: "Delete one of the user's saved reports" },
    { method: "GET", path: "/api/admin/status", desc: "Admin only: DB health, live row counts, ML script availability" },
    { method: "GET", path: "/api/admin/logs", desc: "Admin only: recent API request log (limit param, default 100, max 500)" },
];

const methodColors: Record<string, string> = {
    GET: "text-teal bg-teal/10",
    POST: "text-olive bg-olive/10",
    DELETE: "text-rust bg-rust/10",
};

const statusColor = (code: number) =>
    code >= 500 ? "text-rust" : code >= 400 ? "text-gold" : "text-olive";

const AdminLogs = () => {
    const [logs, setLogs] = useState<LogRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = useCallback(() => {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("auth_token");
        fetch("/api/admin/logs?limit=100", { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => {
                if (res.status === 403) throw new Error("Admin access required.");
                if (res.status === 401) throw new Error("Your session has expired — please sign in again.");
                if (!res.ok) throw new Error(`Request failed (${res.status})`);
                return res.json();
            })
            .then((data: { logs: LogRow[] }) => setLogs(data.logs))
            .catch((e: Error) => setError(e.message || "Failed to load logs"))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    return (
        <PageLayout
            code="P-20"
            title="System Logs"
            subtitle="Live API request history and backend endpoint reference"
            showBackToMenu={true}
            backButtonPath="/admin-dashboard"
            headerOverride={<AdminHeader />}
            backButtonLabel="Back to Admin Dashboard"
        >
            <WireBox dashed={false} label="API REQUEST LOG" accent="olive">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-muted-foreground font-body leading-relaxed">
                        Every API request is recorded automatically (method, path, status, duration, and user when authenticated). Showing the 100 most recent, newest first.
                    </p>
                    <WireButton onClick={fetchLogs} disabled={loading} className="gap-1.5 shrink-0 ml-4">
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </WireButton>
                </div>

                {error && (
                    <p className="text-xs text-rust font-body mb-3">Could not load logs: {error}</p>
                )}
                {!error && !loading && logs.length === 0 && (
                    <p className="text-xs text-muted-foreground font-body mb-3">No requests logged yet.</p>
                )}

                {logs.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left py-2 px-3 font-body font-semibold uppercase tracking-wide text-olive">Time</th>
                                    <th className="text-left py-2 px-3 font-body font-semibold uppercase tracking-wide text-olive w-20">Method</th>
                                    <th className="text-left py-2 px-3 font-body font-semibold uppercase tracking-wide text-olive">Path</th>
                                    <th className="text-left py-2 px-3 font-body font-semibold uppercase tracking-wide text-olive w-16">Status</th>
                                    <th className="text-left py-2 px-3 font-body font-semibold uppercase tracking-wide text-olive w-24">Duration</th>
                                    <th className="text-left py-2 px-3 font-body font-semibold uppercase tracking-wide text-olive">User</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((row, i) => (
                                    <tr key={row.id} className={`border-b border-border/40 ${i % 2 === 0 ? "bg-card" : "bg-parchment-dark/20"}`}>
                                        <td className="py-2 px-3 font-mono text-muted-foreground whitespace-nowrap">
                                            {row.timestamp ? new Date(row.timestamp).toLocaleString() : "—"}
                                        </td>
                                        <td className="py-2 px-3">
                                            <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${methodColors[row.method] ?? ""}`}>
                                                {row.method}
                                            </span>
                                        </td>
                                        <td className="py-2 px-3 font-mono text-foreground">{row.path}</td>
                                        <td className={`py-2 px-3 font-mono font-bold ${statusColor(row.status_code)}`}>{row.status_code}</td>
                                        <td className="py-2 px-3 font-mono text-muted-foreground">{row.duration_ms !== null ? `${row.duration_ms} ms` : "—"}</td>
                                        <td className="py-2 px-3 font-mono text-muted-foreground">{row.username ?? "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </WireBox>

            <WireBox dashed={false} label="API REFERENCE" accent="teal">
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
                                <tr key={`${ep.method}-${ep.path}`} className={`border-b border-border/40 ${i % 2 === 0 ? "bg-card" : "bg-parchment-dark/20"}`}>
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
        </PageLayout>
    );
};

export default AdminLogs;
