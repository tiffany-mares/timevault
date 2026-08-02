import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

function ScrollToHash() {
  const { pathname, hash } = useLocation();
    useEffect(() => {
      if (hash) {
          setTimeout(() => {
            const el = document.getElementById(hash.slice(1));
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        } else {
          window.scrollTo(0, 0);
      }
    }, [pathname, hash]);
  return null;
}

import Landing from "./pages/Landing";
import GuestMenu from "./pages/GuestMenu";
import CourtsMartialAnalysis from "./pages/CourtsMartialAnalysis";
import Compare from "./pages/Compare";
import CompareResults from "./pages/CompareResults";
import Advanced from "./pages/Advanced";
import AdvancedResults from "./pages/AdvancedResults";
import AnalysisProcessing from "./pages/AnalysisProcessing";
import AnalysisResults from "./pages/AnalysisResults";
import Metadata from "./pages/Metadata";
import Export from "./pages/Export";
import UserManual from "./pages/UserManual";
import UserLogin from "./pages/UserLogin";
import Register from "./pages/Register";
import UserDashboard from "./pages/UserDashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogs from "./pages/AdminLogs";
import NotFound from "./pages/NotFound";

function App() {
    return (
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <BrowserRouter>
                <ScrollToHash />
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/guest-menu" element={<GuestMenu />} />
                  <Route path="/overview" element={<CourtsMartialAnalysis />} />
                  <Route path="/compare" element={<Compare />} />
                  <Route path="/compare-results" element={<CompareResults />} />
                  <Route path="/advanced" element={<Advanced />} />
                  <Route path="/advanced-results" element={<AdvancedResults />} />
                  <Route path="/courts-martial" element={<CourtsMartialAnalysis />} />
                  <Route path="/user-manual" element={<UserManual />} />
                  <Route path="/analysis-processing" element={<AnalysisProcessing />} />
                  <Route path="/analysis-results" element={<AnalysisResults />} />
                  <Route path="/metadata" element={<Metadata />} />
                  <Route path="/export" element={<Export />} />
                  <Route path="/user-login" element={<UserLogin />} />
                  <Route path="/user-dashboard" element={<UserDashboard />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/admin-login" element={<AdminLogin />} />
                  <Route path="/admin-dashboard" element={<AdminDashboard />} />
                  <Route path="/admin-logs" element={<AdminLogs />} />
                  <Route path="/admin-export" element={<Export />} />
                  <Route path="/admin-metadata" element={<Metadata />} />
                  <Route path="/dashboard" element={<GuestMenu />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
