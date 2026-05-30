import { Lockup } from "../components/Logo";

// Minimal header: wordmark only. No nav, no header CTA — accent discipline
// reserves the accent CTA for the hero and final sections.
export function Header() {
  return (
    <header className="px-5 py-5">
      <div className="mx-auto max-w-content">
        <a href="#top" aria-label="Outgrow Okay — home">
          <Lockup ground="ink" className="h-7" />
        </a>
      </div>
    </header>
  );
}
