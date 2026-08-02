import { PageLayout } from "@/components/PageLayout";
import { AdminHeader } from "@/components/AdminHeader";
import { WireBox, WireButton } from "@/components/wireframe";
import { useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import { FileText, Image as ImageIcon, Download, BookOpen, Check, ArrowLeft } from "lucide-react";
import { jsPDF } from "jspdf";
import { getExportPayload, type ExportPayload } from "@/lib/exportStore";
import { HelpFloatMenu } from "@/components/HelpFloatMenu";

const isMLSource = (source: string) =>
  source === "decision_tree" || source === "logistic_regression" || source === "naive_bayes";

const SOURCE_FILENAMES: Record<string, string> = {
  offence_trends: "timevault-offence-trend-analysis",
  compare: "timevault-double-category-comparison",
  decision_tree: "timevault-decision-tree",
  logistic_regression: "timevault-logistic-regression",
  naive_bayes: "timevault-naive-bayes",
};

function getFilename(source: string) {
  return SOURCE_FILENAMES[source] || "timevault-export";
}

function downloadPNG(imageData: string, source: string) {
  const link = document.createElement("a");
  link.href = imageData;
  link.download = `${getFilename(source)}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function pdfSafe(text: string): string {
  return text
    .replace(/\u2264/g, "<=")   // ≤
    .replace(/\u2265/g, ">=")   // ≥
    .replace(/\u00d7/g, "x")    // ×
    .replace(/\u221e/g, "Infinity") // ∞
    .replace(/\u2013/g, "-")    // en dash
    .replace(/\u2014/g, "-")    // em dash
    .replace(/\u2019/g, "'")    // right single quote
    .replace(/\u201c/g, '"')    // left double quote
    .replace(/\u201d/g, '"');   // right double quote
}

async function downloadPDF(data: ExportPayload, source: string) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 20;
  const cw = pw - margin * 2;
  let y = margin;

  const checkPage = (needed: number) => {
      if (y + needed > ph - margin) {
        doc.addPage();
        y = margin;
      }
  };

  // header
  doc.setTextColor(139, 125, 60);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("T I M E V A U L T", margin, y);
  y += 6;
  doc.setDrawColor(212, 201, 138);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pw - margin, y);
  y += 12;

  // title
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(pdfSafe(data.title), cw);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 2;

  if (data.subtitle) {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(pdfSafe(data.subtitle), margin, y);
    y += 7;
  }

  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  const ts = new Date();
  doc.text(
    `Generated: ${ts.toLocaleDateString("en-CA")} ${ts.toLocaleTimeString("en-CA", {hour: "2-digit", minute: "2-digit"})}`,
    margin, y
  );
  y += 12;

  if (data.imageData) {
    try {
        const imgProps = doc.getImageProperties(data.imageData);
        const imgW = cw;
        const imgH = (imgProps.height / imgProps.width) * imgW;
        const fullSliceH = ph - margin * 2 - 10;
        const firstAvail = ph - y - margin - 5;

        if (imgH <= firstAvail) {
          doc.addImage(data.imageData, "PNG", margin, y, imgW, imgH);
          y += imgH + 10;
        } else {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;
          const img = new Image();
          img.src = data.imageData;
          await new Promise<void>((res) => { img.onload = () => res(); if (img.complete) res(); });

          const srcW = imgProps.width;
          const srcH = imgProps.height;
          const pxPerDocUnit = srcH / imgH;
          let srcY = 0;
          let first = true;

          while (srcY < srcH) {
            const availH = first ? firstAvail : fullSliceH;
            const sliceHPx = Math.min(Math.floor(availH * pxPerDocUnit), srcH - srcY);
            const sliceDocH = sliceHPx / pxPerDocUnit;

            canvas.width = srcW;
            canvas.height = sliceHPx;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, srcW, sliceHPx);
            ctx.drawImage(img, 0, srcY, srcW, sliceHPx, 0, 0, srcW, sliceHPx);

            const sliceData = canvas.toDataURL("image/png");

            if (!first) { doc.addPage(); y = margin; }
            doc.addImage(sliceData, "PNG", margin, y, imgW, sliceDocH);
            y += sliceDocH + 5;

            srcY += sliceHPx;
            first = false;
          }
        }
    } catch(e) {
      console.warn("Failed to embed image in PDF:", e);
    }
  }

  // key insights
  checkPage(20);
  doc.setTextColor(107, 124, 58);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("KEY INSIGHTS", margin, y);
  y += 8;

  doc.setTextColor(51, 51, 51);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  data.insights.forEach((insight, i) => {
    const lines = doc.splitTextToSize(`${i+1}.  ${pdfSafe(insight)}`, cw - 5);
    checkPage(lines.length * 5 + 4);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 4;
  });

  // model performance (ML pages only)
  if (data.modelPerformance) {
    y += 8;
    checkPage(40);

    doc.setTextColor(139, 125, 60);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("MODEL PERFORMANCE", margin, y);
    y += 10;

    data.modelPerformance.forEach((m) => {
      checkPage(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(51, 51, 51);
      doc.setFontSize(10);
      const labelText = `${m.label}:  `;
      doc.text(labelText, margin, y);
      const lw = doc.getTextWidth(labelText);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 124, 58);
      doc.text(m.value, margin + lw, y);
      y += 7;
    });
  }

  // footer
  y += 12;
  checkPage(10);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pw - margin, y);
  y += 6;
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(8);
  doc.text("TimeVault - CEF Courts Martial Analysis Platform", margin, y);

  doc.save(`${getFilename(source)}.pdf`);
}


function Export() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const isAdmin = location.pathname === "/admin-export";
    const source = searchParams.get("from") || "";

    const exportData = getExportPayload();
    const mlPage = isMLSource(source);
    const hasData = !!exportData;
    const hasImage = !!exportData?.imageData;

    const handleDownloadPNG = () => {
      if (!exportData?.imageData) return;
      downloadPNG(exportData.imageData, source);
    };

    const handleDownloadPDF = () => {
        if (!exportData) return;
        downloadPDF(exportData, source);
    };

    if (isAdmin) {
        return (
            <PageLayout code="P-21" title="Export" subtitle="Export analysis results from any module as PNG images or formatted PDF reports" showBackToMenu={true} backButtonPath="/admin-dashboard" backButtonLabel="Back to Admin Dashboard" maxWidth="max-w-2xl" headerOverride={<AdminHeader />}>

                <WireBox dashed={false} label="HOW EXPORTS WORK" accent="olive">
                    <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4">
                        Exports are generated from each analysis module's results page. When a user (or admin) completes an analysis, the results page includes an "Export Results" button that captures the current visualization and insights.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="border border-border rounded-sm p-3 text-center">
                            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-br from-olive to-teal flex items-center justify-center shadow-sm">
                                <ImageIcon className="w-4 h-4 text-parchment" />
                            </div>
                            <p className="font-serif font-semibold text-sm">PNG</p>
                            <p className="text-[11px] text-muted-foreground font-body mt-1">High-resolution visualization image, ideal for presentations</p>
                        </div>
                        <div className="border border-border rounded-sm p-3 text-center">
                            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-br from-navy to-slate-blue flex items-center justify-center shadow-sm">
                                <FileText className="w-4 h-4 text-parchment" />
                            </div>
                            <p className="font-serif font-semibold text-sm">PDF</p>
                            <p className="text-[11px] text-muted-foreground font-body mt-1">Full report with visualization, insights, and model metrics</p>
                        </div>
                    </div>
                </WireBox>

                <WireBox dashed={false} label="MODULES WITH EXPORT" accent="teal">
                    <p className="text-xs text-muted-foreground font-body mb-3">Click any module to open it and run an analysis. Exports are available on the results page.</p>
                    <div className="space-y-2">
                        {[
                            { label: "Offence Trends", path: "/overview", desc: "Frequency charts, distribution breakdowns, and trend lines" },
                            { label: "Compare", path: "/compare", desc: "Side-by-side group comparison visualizations" },
                            { label: "ML Analysis - Decision Tree", path: "/advanced", desc: "Tree diagram, feature importance, and classification metrics" },
                            { label: "ML Analysis - Logistic Regression", path: "/advanced", desc: "Coefficient charts and risk factor rankings" },
                            { label: "ML Analysis - Naive Bayes", path: "/advanced", desc: "Pattern discovery heatmaps, lift charts, and probability distributions" },
                        ].map((m) => (
                            <div key={m.label} className="flex items-center justify-between border border-border rounded-sm p-3 cursor-pointer hover:border-olive/50 hover:shadow-sm transition-all duration-200" onClick={() => navigate(m.path)}>
                                <div>
                                    <p className="font-serif font-semibold text-sm">{m.label}</p>
                                    <p className="text-[11px] text-muted-foreground font-body">{m.desc}</p>
                                </div>
                                <Download className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            </div>
                        ))}
                    </div>
                </WireBox>
            </PageLayout>
        );
    }

    const pngIncludes = ["Visualization captured at high resolution"];

    const pdfIncludes = [
      "Visualization embedded in the report",
      "Key insights and pattern findings from the analysis",
    ];
    if (mlPage) {
      pdfIncludes.push("Model performance metrics (precision, recall, accuracy / AUC)");
    }
    pdfIncludes.push("Export timestamp for reproducibility");

    return (
      <PageLayout code="P-10" title="Export Data" subtitle="Download your analysis results as a PNG image or a detailed PDF report" maxWidth="max-w-2xl">
        <div className="flex items-center gap-4 mb-2">
          <Link
            to="/user-manual#um-how-to"
              className="inline-flex items-center gap-1.5 text-xs font-body text-olive hover:text-olive-light hover:bg-olive/10 transition-all duration-200 underline underline-offset-2 rounded-sm px-1 -mx-1 py-0.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
              View in User Manual
          </Link>
        </div>
        <p className="text-sm text-muted-foreground font-body leading-relaxed mb-6">
          Choose how you'd like to save your results. PNG downloads the visualization as an image. PDF generates a formatted report including the visualization, key insights{mlPage ? ", model performance metrics," : ""} and analysis details.
        </p>

            {!hasData && (
                <WireBox dashed={false} accent="gold" className="mb-4">
                    <p className="text-sm text-muted-foreground font-body">
                        Navigate here from an analysis or results page to export your findings. Use the "Export Results" button on any results page.
                    </p>
                </WireBox>
            )}

        <WireBox dashed={false} label="EXPORT FORMAT" accent="olive">
            <div className="grid grid-cols-2 gap-4">
              <div className="panel text-center relative overflow-hidden hover:shadow-lg hover:-translate-y-1 hover:border-olive/40 transition-all duration-200">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-olive to-teal" />
                    <div className="w-12 h-12 mx-auto mb-3 mt-1 rounded-lg bg-gradient-to-br from-olive to-teal flex items-center justify-center shadow-sm">
                      <ImageIcon className="w-5 h-5 text-parchment" />
                    </div>
                    <p className="font-serif font-medium text-sm">Save as PNG</p>
                     <p className="text-xs text-muted-foreground mt-1 mb-4 font-body">
                        Downloads the visualization as a high-resolution image.
                    </p>
                    <WireButton filled accent className="w-full" onClick={handleDownloadPNG} disabled={!hasImage}>
                        <Download className="w-3.5 h-3.5" /> Download PNG
                    </WireButton>
                </div>

                <div className="panel text-center relative overflow-hidden hover:shadow-lg hover:-translate-y-1 hover:border-olive/40 transition-all duration-200">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-navy to-slate-blue" />
                    <div className="w-12 h-12 mx-auto mb-3 mt-1 rounded-lg bg-gradient-to-br from-navy to-slate-blue flex items-center justify-center shadow-sm">
                        <FileText className="w-5 h-5 text-parchment" />
                    </div>
                    <p className="font-serif font-medium text-sm">Save as PDF</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4 font-body">
                        Formatted report with the visualization, key insights{mlPage ? ", and model performance metrics" : ""}. Best for sharing or research.
                    </p>
                    <WireButton filled accent className="w-full" onClick={handleDownloadPDF} disabled={!hasData}>
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </WireButton>
                </div>
            </div>
        </WireBox>

          <WireBox dashed={false} label="WHAT'S INCLUDED" accent="gold">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-body font-semibold uppercase tracking-wide text-olive mb-3">PNG Export</p>
                    <ul className="text-sm text-muted-foreground space-y-2 font-body">
                        {pngIncludes.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <Check className="w-3.5 h-3.5 text-olive mt-0.5 flex-shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <p className="text-xs font-body font-semibold uppercase tracking-wide text-navy mb-3">PDF Export</p>
                    <ul className="text-sm text-muted-foreground space-y-2 font-body">
                      {pdfIncludes.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-navy mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                </div>
            </div>
          </WireBox>
          <div className="flex justify-center mt-6">
            <WireButton onClick={() => navigate(-1)} className="gap-2 text-sm py-2 px-4">
              <ArrowLeft className="w-4 h-4" /> Back
            </WireButton>
          </div>
        <HelpFloatMenu manualSectionId="um-how-to" />
      </PageLayout>
    );
}

export default Export;
