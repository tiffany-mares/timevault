import { cn } from "@/lib/utils";
import { useRef, useEffect, useState, createContext, useContext } from "react";
import { ChevronDown, ChevronRight, ChevronUp, ChevronLeft } from "lucide-react";

export const ExpandedContext = createContext(false);

export interface TreeNode {
  question?: string;
  rate: number;
  samples: number;
  label?: string;
  ratio?: number;
  yes?: TreeNode;
  no?: TreeNode;
}

const LINE = "bg-border dark:bg-muted-foreground/30";

function rateColor(ratio: number | undefined) {
  if (ratio == null) return "text-muted-foreground font-semibold";
  if (ratio >= 2) return "text-rust font-bold";
  if (ratio >= 1.3) return "text-gold font-bold";
  if (ratio <= 0.3) return "text-teal font-bold";
  if (ratio <= 0.7) return "text-olive font-bold";
  return "text-muted-foreground font-semibold"
}

function leafStyle(ratio: number | undefined) {
  if (ratio == null) return "border-border bg-card";
  if (ratio >= 2) return "border-rust/40 bg-rust/10 dark:bg-rust/15";
  if (ratio >= 1.3) return "border-gold/40 bg-gold/10 dark:bg-gold/15";
  if (ratio <= 0.3) return "border-teal/40 bg-teal/10 dark:bg-teal/15";
  if (ratio <= 0.7) return "border-olive/40 bg-olive/10 dark:bg-olive/15";
  return "border-border bg-card"
}

function ratioDescription(ratio: number | undefined): string {
  if (ratio == null) return "";
  if (ratio >= 1.3)
    return `${ratio.toFixed(1)}x more likely than average to be court-martialled`;
  if (ratio <= 0.7)
    return `${(1 / ratio).toFixed(1)}x less likely than average to be court-martialled`;
  return "Similar to average court martial rates";
}

function FitContainer({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    function recalc() {
      inner!.style.transform = "none";

      const containerW = outer!.clientWidth;
      const naturalW = inner!.scrollWidth;
      const naturalH = inner!.scrollHeight;
      if (naturalW <= 0 || containerW <= 0) return;

      const availableH = window.innerHeight - 120;
      const scaleByW = containerW / naturalW;
      const scaleByH = availableH > 0 ? availableH / naturalH : 1;
      const s = Math.max(Math.min(scaleByW, scaleByH, 1), 0.45);
      inner!.style.transform = `scale(${s})`;
      inner!.style.transformOrigin = "top left";
      outer!.style.height = `${Math.ceil(naturalH * s) + 16}px`;
    }

    const timer = setTimeout(recalc, 80);
    const ro = new ResizeObserver(recalc);
    ro.observe(outer);
    return () => { clearTimeout(timer); ro.disconnect() };
  }, [children]);

  return (
    <div ref={outerRef} className="w-full overflow-hidden py-4">
      <div ref={innerRef} className="inline-flex">{children}</div>
    </div>
  );
}

function NodeTooltip({ node, isLeaf }: { node: TreeNode; isLeaf: boolean }) {
  if (isLeaf) {
    const riskLevel = node.ratio == null ? "Average" : node.ratio >= 2 ? "High risk" : node.ratio >= 1.3 ? "Elevated risk" : node.ratio <= 0.3 ? "Very low risk" : node.ratio <= 0.7 ? "Below average" : "Near average";
    return (
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-4 py-2.5 bg-foreground text-background rounded-md opacity-0 group-hover/node:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg whitespace-nowrap text-xs">
        <p className="font-semibold mb-1">{riskLevel}</p>
        <p>Court martial rate: <span className="font-mono">{node.rate}%</span></p>
        <p>Sample size: <span className="font-mono">{node.samples.toLocaleString()}</span> soldiers</p>
        {node.ratio != null && <p>vs baseline: <span className="font-mono">{node.ratio.toFixed(1)}x</span></p>}
      </div>
    );
  }
  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-4 py-2.5 bg-foreground text-background rounded-md opacity-0 group-hover/node:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg whitespace-nowrap text-xs">
      <p className="font-semibold mb-1">{node.question}</p>
      <p>Soldiers at this split: <span className="font-mono">{node.samples.toLocaleString()}</span></p>
      <p>Court martial rate: <span className="font-mono">{node.rate}%</span></p>
      <p className="text-background/60 mt-1 italic">Click to expand/collapse</p>
    </div>
  );
}

