import { useEffect, useRef, useState, type ReactNode } from "react";

// Entrance: opacity 0→1 + translateY(8px)→0, ~200ms ease-out, on first
// intersection. No transform under prefers-reduced-motion (renders visible).

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

const prefersReduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Reveal({ children, className = "", delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(prefersReduced);

  useEffect(() => {
    if (prefersReduced || shown) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(8px)",
        transition: prefersReduced
          ? undefined
          : "opacity 200ms var(--oo-ease-out), transform 200ms var(--oo-ease-out)",
        transitionDelay: shown ? `${delay}ms` : undefined,
      }}
    >
      {children}
    </div>
  );
}
