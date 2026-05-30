import type { ReactNode } from "react";

interface SectionProps {
  id?: string;
  children: ReactNode;
  container?: "prose" | "content";
  divider?: boolean;
  className?: string;
}

export function Section({
  id,
  children,
  container = "content",
  divider = false,
  className = "",
}: SectionProps) {
  return (
    <section
      id={id}
      className={
        "px-5 py-9 sm:py-10 " +
        (divider ? "border-t border-line " : "") +
        className
      }
    >
      <div
        className={
          "mx-auto " + (container === "prose" ? "max-w-prose" : "max-w-content")
        }
      >
        {children}
      </div>
    </section>
  );
}
