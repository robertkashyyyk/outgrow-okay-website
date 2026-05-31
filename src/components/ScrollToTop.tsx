import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// React Router preserves scroll position across route changes, which leaves a new
// page scrolled to wherever the previous one was — a long list, or the footer of an
// article. This resets to the top on every pathname change (not on ?query/#hash
// changes), and disables the browser's own scroll restoration so a reload also lands
// at the top rather than wherever the tab last sat.
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
