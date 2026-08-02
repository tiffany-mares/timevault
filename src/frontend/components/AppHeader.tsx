import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Menu, X, Moon, Sun } from "lucide-react";
import logo from "@/assets/timevault-logo.png";

interface NavItem {
    label: string;
    path: string;
    matchPaths?: string[];
}

const nav: NavItem[] = [
  { label: "Menu", path: "/guest-menu", matchPaths: ["/guest-menu"] },
  { label: "Offence Trends", path: "/overview", matchPaths: ["/overview", "/courts-martial"] },
  { label: "Compare", path: "/compare", matchPaths: ["/compare", "/compare-results"] },
  { label: "ML Analysis", path: "/advanced", matchPaths: ["/advanced", "/advanced-results", "/analysis-processing", "/analysis-results"] },
  { label: "Dataset Info", path: "/metadata", matchPaths: ["/metadata"] },
  { label: "User Manual", path: "/user-manual" },
];
const userNav: NavItem[] = [
    { label: "Dashboard", path: "/user-dashboard", matchPaths: ["/user-dashboard"] },
];

export const AppHeader = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    const { mode, setMode } = useTheme();
    const [menuOpen, setMenuOpen] = useState(false);
    const headerRef = useRef<HTMLElement>(null);

    useEffect(() => {
      if (!menuOpen) return;
      const handleClickOutside = (e: MouseEvent) => {
        if (headerRef.current && !headerRef.current.contains(e.target as Node))
          setMenuOpen(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuOpen]);

    const isActive = (item: NavItem) => {
      const paths = item.matchPaths || [item.path];
      return paths.includes(location.pathname);
    };
    const toggle = () => {
        setMode(mode === "light" ? "dark" : "light");
    };

    return (
      <header ref={headerRef} className="nav-bar rounded-md px-5 py-3 mb-6 sticky top-4 z-50">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <span
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 hover:scale-105 transition-all duration-200"
                  onClick={() => navigate(isAuthenticated ? "/user-dashboard" : "/guest-menu")}
              >
                  <img src={logo} alt="TimeVault logo" className="w-7 h-7" />
                <span className="font-serif font-bold text-sm text-gold tracking-widest">TIMEVAULT</span>
              </span>

              <nav className="hidden md:flex items-center gap-1">
                  {[...(isAuthenticated ? userNav : []), ...nav].map((item) => (
                    <span
                        key={item.path}
                      className={cn(
                          "text-xs cursor-pointer transition-all duration-200 font-body px-3 py-1.5 rounded-sm",
                        isActive(item)
                              ? "bg-gold/15 text-gold font-medium"
                            : "text-parchment/70 hover:text-parchment hover:bg-parchment/10"
                      )}
                        onClick={() => navigate(item.path)}
                    >
                        {item.label}
                    </span>
                  ))}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <button
                  onClick={toggle}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-body px-2.5 py-1.5 rounded-sm transition-all",
                    "text-parchment/70 hover:text-parchment hover:bg-parchment/10",
                    mode === "dark" && "bg-gold/20 text-gold"
                  )}
                  title={mode === "light" ? "Switch to night mode" : "Switch to light mode"}
              >
                {mode === "dark" ? (
                    <><Sun className="w-3.5 h-3.5" /><span className="hidden sm:inline">Light Mode</span></>
                ) : (
                    <><Moon className="w-3.5 h-3.5" /><span className="hidden sm:inline">Night Mode</span></>
                )}
              </button>
              <button
                className="md:hidden text-parchment/70 hover:text-parchment"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                  {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
        </div>

        {menuOpen && (
            <nav className="md:hidden mt-3 pt-3 border-t border-parchment/10 flex flex-col gap-1">
                {[...(isAuthenticated ? userNav : []), ...nav].map((item) => (
                  <span
                    key={item.path}
                      className={cn(
                        "text-xs cursor-pointer transition-all duration-200 font-body px-3 py-2 rounded-sm",
                      isActive(item)
                            ? "bg-gold/15 text-gold font-medium"
                          : "text-parchment/70 hover:text-parchment hover:bg-parchment/10"
                      )}
                    onClick={() => { navigate(item.path); setMenuOpen(false); }}
                  >
                      {item.label}
                  </span>
                ))}
            </nav>
        )}
      </header>
    );
};
