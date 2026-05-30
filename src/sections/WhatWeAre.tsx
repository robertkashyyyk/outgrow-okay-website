import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";

// S3 — What we actually are. Statement block, large type, the
// contrast between "what they do" and "what we do".
export function WhatWeAre() {
  return (
    <Section container="prose" divider>
      <Reveal>
        <h2 className="font-heading font-black text-xl sm:text-2xl text-content">
          We&rsquo;re not consultants.
        </h2>
      </Reveal>
      <Reveal delay={60}>
        <p className="mt-6 max-w-prose text-md text-muted">
          Consultants hand you a deck and leave. We find what&rsquo;s holding you
          back, and then we stay &mdash; changing it with you, on an ongoing
          basis, until it&rsquo;s fixed and staying fixed.{" "}
          <span className="text-content">
            No projects. No &ldquo;phase one of four.&rdquo; We&rsquo;re in it with
            you, or we&rsquo;re not in it at all.
          </span>
        </p>
      </Reveal>
    </Section>
  );
}
