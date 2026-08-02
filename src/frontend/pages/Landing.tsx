import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { WireButton } from "@/components/wireframe";
import { PageLayout } from "@/components/PageLayout";
import logo from "@/assets/timevault-logo.png";

export default function Landing() {
    const navigate = useNavigate();
    const { signOut } = useAuth();

    const guest = async () => {
      await signOut();
      navigate("/guest-menu");
    };

    return (
      <PageLayout code="P-01" centered showBackToMenu={false} showHeader={false} showFooter={false}>
        <div className="w-full max-w-md text-center">
            <div className="h-1.5 bg-gradient-to-r from-olive via-gold to-rust rounded-t-md" />

            <div className="panel rounded-t-none py-14 px-10 shadow-xl border-t-0">
              <img src={logo} alt="TimeVault Technologies logo" className="w-20 h-20 mx-auto mb-5" />
              <h1 className="text-2xl font-serif font-bold tracking-wide mb-2 text-navy">TimeVault Technologies</h1>
              <p className="text-sm text-gold font-body font-medium mb-2">
                  CEF Disciplinary Records Explorer
              </p>
              <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent mx-auto mb-4" />
              <p className="text-sm text-muted-foreground font-body mb-10 leading-relaxed">
                Explore aggregate courts martial and service record patterns from the World War 1 Canadian Expeditionary Force (1914-1918).
              </p>

              <div className="flex flex-col gap-3">
                <WireButton filled accent className="w-full py-3" onClick={guest}>
                    Continue as Guest
                </WireButton>
                <WireButton className="w-full py-3" onClick={() => navigate("/user-login")}>
                  Sign In
                </WireButton>
                <WireButton className="w-full py-3 text-muted-foreground" onClick={() => navigate("/admin-login")}>
                  Admin Login
                </WireButton>
              </div>
            </div>
        </div>
      </PageLayout>
    );
}
