// The operational-review "kit" a prospect runs in their own AI. Shown on the
// instructions state and the return page, and offered as a Markdown download. The two
// prompts are the Version-2 (external) prompts, verbatim — do not paraphrase.

export const REVIEW_STEPS: string[] = [
  "Open whatever AI you already use and are comfortable with — ChatGPT, Claude, Gemini, Copilot. Any of them work.",
  "Paste in Prompt 1 (the interview) and fill in the one bracketed line about your business. Answer its questions honestly, one at a time.",
  "When it tells you you're done, paste in Prompt 2 (the report). It writes your operational review — no more questions.",
  "Copy the finished report — the text itself, not a link to a Google Doc.",
  "Come back via your personal link and paste it in. I'll read it properly and come back with where I'd focus first.",
];

export const PROMPT_INTERVIEW = `You are a sharp, friendly operations consultant interviewing me about my business. Your goal is to understand how my business actually runs day to day and to find where time, money, and effort are being lost — the bottlenecks, the repetitive manual work, the things that break, and the things holding growth back.

About my business: [WRITE: what the business does, roughly how many staff, and anything you think matters].

Interview me like a curious, experienced consultant who genuinely wants to understand my operation. Rules:
- Ask ONE question at a time and wait for my answer. Never send a list of questions.
- Plain English, no jargon.
- Follow the thread — if something sounds slow, manual, repeated, error-prone, or frustrating, dig into it before moving on.
- Get concrete where it matters: how often something happens, how long it takes, who does it, what it costs when it goes wrong, and what I'd do with the time or money if it were freed up.
- Work through the main areas of the business: how work/orders/enquiries come in and get delivered, the tools and systems I use and whether they talk to each other, where I rely on one person's head or a single spreadsheet, where mistakes tend to happen, what I'm always chasing, and what's stopping the business growing.
- Don't pitch solutions or lecture — just understand my world properly.

Ask around 12–18 questions in total, using your judgement. When you've got a real picture, tell me we're done and ask me to paste in the next prompt.

Start with your first question now.`;

export const PROMPT_REPORT = `Thanks. Now take everything I've told you in this conversation and turn it into a clear, honest operational review of my business that I could read in five minutes and act on. Don't ask me anything else — just write it.

Use these headings:
1. Business snapshot — what we do, size, and how we're set up, in a few lines.
2. How things run today — a plain walkthrough of the main processes end to end.
3. Where time and money are leaking — the bottlenecks, repetitive manual work, error-prone steps, and single points of failure. For each: what it is, how often it happens, roughly what it costs in time or money, and why it matters. Biggest first.
4. Systems and data — the tools we use, how well they work together, and where information gets stuck, re-keyed, or lost.
5. What's holding growth back — what would need to change for the business to scale.
6. My own priorities — anything I flagged as most important or most painful.
7. Biggest opportunities — where fixing things would have the most impact, split into "quick wins" and "bigger projects." Be specific and practical.

Write it in plain, straight-talking English, no jargon, so a busy owner (or someone helping them) can read it fast. Keep my own words where they capture something well. Then produce it as a clean, shareable document — a Google Doc if you can create one, otherwise a tidy version I can copy straight into a doc and send on.`;

// A single downloadable file with the steps and both prompts.
export function buildKitMarkdown(): string {
  const steps = REVIEW_STEPS.map((s, i) => `${i + 1}. ${s}`).join("\n");
  return `# Your operational review — how to run it

${steps}

---

## Prompt 1 — the interview
Paste this into your AI first.

${PROMPT_INTERVIEW}

---

## Prompt 2 — the report
Paste this in once the interview says you're done.

${PROMPT_REPORT}

---

When your report's ready, come back via your personal link and paste it in — you'll get an honest read on where to focus first.
`;
}
