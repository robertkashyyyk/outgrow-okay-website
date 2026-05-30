import { Check, X } from "lucide-react";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";

// S6 — Who this is for (and who it isn't). The filter. Two honest lists.
// Check / X carry inclusion / exclusion meaning — not decorative.
export function WhoFor() {
  return (
    <Section divider>
      <Reveal>
        <h2 className="font-heading font-bold text-lg sm:text-xl text-content max-w-[22ch]">
          This works if you&rsquo;re willing to change how you run things.
        </h2>
      </Reveal>
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <Reveal>
          <div className="border-t border-line pt-5">
            <h3 className="flex items-center gap-3 font-heading font-bold text-md text-content">
              <Check size={20} strokeWidth={1.5} aria-hidden className="text-content" />
              This is for you if
            </h3>
            <p className="mt-3 text-base text-muted">
              You&rsquo;ve built something profitable, it&rsquo;s plateaued,
              you&rsquo;ve got real numbers to look at &mdash; and you&rsquo;re
              genuinely willing to change how the business operates.
            </p>
          </div>
        </Reveal>
        <Reveal delay={70}>
          <div className="border-t border-line pt-5">
            <h3 className="flex items-center gap-3 font-heading font-bold text-md text-content">
              <X size={20} strokeWidth={1.5} aria-hidden className="text-faint" />
              This isn&rsquo;t us if
            </h3>
            <p className="mt-3 text-base text-muted">
              You&rsquo;re pre-revenue, you&rsquo;re in a genuine crisis
              (that&rsquo;s turnaround &mdash; a different job), you want a quick
              fix or a motivational hit, or you&rsquo;d rather not put your actual
              numbers on the table.
            </p>
          </div>
        </Reveal>
      </div>
      <Reveal delay={120}>
        <p className="mt-8 max-w-prose text-md text-muted">
          We only work with owners who are ready to change something. If
          that&rsquo;s not you, we&rsquo;re not the right people &mdash; and
          we&rsquo;ll tell you that on the call rather than take your money.
        </p>
      </Reveal>
    </Section>
  );
}
