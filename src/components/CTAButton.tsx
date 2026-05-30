import { Link } from "react-router-dom";

// The one canonical CTA. Ink text on accent ground (AA pairing, ~5.29:1).
// Never white-on-accent. Press feedback is scale(0.97), motion-safe only.
// Internal routes ("/book") use the router Link; hash/external use a plain anchor.

interface CTAButtonProps {
  href?: string;
  className?: string;
}

const CLASSES =
  "inline-flex items-center justify-center bg-accent px-6 py-4 " +
  "font-heading font-bold text-base text-ink rounded-md " +
  "transition-transform duration-fast ease-out " +
  "motion-safe:active:scale-[0.97] " +
  "hover:brightness-105 ";

export function CTAButton({ href = "/book", className = "" }: CTAButtonProps) {
  const label = "Book a discovery call";
  const isInternal = href.startsWith("/");

  if (isInternal) {
    return (
      <Link to={href} className={CLASSES + className}>
        {label}
      </Link>
    );
  }

  return (
    <a href={href} className={CLASSES + className}>
      {label}
    </a>
  );
}
