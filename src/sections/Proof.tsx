import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";

// S4 — Proof. The numbers ARE the design: 1% → 15% set very large in the mono
// face, accent, tabular-nums. Everything else supports them.
export function Proof() {
  return (
    <Section divider>
      <Reveal>
        <p className="eyebrow">The receipt</p>
        <h2 className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <span className="num text-2xl sm:text-3xl text-accent leading-none">
            1% &rarr; 15%
          </span>
          <span className="font-heading font-bold text-lg text-content">
            net margin. In two years.
          </span>
        </h2>
      </Reveal>
      <Reveal delay={80}>
        <p className="mt-7 max-w-prose text-md text-muted">
          One business &mdash; an automotive ecommerce operation that was, by
          every outside measure, doing fine. We didn&rsquo;t chase more revenue.
          We found where margin was leaking out of the business and we closed the
          gaps, one structural change at a time. Same company.{" "}
          <span className="text-content">Fifteen times the net margin.</span> That&rsquo;s
          the difference between okay and outgrown.
        </p>
      </Reveal>
    </Section>
  );
}
