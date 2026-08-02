import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { ThemeToggleFloat } from "@/components/ThemeToggleFloat";
import { WireButton } from "@/components/wireframe/WireButton";

interface PageLayoutProps {
    children: React.ReactNode;
    code: string;
    title?: string;
    subtitle?: string;
    maxWidth?: string;
    showBackToMenu?: boolean;
    backButtonLabel?: string;
    backButtonPath?: string;
    showHeader?: boolean;
    showFooter?: boolean;
    centered?: boolean;
    headerOverride?: React.ReactNode;
    backgroundImage?: string;
}

export const PageLayout = ({
  children, code, title, subtitle,
  maxWidth = "max-w-5xl",
  showBackToMenu = true,
  backButtonLabel = "Back to Menu",
  backButtonPath = "/guest-menu",
  showHeader = true, showFooter = true,
  centered = false,
  headerOverride,
  backgroundImage,
}: PageLayoutProps) => {
    const navigate = useNavigate();

    if (centered) {
      // When a backgroundImage is given (auth pages), use it as a full-bleed
      // cover with a theme-tinted scrim for legibility; otherwise the grid.
      const bgStyle = backgroundImage
        ? {
            backgroundImage: `linear-gradient(hsl(var(--background) / 0.55), hsl(var(--background) / 0.55)), url(${backgroundImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }
        : undefined;
      return (
          <div
            className={`min-h-screen flex items-center justify-center p-4 ${backgroundImage ? "" : "app-bg"}`}
            style={bgStyle}
          >

            <ThemeToggleFloat />
            {children}
          </div>
      );
    }

    return (
      <div className="min-h-screen app-bg p-4 md:p-6">
        
          {showHeader && (headerOverride || <AppHeader />)}

          <div className={`container mx-auto ${maxWidth} space-y-6`}>
            {title && (
                <div className="text-center space-y-2 pb-2">
                  <h1 className="text-xl font-serif font-bold text-foreground">{title}</h1>
                  {subtitle && <p className="text-sm text-muted-foreground font-body">{subtitle}</p>}
                  <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent mx-auto" />
                </div>
            )}

            {children}

            {showFooter && (
              <div className="panel text-center py-3 bg-gradient-to-r from-olive/5 via-gold/5 to-olive/5 border-olive/20">
                  <span className="text-xs text-muted-foreground font-body">
                    Aggregate data only · CEF 1914-1918 · Source: Statistics Canada
                  </span>
              </div>
            )}
            {showBackToMenu && (
                <div className="flex justify-center pt-2">
                  <WireButton onClick={() => navigate(backButtonPath)}>{backButtonLabel}</WireButton>
                </div>
            )}
          </div>
      </div>
    );
};
