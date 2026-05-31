import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Lockup } from "../components/Logo";
import { Footer } from "../sections/Footer";
import { Reveal } from "../components/Reveal";
import { useGround } from "../components/useGround";
import {
  fetchPublishedPosts,
  formatPostDate,
  type PostSummary,
} from "../lib/insights";

// Insights — the published long-form index. Reads live published posts from the OO
// Supabase project (public-read RLS). When there's nothing live yet it shows a quiet
// "coming soon" state rather than an empty page. Dark ground, accent reserved.
const PAGE_SIZE = 12;

export function Insights() {
  useGround("dark");

  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchPublishedPosts()
      .then(setPosts)
      .catch(() => setError(true));
  }, []);

  const loading = posts === null && !error;
  const empty = posts !== null && posts.length === 0;

  const pageCount = posts ? Math.max(1, Math.ceil(posts.length / PAGE_SIZE)) : 1;
  const pagePosts = useMemo(
    () => (posts ? posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : []),
    [posts, page],
  );

  function goToPage(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-5 py-5">
        <div className="mx-auto max-w-content flex items-center justify-between">
          <Link to="/" aria-label="Outgrow Okay — home">
            <Lockup ground="ink" className="h-7" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
            Home
          </Link>
        </div>
      </header>

      <main className="flex-1 px-5 py-16">
        <div className="mx-auto max-w-content">
          <Reveal>
            <p className="eyebrow">Insights</p>
            <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content max-w-[20ch]">
              Sharp, practical thinking on what actually moves a business.
            </h1>
            <p className="mt-5 max-w-prose text-md text-muted">
              The same lens we bring to client work, applied in the open. No
              filler, no recycled advice.
            </p>
          </Reveal>

          {/* Loading skeleton */}
          {loading && (
            <div className="mt-12 flex flex-col gap-px">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-md bg-surface motion-safe:animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Error / empty — both resolve to the quiet "coming soon" state */}
          {(error || empty) && (
            <p className="mt-12 num text-sm text-faint uppercase tracking-wide">
              Coming soon
            </p>
          )}

          {/* Published posts */}
          {posts && posts.length > 0 && (
            <ul className="mt-12 border-t border-line">
              {pagePosts.map((post, i) => (
                <li key={post.id} className="border-b border-line">
                  <Reveal delay={i * 60}>
                    <Link
                      to={`/insights/${post.slug}`}
                      className="group block py-7 transition-colors duration-fast"
                    >
                      <p className="num text-xs text-faint uppercase tracking-wide">
                        {formatPostDate(post.published_at)}
                      </p>
                      <h2 className="mt-3 font-heading font-bold text-lg text-content max-w-[28ch] group-hover:text-accent transition-colors duration-fast">
                        {post.title}
                      </h2>
                      {(post.subtitle || post.excerpt) && (
                        <p className="mt-3 max-w-prose text-base text-muted">
                          {post.subtitle || post.excerpt}
                        </p>
                      )}
                      <span className="mt-4 inline-flex items-center gap-2 text-sm text-muted group-hover:text-content transition-colors duration-fast">
                        Read
                        <ArrowRight
                          size={15}
                          strokeWidth={1.5}
                          aria-hidden
                          className="transition-transform duration-fast group-hover:translate-x-0.5"
                        />
                      </span>
                    </Link>
                  </Reveal>
                </li>
              ))}
            </ul>
          )}

          {/* Pager */}
          {posts && pageCount > 1 && (
            <nav
              aria-label="Insights pages"
              className="mt-10 flex items-center justify-between gap-4"
            >
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft size={16} strokeWidth={1.5} aria-hidden />
                Newer
              </button>
              <span className="num text-xs text-faint uppercase tracking-wide">
                Page {page} of {pageCount}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === pageCount}
                className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast disabled:opacity-40 disabled:pointer-events-none"
              >
                Older
                <ChevronRight size={16} strokeWidth={1.5} aria-hidden />
              </button>
            </nav>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
