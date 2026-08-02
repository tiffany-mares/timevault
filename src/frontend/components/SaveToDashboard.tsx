import { useState, useEffect, useRef } from "react";
import { Bookmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface SaveToDashboardProps {
    reportName: string;
    reportType: string;
    parameters?: Record<string, unknown>;
}
export const SaveToDashboard = ({ reportName, reportType }: SaveToDashboardProps) => {
    const { isAuthenticated } = useAuth();
    const { toast } = useToast();
    const [saved, setSaved] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, []);

    if (!isAuthenticated) return null;

    const save = async () => {
      setSaved(true);
      const token = localStorage.getItem("auth_token");
      if (token) {
        try {
          const res = await fetch("/api/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name: reportName, type: reportType }),
          });
          if (!res.ok) {
            setSaved(false);
            toast({ title: "Error", description: "Failed to save report." });
            return;
          }
        } catch {
          setSaved(false);
          toast({ title: "Error", description: "Could not reach the server." });
          return;
        }
      }
      toast({ title: "Saved!", description: "Report added to your dashboard." });
      timerRef.current = setTimeout(() => setSaved(false), 2500);
    };

    return (
      <button
        onClick={save}
        disabled={saved}
        className="flex items-center gap-1.5 text-xs font-body font-medium px-4 py-2 rounded-md border border-olive/40 bg-olive/10 hover:bg-olive/20 text-olive hover:text-olive transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        title="Save to Dashboard"
      >
          <Bookmark className={`w-4 h-4 ${saved ? "fill-olive" : ""}`} />
          {saved ? "Saved!" : "Save to Dashboard"}
      </button>
    );
};
