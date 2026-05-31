import { CTAButton } from "../components/CTAButton";
import { Reveal } from "../components/Reveal";

// S1 — Hero. Full-height-ish dark hero, H1 dominant, one accent CTA.
// No image: typography is the hero.
export function Hero() {
  return (
    <section
      id="top"
      className="px-5 min-h-[82vh] flex flex-col justify-center py-9"
    >
      <div className="mx-auto max-w-content w-full">
        <Reveal>
          <h1 className="font-heading font-black text-xl sm:text-2xl lg:text-3xl text-content max-w-[16ch]">
            Your business is doing okay. That&rsquo;s the problem.
          </h1>
        </Reveal>
        <Reveal delay={60}>
          <p className="mt-6 max-w-prose text-md text-muted">
            You built something that works. It&rsquo;s profitable, it&rsquo;s
            steady &mdash; and it&rsquo;s quietly stopped getting better. We find
            what&rsquo;s holding it back, and we change it. Based on your numbers,
            not guesswork.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <div className="mt-8">
            <CTAButton />
            <p className="mt-4 max-w-prose text-sm text-faint">
              A straight conversation about where your business actually is. If
              we&rsquo;re not a fit, we&rsquo;ll say so.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
