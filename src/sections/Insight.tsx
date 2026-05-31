import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";

// S2 — The insight. Earn the hook with substance. Single column, generous
// whitespace, comfortable measure. No graphics.
export function Insight() {
  return (
    <Section container="prose" divider>
      <Reveal>
        <h2 className="font-heading font-bold text-lg sm:text-xl text-content max-w-[18ch]">
          Comfortable is where good businesses stall.
        </h2>
      </Reveal>
      <Reveal delay={60}>
        <div className="mt-6 space-y-5 text-md text-muted">
          <p>
            Most plateaued businesses aren&rsquo;t held back by ten things.
            They&rsquo;re held back by one. A pricing model that&rsquo;s quietly
            leaking margin. A lead process that lives on a notepad. A cost
            nobody&rsquo;s questioned in three years. You can&rsquo;t see it
            because you&rsquo;re inside it every day &mdash; and &ldquo;doing
            okay&rdquo; is exactly comfortable enough to stop you looking.
          </p>
          <p className="text-content">We find what matters most. Then we deal with it.</p>
        </div>
      </Reveal>
    </Section>
  );
}
