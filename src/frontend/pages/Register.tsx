import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/timevault-logo.png";
import authBg from "@/assets/background.jpg";
import { WireButton, WireInput } from "@/components/wireframe";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { PageLayout } from "@/components/PageLayout";

const Register = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { signUp } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const register = async () => {
        if (!username || !password || !confirmPassword) {
            toast({ title: "Missing fields", description: "Please fill in all fields.", variant: "destructive" });
            return;
        }
        if (password !== confirmPassword) {
            toast({ title: "Passwords don't match", description: "Please make sure both passwords match.", variant: "destructive" });
            return;
        }
        if (password.length < 6) {
            toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
            return;
        }

        setLoading(true);
        const { error } = await signUp(username, password);
        setLoading(false);

        if (error) {
            toast({ title: "Registration failed", description: error, variant: "destructive" });
            return;
        }

        toast({ title: "Account created!", description: `Welcome, ${username}!` });
        navigate("/user-dashboard");
    };

    return (
        <PageLayout code="P-16" centered showBackToMenu={false} showHeader={false} showFooter={false} backgroundImage={authBg}>
            <div className="panel w-full max-w-sm text-center py-10 px-8 shadow-lg">
                <img src={logo} alt="TimeVault Logo" className="w-10 h-10 mx-auto mb-4 object-contain" />
                <h1 className="text-lg font-serif font-bold tracking-wide mb-2">Create Account</h1>
                <p className="text-xs text-muted-foreground font-body mb-8">
                    Register to save queries and generate reports.
                </p>

                <div className="flex flex-col gap-4 mb-6">
                    <WireInput
                        label="Username"
                        placeholder="Choose a username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <WireInput
                        label="Password"
                        placeholder="Create a password (min. 6 characters)"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <WireInput
                        label="Confirm Password"
                        placeholder="Repeat your password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && register()}
                    />
                </div>

                <WireButton
                    filled
                    accent
                    className="w-full py-3 mb-4"
                    onClick={register}
                    disabled={loading}
                >
                    {loading ? "Creating account..." : "Create Account"}
                </WireButton>

                <p className="text-xs text-muted-foreground font-body mb-6">
                    Already have an account?{" "}
                    <span
                        className="text-olive hover:text-olive-light cursor-pointer font-medium transition-colors"
                        onClick={() => navigate("/user-login")}
                    >
                        Sign in
                    </span>
                </p>
                <WireButton onClick={() => navigate("/")}>Back to Sign In</WireButton>
            </div>
        </PageLayout>
    );
};

export default Register;
