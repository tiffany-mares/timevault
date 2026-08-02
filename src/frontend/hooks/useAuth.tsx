import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthUser {
    id: number;
    username: string;
    role: "viewer" | "admin";
}

interface AuthContextType {
    user: AuthUser | null;
    session: null;
    loading: boolean;
    isAuthenticated: boolean;
    isDemoMode: boolean;
    signUp: (username: string, password: string) => Promise<{ error: string | null }>;
    signIn: (username: string, password: string) => Promise<{ error: string | null }>;
    adminSignIn: (username: string, password: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<{ error: null }>;
    enterDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(() => {
        const stored = localStorage.getItem(USER_KEY);
        return stored ? JSON.parse(stored) : null;
    });
    const [loading, setLoading] = useState(true);
    const [isDemoMode, setIsDemoMode] = useState(false);

    // Verify token on mount to make sure it's still valid
    useEffect(() => {
        const verifyToken = async () => {
            const token = localStorage.getItem(TOKEN_KEY);
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const response = await fetch("/api/auth/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                });
                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
                } else {
                    // Token expired or invalid - clear it
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(USER_KEY);
                    setUser(null);
                }
            } catch {
                // Server unreachable - keep existing user state
            } finally {
                setLoading(false);
            }
        };
        verifyToken();
    }, []);

    const signUp = async (username: string, password: string) => {
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (!response.ok) return { error: data.error || "Registration failed." };

            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            setUser(data.user);
            return { error: null };
        } catch {
            return { error: "Failed to connect to the server." };
        }
    };

    const signIn = async (username: string, password: string) => {
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (!response.ok) return { error: data.error || "Login failed." };

            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            setUser(data.user);
            return { error: null };
        } catch {
            return { error: "Failed to connect to the server." };
        }
    };

    const adminSignIn = async (username: string, password: string) => {
        try {
            const response = await fetch("/api/auth/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (!response.ok) return { error: data.error || "Admin login failed." };

            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            setUser(data.user);
            return { error: null };
        } catch {
            return { error: "Failed to connect to the server." };
        }
    };

    const signOut = async () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        sessionStorage.removeItem("demo_mode");
        sessionStorage.removeItem("dt_live_results");
        sessionStorage.removeItem("lr_live_results");
        sessionStorage.removeItem("nb_live_results");
        sessionStorage.removeItem("offence_trends_filters");
        setUser(null);
        setIsDemoMode(false);
        return { error: null };
    };

    // Keep demo mode for development/testing
    const enterDemoMode = () => {
        sessionStorage.setItem("demo_mode", "true");
        setIsDemoMode(true);
        setUser({ id: 0, username: "Demo User", role: "viewer" });
    };

    const isAuthenticated = !!user || isDemoMode;

    return (
        <AuthContext.Provider
            value={{
                user,
                session: null,
                loading,
                isAuthenticated,
                isDemoMode,
                signUp,
                signIn,
                adminSignIn,
                signOut,
                enterDemoMode,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
