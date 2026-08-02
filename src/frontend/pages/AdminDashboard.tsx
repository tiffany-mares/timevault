import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { AdminHeader } from "@/components/AdminHeader";
import { WireBox, WireButton } from "@/components/wireframe";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Database, FileText, ScrollText, Shield, Brain, Server } from "lucide-react";

interface AdminStatus {
    backend: string;
    database: {
        connected: boolean;
        error: string | null;
        counts: Record<string, number | null>;
    };
    ml_models: Record<string, boolean>;
}

const TABLE_META = [
    { table: "ww1_enlistment", desc: "Soldier demographics and service details", cols: "FName, Minit, LName, Regiment_number, Rank, Enlistment_Year, Year_of_Birth, Place_of_Birth, Occupation, Marital_Status" },
    { table: "ww1_court_martial", desc: "Courts martial proceedings and offence records", cols: "FName, Minit, LName, Regiment_number, Rank, Unit_Type, Enlistment_Year, Offence" },
    { table: "app_user", desc: "Registered user accounts (viewer and admin roles)", cols: "id, username, password_hash, role" },
    { table: "user_reports", desc: "Saved reports linked to user dashboards", cols: "id, user_id, name, type, created_at" },
    { table: "api_request_log", desc: "Automatic log of every API request", cols: "id, ts, method, path, status_code, duration_ms, username" },
];

