import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { WireButton, WireInput } from "@/components/wireframe";
import logo from "@/assets/timevault-logo.png";

function UserLogin() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { signIn } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const login = async () => {
        if (!username || !password) {
            toast({ title: "Missing fields", description: "Please enter your username and password.", variant: "destructive" });
            return;
        }
        setLoading(true);
        const { error } = await signIn(username, password);
        setLoading(false);

        if (error) {
            toast({ title: "Sign in failed", description: error, variant: "destructive" });
            return;
        }

        toast({ title: "Welcome back!", description: `Signed in as ${username}.` });
        navigate("/user-dashboard");
    };

    return (
        <PageLayout code="P-15" centered showBackToMenu={false} showHeader={false} showFooter={false}>
            <div className="panel w-full max-w-sm text-center py-10 px-8 shadow-lg">
                <img src={logo} alt="TimeVault Logo" className="w-10 h-10 mx-auto mb-4 object-contain" />
                <h1 className="text-lg font-serif font-bold tracking-wide mb-2">Sign In</h1>
                <p className="text-xs text-muted-foreground font-body mb-8">
                    Access saved queries, reports, and dashboard settings.
                </p>

                <div className="flex flex-col gap-4 mb-6">
                    <WireInput
                        label="Username"
                        placeholder="Enter your username"
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
                    className="w-full py-3 mb-4"
                    onClick={login}
                    disabled={loading}
                >
                    {loading ? "Signing in..." : "Sign In"}
                </WireButton>

                <p className="text-xs text-muted-foreground font-body mb-6">
                    Don't have an account?{" "}
                    <span
                        className="text-olive hover:text-olive-light cursor-pointer font-medium transition-colors"
                        onClick={() => navigate("/register")}
                    >
                        Register
                    </span>
                </p>
                <WireButton onClick={() => navigate("/")}>Back to Sign In</WireButton>
            </div>
        </PageLayout>
    );
}

export default UserLogin;