function VNode({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const isLeaf = !node.question;
  const [open, setOpen] = useState(depth < 1);

  return (
    <div className="flex flex-col items-center">
      <div
        onClick={isLeaf ? undefined : () => setOpen(o => !o)}
        className={cn(
          "group/node relative rounded-[20px] px-5 py-3.5 text-center shadow-sm border-2 transition-all min-w-[140px] max-w-[210px]",
          depth === 0 ? "bg-amber-100/60 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-700/40 text-foreground"
            : isLeaf ? cn("text-foreground", leafStyle(node.ratio))
            : "bg-stone-100/70 dark:bg-stone-800/30 text-foreground border-stone-300/60 dark:border-stone-600/40",
          !isLeaf && "cursor-pointer hover:shadow-md",
        )}
      >
        <NodeTooltip node={node} isLeaf={isLeaf} />
        {node.question ? (
          <div className="flex flex-col items-center gap-1">
            <p className="text-[11px] font-semibold leading-snug">{node.question}</p>
            {open ? <ChevronUp className="w-3.5 h-3.5 opacity-50" />
                   : <ChevronDown className="w-3.5 h-3.5 opacity-50" />}
          </div>
        ) : (<>
            <p className={cn("text-sm font-mono", rateColor(node.ratio))}>{node.rate}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{node.samples.toLocaleString()} soldiers</p>
            <p className={cn("text-[9px] mt-1 leading-tight italic", rateColor(node.ratio))}>{ratioDescription(node.ratio)}</p>
        </>)}
      </div>

      {!isLeaf && node.yes && node.no && open && (<>
          <div className={cn("w-px h-5", LINE)} />
          <div className="flex">
            <div className="flex flex-col items-center relative px-3 pt-0">
              <div className={cn("absolute top-0 left-1/2 right-0 h-px", LINE)} />
              <div className="flex flex-col items-center">
                <div className={cn("w-px h-3", LINE)} />
                <div className="w-7 h-7 rounded-full bg-card border-2 border-olive dark:border-olive-light flex items-center justify-center shadow-sm z-10">
                  <span className="text-[9px] font-bold text-olive dark:text-olive-light">Yes</span>
                </div>
                <div className={cn("w-px h-3", LINE)} />
              </div>
              <VNode node={node.yes} depth={depth+1} />
            </div>
            <div className="flex flex-col items-center relative px-3 pt-0">
              <div className={cn("absolute top-0 left-0 right-1/2 h-px", LINE)} />
              <div className="flex flex-col items-center">
                <div className={cn("w-px h-3", LINE)} />
                <div className="w-7 h-7 rounded-full bg-card border-2 border-rust flex items-center justify-center shadow-sm z-10">
                  <span className="text-[9px] font-bold text-rust">No</span>
                </div>
                <div className={cn("w-px h-3", LINE)} />
              </div>
              <VNode node={node.no} depth={depth+1} />
            </div>
          </div>
      </>)}
    </div>
  );
}

export function VerticalTree({ root }: { root: TreeNode }) {
  return <div className="overflow-auto py-6 px-2">
    <div className="inline-flex justify-center min-w-full">
      <VNode node={root} />
    </div>
  </div>
}

function HNode({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const isLeaf = !node.question
  const [open, setOpen] = useState(depth < 1)

  return (
    <div className="flex items-center">
      <div
        onClick={isLeaf ? undefined : () => setOpen(o => !o)}
        className={cn(
          "group/node relative rounded-[20px] px-5 py-3.5 text-center shadow-sm border-2 transition-all min-w-[140px] max-w-[210px] flex-shrink-0",
          depth === 0 ? "bg-amber-100/60 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-700/40 text-foreground"
            : isLeaf ? cn("text-foreground", leafStyle(node.ratio))
            : "bg-stone-100/70 dark:bg-stone-800/30 text-foreground border-stone-300/60 dark:border-stone-600/40",
          !isLeaf && "cursor-pointer hover:shadow-md",
        )}>
        <NodeTooltip node={node} isLeaf={isLeaf} />
        {node.question ? (
          <div className="flex flex-col items-center gap-1">
            <p className="text-[11px] font-semibold leading-snug">{node.question}</p>
            {open ? <ChevronLeft className="w-3.5 h-3.5 opacity-50"/>
                   : <ChevronRight className="w-3.5 h-3.5 opacity-50"/>}
          </div>
        ) : (<>
          <p className={cn("text-sm font-mono", rateColor(node.ratio))}>{node.rate}%</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{node.samples.toLocaleString()} soldiers</p>
          <p className={cn("text-[9px] mt-1 leading-tight italic", rateColor(node.ratio))}>{ratioDescription(node.ratio)}</p>
        </>)}
      </div>

      {!isLeaf && node.yes && node.no && open && (<>
        <div className={cn("h-px w-5 flex-shrink-0", LINE)} />
        <div className="flex flex-col gap-3 border-l-2 border-border dark:border-muted-foreground/30">
          <div className="flex items-center">
            <div className={cn("h-px w-3 flex-shrink-0", LINE)} />
            <div className="w-7 h-7 rounded-full bg-card border-2 border-olive dark:border-olive-light flex items-center justify-center shadow-sm flex-shrink-0">
              <span className="text-[9px] font-bold text-olive dark:text-olive-light">Yes</span>
            </div>
            <div className={cn("h-px w-3 flex-shrink-0", LINE)} />
            <HNode node={node.yes} depth={depth+1} />
          </div>
          <div className="flex items-center">
            <div className={cn("h-px w-3 flex-shrink-0", LINE)} />
            <div className="w-7 h-7 rounded-full bg-card border-2 border-rust flex items-center justify-center shadow-sm flex-shrink-0">
              <span className="text-[9px] font-bold text-rust">No</span>
            </div>
            <div className={cn("h-px w-3 flex-shrink-0", LINE)} />
            <HNode node={node.no} depth={depth+1} />
          </div>
        </div>
      </>)}
    </div>
  )
}

export function HorizontalTree({ root }: { root: TreeNode }) {
  return <div className="overflow-auto py-6 px-2">
    <div className="inline-flex min-w-full">
      <HNode node={root} />
    </div>
  </div>
}
