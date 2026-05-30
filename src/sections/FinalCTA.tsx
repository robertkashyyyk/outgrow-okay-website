import { CTAButton } from "../components/CTAButton";
import { Reveal } from "../components/Reveal";

// S8 — Final CTA. The page's strongest provocation. Dark, focused, single
// accent CTA. Give it room.
export function FinalCTA() {
  return (
    <section id="book" className="px-5 py-10 border-t border-line">
      <div className="mx-auto max-w-content">
        <Reveal>
          <h2 className="font-heading font-black text-xl sm:text-2xl text-content max-w-[20ch]">
            If you&rsquo;re willing to change how you run things, let&rsquo;s talk.
          </h2>
        </Reveal>
        <Reveal delay={60}>
          <p className="mt-6 max-w-prose text-md text-muted">
            And if you&rsquo;re not &mdash; genuinely, no hard feelings &mdash;
            we&rsquo;re not for you. The owners who get the most out of us are the
            ones who came ready to do something different.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <div className="mt-8">
            <CTAButton />
            <p className="mt-4 text-sm text-faint">Stop coasting.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
