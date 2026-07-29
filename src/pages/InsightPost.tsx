import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Header } from "../sections/Header";
import { Footer } from "../sections/Footer";
import { Reveal } from "../components/Reveal";
import { useGround } from "../components/useGround";
import { fetchPostBySlug, formatPostDate, type Post } from "../lib/insights";

// The canonical CTA styling (matches components/CTAButton): ink on accent, AA pairing.
const CTA_CLASSES =
  "inline-flex items-center justify-center bg-accent px-6 py-4 " +
  "font-heading font-bold text-base text-ink rounded-md " +
  "transition-transform duration-fast ease-out motion-safe:active:scale-[0.97] " +
  "hover:brightness-105";
const KICKER = "num text-xs uppercase tracking-wide text-accent";
const BOOKING_URL = "https://calendar.app.google/nYF9YE9U84G44dNe8";

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
      <Header />

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
              {/* Title block. With a cover, the image sits behind the title as a
                  full-bleed dim backdrop that bleeds down into the first paragraphs
                  and fades into the ground — the Kashyyyk hero treatment. */}
              <div className="relative">
                {post.cover_image_url && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-[-140px] -z-10 h-[560px] w-screen -translate-x-1/2 overflow-hidden"
                  >
                    <img
                      src={post.cover_image_url}
                      alt=""
                      className="h-full w-full object-cover object-center opacity-40"
                    />
                    {/* Protect the title text at the top, show the image through the
                        middle, and ground out at the bottom so it bleeds into the page. */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to bottom, color-mix(in srgb, var(--oo-ground) 70%, transparent) 0%, color-mix(in srgb, var(--oo-ground) 35%, transparent) 50%, var(--oo-ground) 100%)",
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

              {/* Body renders immediately (no scroll-reveal) — it starts near the
                  fold, and hiding it until intersection reads as a blank page. */}
              <div className="oo-article mt-9">
                <ReactMarkdown>{post.content}</ReactMarkdown>
              </div>

              {/* Unified end-of-post CTA: a low-commitment free workbook + a
                  no-obligation call. Uses the post's own booking link if set,
                  otherwise the default 30-minute link. */}
              <Reveal delay={80}>
                <div className="mt-14 rounded-lg border border-line bg-surface/60 p-6 sm:p-8">
                  <p className={KICKER}>Your move</p>
                  <h2 className="mt-2 font-heading font-black text-xl text-content">
                    If any of this is landing, do something with it.
                  </h2>
                  <p className="mt-3 text-md text-muted">
                    Take the free Bottleneck Workbook — find your one constraint, then send
                    it over and I&rsquo;ll give you an honest read on where to start.
                  </p>
                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <Link to="/workbook" className={CTA_CLASSES}>
                      Take the free workbook
                    </Link>
                    <a
                      href={
                        post.cta_url && !post.cta_url.startsWith("/")
                          ? post.cta_url
                          : BOOKING_URL
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center border border-line bg-ground px-6 py-4 font-heading font-bold text-base text-content rounded-md transition-colors duration-fast hover:border-content"
                    >
                      {post.cta_label && !post.cta_url?.startsWith("/")
                        ? post.cta_label
                        : "Book a 30-minute call"}
                    </a>
                  </div>
                  <p className="mt-4 text-xs text-faint">
                    Both free. No pitch, no obligation — the call goes straight to a calendar,
                    no payment.
                  </p>
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
