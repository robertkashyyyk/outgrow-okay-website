import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";

// S4 — Proof. One banked hero result (1% → 15%, the large accent mono figure),
// then a quieter band of three in-flight results across different sectors. Accent
// stays ≤5% — only the figures are accent; sector labels are grey/mono uppercase.
// Tense is deliberate: automotive = banked/past; the three = present or "built to /
// positioning to". Do not tidy the three into past tense.
const strips = [
  {
    figure: "120 hrs / month",
    label: "Short-term rentals · Ongoing",
    body: (
      <>
        A three-person property business running on memory and manual
        coordination. We mapped the operation and built the system to run it
        &mdash; handing the team back{" "}
        <span className="text-content">120 hours a month</span>. For a business
        that size, that&rsquo;s a whole extra person, freed to grow instead of
        firefight.
      </>
    ),
  },
  {
    figure: "~£70k / year",
    label: "Membership body · Ongoing",
    body: (
      <>
        A sporting governing body buried in manual membership admin. We found
        what was blocking them and rebuilt the process around it &mdash; work
        built to unlock{" "}
        <span className="text-content">
          member status and the ~£70k a year in funding
        </span>{" "}
        that comes with it.
      </>
    ),
  },
  {
    figure: "~£500k",
    label: "Calibration · Ongoing",
    body: (
      <>
        A calibration business that couldn&rsquo;t credibly chase the contracts
        it was capable of. We&rsquo;re fixing the constraint in the way of it
        &mdash; positioning them to compete for{" "}
        <span className="text-content">~£500k in contracts</span> that were out
        of reach before.
      </>
    ),
  },
];

export function Proof() {
  return (
    <Section divider>
      {/* Hero — the banked receipt (unchanged) */}
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

      {/* Framing line — does the de-pigeonholing work above the three strips */}
      <Reveal delay={120}>
        <h3 className="mt-14 font-heading font-bold text-lg text-content max-w-[28ch]">
          Different businesses. Same question: what&rsquo;s the one thing holding
          this back?
        </h3>
        <p className="mt-4 max-w-prose text-base text-muted">
          Margin is one answer. Sometimes it&rsquo;s wasted time, blocked funding,
          or work you can&rsquo;t yet win. We find it, then we deal with it.
        </p>
      </Reveal>

      {/* Three in-flight results — uniform, quieter than the hero */}
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        {strips.map((s, i) => (
          <Reveal key={s.figure} delay={160 + i * 70}>
            <div className="border-t border-line pt-5">
              {/* Reserve two lines for the figure so the label + body areas
                  anchor to the same baseline across all three columns, even
                  when one figure wraps and the others don't. */}
              <p className="num text-xl text-accent leading-tight min-h-[2.5em] flex items-start">
                {s.figure}
              </p>
              <p className="eyebrow mt-3">{s.label}</p>
              <p className="mt-3 text-base text-muted">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
