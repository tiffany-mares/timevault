import { cn } from "@/lib/utils";

interface MarqueeProps {
    items: string[];
    className?: string;
}

/** A seamless horizontal scrolling strip. Renders two copies of the items so
 *  the CSS marquee animation (translateX -50%) loops without a visible seam.
 *  Pauses on hover. Honors prefers-reduced-motion (animation disabled in CSS). */
export const Marquee = ({ items, className }: MarqueeProps) => {
    return (
        <div className={cn("marquee", className)} aria-hidden="true">
            <div className="marquee__track">
                {[...items, ...items].map((item, i) => (
                    <span key={i} className="flex items-center">
                        <span className="mx-5 text-xs font-mono font-medium uppercase tracking-widest text-foreground/75">
                            {item}
                        </span>
                        <span className="text-gold">·</span>
                    </span>
                ))}
            </div>
        </div>
    );
};
