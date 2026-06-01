import { Link } from "react-router-dom";
import { LogIn } from "lucide-react";
import { Lockup } from "../components/Logo";

// Sticky top bar: wordmark left, Portal sign-in right, both aligned to the page's
// content column. The sign-in stays deliberately understated — accent discipline
// reserves the ochre CTA for the hero and final sections, so this is a quiet link.
export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ground">
      <div className="mx-auto flex max-w-content items-center justify-between px-5 py-4">
        <Link to="/" aria-label="Outgrow Okay — home" className="min-w-0">
          <Lockup ground="ink" className="h-7 max-w-full" />
        </Link>
        <Link
          to="/login"
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-line px-4 py-2 text-sm text-muted transition-colors duration-fast hover:border-content hover:text-content"
        >
          <LogIn size={15} strokeWidth={1.5} aria-hidden />
          Sign in
        </Link>
      </div>
    </header>
  );
}
