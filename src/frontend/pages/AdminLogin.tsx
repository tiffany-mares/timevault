import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/timevault-logo.png";
import authBg from "@/assets/background.jpg";
import { PageLayout } from "@/components/PageLayout";
import { WireButton, WireInput } from "@/components/wireframe";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function AdminLogin() {
    const navigate = useNavigate();
    const { adminSignIn } = useAuth();
    const { toast } = useToast();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const login = async () => {
        if (!username || !password) {
            toast({ title: "Missing fields", description: "Please enter your username and password.", variant: "destructive" });
            return;
        }

        setLoading(true);
        const { error } = await adminSignIn(username, password);
        setLoading(false);

        if (error) {
            toast({ title: "Admin login failed", description: error, variant: "destructive" });
            return;
        }

        toast({ title: "Welcome, Admin!", description: `Signed in as ${username}.` });
        navigate("/admin-dashboard");
    };

    return (
        <PageLayout code="P-18" centered showBackToMenu={false} showHeader={false} showFooter={false} backgroundImage={authBg}>
            <div className="panel w-full max-w-sm text-center py-10 px-8 shadow-lg">
                <img src={logo} alt="TimeVault Logo" className="w-10 h-10 mx-auto mb-4 object-contain" />
                <h1 className="text-lg font-serif font-bold tracking-wide mb-2">Admin Login</h1>
                <p className="text-xs text-muted-foreground font-body mb-8">
                    Restricted access for system administrators.
                </p>

                <div className="flex flex-col gap-4 mb-6">
                    <WireInput
                        label="Username"
                        placeholder="Enter username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && login()}
                    />
                    <WireInput
                        label="Password"
                        placeholder="Enter password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && login()}
                    />
                </div>

                <WireButton
                    filled
                    accent
                    className="w-full py-3 mb-6"
                    onClick={login}
                    disabled={loading}
                >
                    {loading ? "Signing in..." : "Sign In"}
                </WireButton>
                <WireButton onClick={() => navigate("/")}>Back to Landing Page</WireButton>
            </div>
        </PageLayout>
    );
}