const fmtCount = (n: number | null | undefined) =>
    n === null || n === undefined ? "—" : n.toLocaleString();

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const { toast } = useToast();

    const [status, setStatus] = useState<AdminStatus | null>(null);
    const [statusError, setStatusError] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("auth_token");
        fetch("/api/admin/status", { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => {
                if (!res.ok) throw new Error("status fetch failed");
                return res.json();
            })
            .then((data: AdminStatus) => setStatus(data))
            .catch(() => setStatusError(true));
    }, []);

    const doSignOut = async () => {
        await signOut();
        toast({ title: "Signed out" });
        navigate("/");
    };

    const backendLabel = status ? "Online" : statusError ? "Offline" : "…";
    const dbConnected = status?.database.connected ?? false;
    const counts = status?.database.counts ?? {};
    const tableCount = status ? Object.keys(counts).length : null;
    const mlCount = status ? Object.values(status.ml_models).filter(Boolean).length : null;

    return (
        <PageLayout code="P-19" title="Admin Dashboard" subtitle="System overview, database status, and analysis tools" showBackToMenu={false} headerOverride={<AdminHeader />} marqueeItems={["Admin Dashboard", "Backend Status", "Database", "ML Models", "Live Counts", "System Overview"]}>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <WireBox dashed={false} className="text-center p-4">
                    <Server className={`w-5 h-5 mx-auto mb-2 ${statusError ? "text-rust" : "text-olive"}`} />
                    <p className="text-lg font-mono font-bold flex items-center justify-center gap-2">
                        {status && <span className="breathe inline-block w-2 h-2 rounded-full bg-olive" />}
                        {backendLabel}
                    </p>
                    <p className="text-xs text-muted-foreground font-body">Backend Status</p>
                </WireBox>
                <WireBox dashed={false} className="text-center p-4">
                    <Database className={`w-5 h-5 mx-auto mb-2 ${status && !dbConnected ? "text-rust" : "text-olive"}`} />
                    <p className="text-lg font-mono font-bold">{status ? (dbConnected ? tableCount : "Offline") : "—"}</p>
                    <p className="text-xs text-muted-foreground font-body">Database Tables</p>
                </WireBox>
                <WireBox dashed={false} className="text-center p-4">
                    <Brain className="w-5 h-5 text-olive mx-auto mb-2" />
                    <p className="text-lg font-mono font-bold">{mlCount ?? "—"}</p>
                    <p className="text-xs text-muted-foreground font-body">ML Models</p>
                </WireBox>
                <WireBox dashed={false} className="text-center p-4">
                    <Shield className="w-5 h-5 text-olive mx-auto mb-2" />
                    <p className="text-lg font-mono font-bold">{user?.username ?? "Admin"}</p>
                    <p className="text-xs text-muted-foreground font-body">Signed in as</p>
                </WireBox>
            </div>

            <WireBox dashed={false} label="DATABASE OVERVIEW" accent="olive">
                <p className="text-xs text-muted-foreground font-body mb-4 leading-relaxed">
                    The system uses a PostgreSQL database ({" "}
                    <span className="font-mono text-foreground">ww1_db</span>{" "}
                    ). Record counts below are live, fetched from{" "}
                    <span className="font-mono text-foreground">/api/admin/status</span>.
                    {statusError && <span className="text-rust"> Backend unreachable — counts unavailable.</span>}
                    {status && !dbConnected && <span className="text-rust"> Database connection failed: {status.database.error}</span>}
                </p>
                <div className="space-y-3">
                    {TABLE_META.map((t) => (
                        <div key={t.table} className="border border-border rounded-sm p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-mono font-semibold text-sm text-foreground">{t.table}</span>
                                <span className="text-xs font-mono text-muted-foreground">{fmtCount(counts[t.table])} records</span>
                            </div>
                            <p className="text-xs text-muted-foreground font-body mb-1.5">{t.desc}</p>
                            <p className="text-[11px] font-mono text-muted-foreground/70 leading-relaxed">{t.cols}</p>
                        </div>
                    ))}
                </div>
            </WireBox>

            <WireBox dashed={false} label="ML MODELS" accent="teal">
                <p className="text-xs text-muted-foreground font-body mb-4 leading-relaxed">
                    Three machine learning models are available. Availability below reflects whether each script exists on the server.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                        { key: "decision_tree", name: "Decision Tree", endpoint: "/api/run-decision-tree", desc: "Classification tree predicting court martial likelihood" },
                        { key: "logistic_regression", name: "Logistic Regression", endpoint: "/api/run-logistic-regression", desc: "Feature coefficients ranking court martial risk factors" },
                        { key: "naive_bayes", name: "Naive Bayes", endpoint: "/api/run-naive-bayes", desc: "Pattern discovery across offence categories" },
                    ].map((m) => (
                        <div key={m.name} className="border border-border rounded-sm p-3">
                            <div className="flex items-center justify-between mb-1">
                                <p className="font-serif font-semibold text-sm">{m.name}</p>
                                {status && (
                                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${status.ml_models[m.key] ? "text-olive bg-olive/10" : "text-rust bg-rust/10"}`}>
                                        {status.ml_models[m.key] ? "Available" : "Missing"}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground font-body mb-1.5">{m.desc}</p>
                            <p className="text-[11px] font-mono text-muted-foreground/60">{m.endpoint}</p>
                        </div>
                    ))}
                </div>
            </WireBox>

            <WireBox dashed={false} label="ADMIN TOOLS">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="border border-border rounded-sm p-4 text-center space-y-2 cursor-pointer hover:border-olive/50 hover:shadow-sm transition-all duration-200" onClick={() => navigate("/admin-logs")}>
                        <ScrollText className="w-5 h-5 text-olive mx-auto" />
                        <p className="font-serif font-semibold text-sm">System Logs</p>
                        <p className="text-xs text-muted-foreground font-body">Live API request log and endpoint reference</p>
                    </div>
                    <div className="border border-border rounded-sm p-4 text-center space-y-2 cursor-pointer hover:border-olive/50 hover:shadow-sm transition-all duration-200" onClick={() => navigate("/admin-metadata")}>
                        <Database className="w-5 h-5 text-olive mx-auto" />
                        <p className="font-serif font-semibold text-sm">System Metadata</p>
                        <p className="text-xs text-muted-foreground font-body">Database schema and column details</p>
                    </div>
                    <div className="border border-border rounded-sm p-4 text-center space-y-2 cursor-pointer hover:border-olive/50 hover:shadow-sm transition-all duration-200" onClick={() => navigate("/admin-export")}>
                        <FileText className="w-5 h-5 text-olive mx-auto" />
                        <p className="font-serif font-semibold text-sm">Export</p>
                        <p className="text-xs text-muted-foreground font-body">Export analysis results as PNG or PDF</p>
                    </div>
                </div>
            </WireBox>

            <div className="flex justify-center gap-3">
                <WireButton onClick={doSignOut} className="gap-1.5">
                    Back to Sign In
                </WireButton>
            </div>
        </PageLayout>
    );
};

export default AdminDashboard;
