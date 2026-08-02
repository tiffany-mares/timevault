import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { AdminHeader } from "@/components/AdminHeader";
import { WireBox, WireButton } from "@/components/wireframe";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Database, FileText, ScrollText, Shield, Brain, Server } from "lucide-react";


const AdminDashboard = () => {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const { toast } = useToast();

    const doSignOut = async () => {
        await signOut();
        toast({ title: "Signed out" });
        navigate("/");
    };

    return (
        <PageLayout code="P-19" title="Admin Dashboard" subtitle="System overview, database status, and analysis tools" showBackToMenu={false} headerOverride={<AdminHeader />}>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <WireBox dashed={false} className="text-center p-4">
                    <Server className="w-5 h-5 text-olive mx-auto mb-2" />
                    <p className="text-lg font-mono font-bold">Online</p>
                    <p className="text-xs text-muted-foreground font-body">Backend Status</p>
                </WireBox>
                <WireBox dashed={false} className="text-center p-4">
                    <Database className="w-5 h-5 text-olive mx-auto mb-2" />
                    <p className="text-lg font-mono font-bold">3</p>
                    <p className="text-xs text-muted-foreground font-body">Database Tables</p>
                </WireBox>
                <WireBox dashed={false} className="text-center p-4">
                    <Brain className="w-5 h-5 text-olive mx-auto mb-2" />
                    <p className="text-lg font-mono font-bold">3</p>
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
                    ) with three primary tables. Enlistment and courts martial data are loaded from cleaned CSV sources via the setup script.
                </p>
                <div className="space-y-3">
                    {[
                        { table: "ww1_enlistment", desc: "Soldier demographics and service details", cols: "FName, Minit, LName, Regiment_number, Rank, Enlistment_Year, Year_of_Birth, Place_of_Birth, Occupation, Marital_Status", records: "~57,000" },
                        { table: "ww1_court_martial", desc: "Courts martial proceedings and offence records", cols: "FName, Minit, LName, Regiment_number, Rank, Unit_Type, Enlistment_Year, Offence", records: "~11,000" },
                        { table: "app_user", desc: "Registered user accounts (viewer and admin roles)", cols: "id, username, password_hash, role", records: "-" },
                    ].map((t) => (
                        <div key={t.table} className="border border-border rounded-sm p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-mono font-semibold text-sm text-foreground">{t.table}</span>
                                <span className="text-xs font-mono text-muted-foreground">{t.records} records</span>
                            </div>
                            <p className="text-xs text-muted-foreground font-body mb-1.5">{t.desc}</p>
                            <p className="text-[11px] font-mono text-muted-foreground/70 leading-relaxed">{t.cols}</p>
                        </div>
                    ))}
                </div>
            </WireBox>

            <WireBox dashed={false} label="ML MODELS" accent="teal">
                <p className="text-xs text-muted-foreground font-body mb-4 leading-relaxed">
                    Three machine learning models are available. Each trains on live database data when a user runs an analysis from the ML Analysis page.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                        { name: "Decision Tree", endpoint: "/api/run-decision-tree", desc: "Classification tree predicting court martial likelihood" },
                        { name: "Logistic Regression", endpoint: "/api/run-logistic-regression", desc: "Feature coefficients ranking court martial risk factors" },
                        { name: "Naive Bayes", endpoint: "/api/run-naive-bayes", desc: "Pattern discovery across offence categories" },
                    ].map((m) => (
                        <div key={m.name} className="border border-border rounded-sm p-3">
                            <p className="font-serif font-semibold text-sm mb-1">{m.name}</p>
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
                        <p className="font-serif font-semibold text-sm">API Reference</p>
                        <p className="text-xs text-muted-foreground font-body">View all available API endpoints</p>
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
