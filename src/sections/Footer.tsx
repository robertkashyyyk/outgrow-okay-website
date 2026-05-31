import { Link } from "react-router-dom";

// Footer. Minimal. Legal line small and grey.
export function Footer() {
  return (
    <footer className="px-5 py-8 border-t border-line">
      <div className="mx-auto max-w-content flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-faint">
        <span>Outgrow Okay &mdash; a trading name of Kashyyyk Ltd.</span>
        <span aria-hidden>·</span>
        <a href="#" className="hover:text-content transition-colors duration-fast">
          LinkedIn
        </a>
        <span aria-hidden>·</span>
        <Link
          to="/privacy"
          className="hover:text-content transition-colors duration-fast"
        >
          Privacy
        </Link>
        <span aria-hidden>·</span>
        <a href="#" className="hover:text-content transition-colors duration-fast">
          Contact
        </a>
        <span aria-hidden>·</span>
        <Link
          to="/insights"
          className="hover:text-content transition-colors duration-fast"
        >
          Insights
        </Link>
      </div>
    </footer>
  );
}
