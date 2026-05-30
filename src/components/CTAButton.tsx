// The one canonical CTA. Ink text on accent ground (AA pairing, ~5.29:1).
// Never white-on-accent. Press feedback is scale(0.97), motion-safe only.

interface CTAButtonProps {
  href?: string;
  className?: string;
}

export function CTAButton({ href = "#book", className = "" }: CTAButtonProps) {
  return (
    <a
      href={href}
      className={
        "inline-flex items-center justify-center bg-accent px-6 py-4 " +
        "font-heading font-bold text-base text-ink rounded-md " +
        "transition-transform duration-fast ease-out " +
        "motion-safe:active:scale-[0.97] " +
        "hover:brightness-105 " +
        className
      }
    >
      Book a discovery call
    </a>
  );
}
