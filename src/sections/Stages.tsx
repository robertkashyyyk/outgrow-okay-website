import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";

const stages = [
  {
    price: "£995",
    name: "Find it.",
    body: "Where most start. The first month is the diagnosis: we find the one thing holding you back.",
  },
  {
    price: "£1,995",
    name: "Change it.",
    body: "You're in the structural work — building the systems that move the number.",
  },
  {
    price: "£3,995",
    name: "Move hard.",
    body: "More of our time, more moving parts, for businesses that want to change fast.",
  },
];

// S7 — The stages (pricing). Three stages, NOT a comparison grid. No "most
// popular" badge. Prices in mono, accent, tabular-nums. Founder recommends
// the stage; the client doesn't self-select.
export function Stages() {
  return (
    <Section divider>
      <Reveal>
        <h2 className="font-heading font-bold text-lg sm:text-xl text-content max-w-[20ch]">
          Three stages. We&rsquo;ll tell you which one you&rsquo;re at.
        </h2>
        <p className="mt-5 max-w-prose text-md text-muted">
          Every business comes in at a different point. After the discovery call
          we&rsquo;ll recommend the stage that fits where you actually are &mdash;
          not the one you&rsquo;d pick off a menu.
        </p>
      </Reveal>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {stages.map((s, i) => (
          <Reveal key={s.name} delay={i * 70}>
            <div className="h-full border border-line rounded-lg p-6">
              <p className="num text-lg text-accent leading-none">{s.price}</p>
              <p className="num mt-2 text-sm text-faint">/ month + VAT</p>
              <h3 className="mt-5 font-heading font-bold text-md text-content">
                {s.name}
              </h3>
              <p className="mt-3 text-base text-muted">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delay={120}>
        <p className="mt-6 text-sm text-faint">
          All retainers, not projects. The first month of any stage is the
          diagnosis.
        </p>
      </Reveal>
    </Section>
  );
}
