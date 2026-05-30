import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";

const steps = [
  {
    n: "01",
    title: "A straight conversation.",
    body: "We talk about where your business actually is. No pitch. By the end, we both know whether there's something here.",
  },
  {
    n: "02",
    title: "Month one is the diagnosis.",
    body: "We get into your real numbers and find the single thing holding you back. Not a hunch — evidence, from your own books.",
  },
  {
    n: "03",
    title: "We change it, and we stay.",
    body: "On an ongoing retainer, we make the structural changes and keep them holding. We don't leave when the slide deck ends, because there is no slide deck.",
  },
];

// S5 — How it works. Three numbered steps. Numbers in mono (not accent).
export function HowItWorks() {
  return (
    <Section divider>
      <Reveal>
        <h2 className="font-heading font-bold text-lg sm:text-xl text-content">
          How it works
        </h2>
      </Reveal>
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 70}>
            <div className="border-t border-line pt-5">
              <span className="num block text-lg text-faint">{s.n}</span>
              <h3 className="mt-3 font-heading font-bold text-md text-content">
                {s.title}
              </h3>
              <p className="mt-3 text-base text-muted">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
