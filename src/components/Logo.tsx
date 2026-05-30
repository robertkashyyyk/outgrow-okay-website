// Brand marks. Always rendered from the SVG source in /public/brand —
// never recoloured, never with the O's equalised. Pick the variant whose
// baked-in ground matches the surface ("ink" on dark, "bone" on light).

type Ground = "ink" | "bone";

interface MarkProps {
  ground?: Ground;
  className?: string;
}

/** Monogram + divider + OUTGROW OKAY wordmark. */
export function Lockup({ ground = "ink", className = "h-8" }: MarkProps) {
  return (
    <img
      src={`/brand/lockup-on-${ground}.svg`}
      alt="Outgrow Okay"
      className={className}
      draggable={false}
    />
  );
}

/** OUTGROW OKAY wordmark, no monogram. */
export function Wordmark({ ground = "ink", className = "h-8" }: MarkProps) {
  return (
    <img
      src={`/brand/wordmark-on-${ground}.svg`}
      alt="Outgrow Okay"
      className={className}
      draggable={false}
    />
  );
}

/** OO monogram only. */
export function Monogram({ ground = "ink", className = "h-8" }: MarkProps) {
  return (
    <img
      src={`/brand/oo-monogram-on-${ground}.svg`}
      alt="Outgrow Okay monogram"
      className={className}
      draggable={false}
    />
  );
}
