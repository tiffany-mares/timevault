import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const AdminRoute = ({ children }: { children: ReactNode }) => {
    const { user, loading } = useAuth();

    // Wait for the token verification on mount before deciding - otherwise a
    // page refresh on /admin-dashboard would bounce a valid admin to login.
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-muted-foreground font-body">Loading...</p>
            </div>
        );
    }

    if (!user || user.role !== "admin") {
        return <Navigate to="/admin-login" replace />;
    }

    return <>{children}</>;
};
