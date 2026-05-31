import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Lockup } from "../components/Logo";
import { Footer } from "../sections/Footer";
import { Reveal } from "../components/Reveal";
import { useGround } from "../components/useGround";
import { fetchPostBySlug, formatPostDate, type Post } from "../lib/insights";

// Single Insight article. Reads one live published post by slug (public-read RLS).
// Body is markdown, rendered into the token-styled .oo-article wrapper. If the slug
// isn't a live post, shows a not-found state rather than a blank page.
export function InsightPost() {
  useGround("dark");
  const { slug } = useParams<{ slug: string }>();

  const [post, setPost] = useState<Post | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound">("loading");

  useEffect(() => {
    if (!slug) return;
    let active = true;
    fetchPostBySlug(slug)
      .then((p) => {
        if (!active) return;
        if (p) {
          setPost(p);
          setState("ready");
          document.title = `${p.title} — Outgrow Okay`;
        } else {
          setState("notfound");
        }
      })
      .catch(() => active && setState("notfound"));
    return () => {
      active = false;
      document.title = "Outgrow Okay";
    };
  }, [slug]);

  // A missing slug can't resolve to a post — treat it as not found at render time
  // (avoids a synchronous setState inside the effect).
  const resolved = !slug ? "notfound" : state;

  const BackLink = (
    <Link
      to="/insights"
      className="inline-flex items-center gap-2 text-sm text-muted hover:text-content transition-colors duration-fast"
    >
      <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
      Insights
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-5 py-5">
        <div className="mx-auto max-w-content flex items-center justify-between">
          <Link to="/" aria-label="Outgrow Okay — home">
            <Lockup ground="ink" className="h-7" />
          </Link>
          {BackLink}
        </div>
      </header>

      <main className="flex-1 px-5 py-12">
        <div className="mx-auto max-w-prose">
          {resolved === "loading" && (
            <div className="flex flex-col gap-4">
              <div className="h-4 w-32 rounded-sm bg-surface motion-safe:animate-pulse" />
              <div className="h-10 w-full rounded-md bg-surface motion-safe:animate-pulse" />
              <div className="mt-6 h-64 w-full rounded-md bg-surface motion-safe:animate-pulse" />
            </div>
          )}

          {resolved === "notfound" && (
            <div>
              <p className="eyebrow">Not found</p>
              <h1 className="mt-4 font-heading font-black text-xl text-content">
                This insight isn&rsquo;t available.
              </h1>
              <p className="mt-5 text-md text-muted">
                It may have moved, or not be published yet.
              </p>
              <div className="mt-8">{BackLink}</div>
            </div>
          )}

          {resolved === "ready" && post && (
            <article>
              {/* Title block. With a cover, the image sits behind it at low opacity
                  and fades into the ground — the Kashyyyk hero treatment. */}
              <div className="relative">
                {post.cover_image_url && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 -top-12 bottom-0 -z-10 overflow-hidden"
                  >
                    <img
                      src={post.cover_image_url}
                      alt=""
                      className="h-full w-full object-cover opacity-[0.22]"
                    />
                    {/* Fade the image into the page ground on all edges. */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to bottom, color-mix(in srgb, var(--oo-ground) 60%, transparent) 0%, color-mix(in srgb, var(--oo-ground) 20%, transparent) 40%, var(--oo-ground) 100%)",
                      }}
                    />
                  </div>
                )}

                <Reveal>
                  <p className="num text-xs text-faint uppercase tracking-wide">
                    {formatPostDate(post.published_at)}
                  </p>
                  <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
                    {post.title}
                  </h1>
                  {post.subtitle && (
                    <p className="mt-5 max-w-prose text-md text-muted">
                      {post.subtitle}
                    </p>
                  )}
                  {post.tags.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="eyebrow rounded-sm border border-line px-2 py-1 text-faint"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Reveal>
              </div>

              <Reveal delay={80}>
                <div className="oo-article mt-9">
                  <ReactMarkdown>{post.content}</ReactMarkdown>
                </div>
              </Reveal>

              <div className="mt-12 border-t border-line pt-8">{BackLink}</div>
            </article>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
