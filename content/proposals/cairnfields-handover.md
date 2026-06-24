# Cairnfields — Phase 0 Prototype · Handover

**For:** whoever places this on the Outgrow proposals page (and, later, builds the real thing).
**From:** Robert. **Status:** vision prototype — clickable look-and-feel, non-functional.

---

## 1. What this is

Cairnfields is a workplace capability-development platform. The premise (Jon Cannock's): capability is built through real workplace experience, not training content — the workshop is the *catalyst*, the learning happens back at the **gemba** (where work happens). The product captures those moments and structures them into a **Development Record**; records stack over time into a portfolio (a "cairnfield").

- **"Cairnfields" is a working name** (codename was *ToGemba*). Domain + UK trademark not yet confirmed.
- Built with **The Academy of Excellence** (Jon's org). ⚠️ *Verify this name — earlier project material had Jon at "The Uncommon Practice." It appears on pages 1, 3 and 5.*
- This is the **£2,000 Phase 0** deliverable: prove the concept, not build it. The real build is a later phase.

## 2. The deliverable

`cairnfields-walkthrough.html` — a **single, self-contained HTML file**. No build step, no dependencies except Google Fonts over CDN. Five "pages" with a top nav that switches between them (it's a single-page app, not five files):

1. **What it is** — front-facing site / pitch for a buyer or cohort.
2. **Capture** — the capture moment. Phone mockup; toggle between *Voice note* and *Guided by AI*. Both animate, then hand off to the record.
3. **The record** — the hero object. *Raw capture ⇄ Structured* toggle is the key demo. Includes a coach-annotation layer.
4. **Identity** — logo / glyph / type / palette options for Jon to choose from (recommended ones marked "Picked").
5. **Proposal** — the phased commercial offer + a sign-off block with a **placeholder** payment button.

## 3. Getting it onto Outgrow (the task)

Outgrow is designed to push *its* interactive content out to your site — not to host an external multi-page site. So don't try to rebuild these pages inside Outgrow. Instead:

**Recommended:**
1. **Host the HTML on a static host.** Vercel is ideal (it was the original Phase 0 plan, free, instant — drag the single file in, get a URL like `cairnfields.vercel.app`). Netlify, Cloudflare Pages or GitHub Pages all work identically.
2. **Bring it into Outgrow** via a *Custom HTML* page in the builder, using an iframe pointing at the hosted URL:
   ```html
   <iframe src="https://YOUR-HOSTED-URL" width="100%" height="900"
           style="border:0;width:100%;" title="Cairnfields"></iframe>
   ```
   The internal nav works fine inside an iframe. Set a **tall fixed height** (≈900–1000px) — the iframe won't auto-resize to the SPA, so short pages will have whitespace and that's expected.

**Simpler still:** if Outgrow fights you, just host on Vercel and send Jon that link directly, or link to it from an Outgrow page. Don't burn hours forcing a whole site into a quiz tool.

**Payment:** the button on page 5 is inert. Two options — (a) wire a **Stripe / GoCardless Payment Link** into it, or (b) collect the £2,000 with **Outgrow's native Payment Widget** (PayPal / PayU) if you're embedding there anyway.

## 4. Design tokens (so any edits stay on-system)

- **Colours:** ink `#20251F` · slate `#6A6E63` · moss/lichen `#496B4E` · coach bronze `#97743A` · stone ground `#E6E5DF` · paper `#F4F3EF`.
- **Type — three deliberate voices:** Bricolage Grotesque (brand/display) · Spectral (the human's words, serif) · Space Mono (system/labels). Fraunces and Hanken Grotesk appear only as alternates on the Identity page.
- **Glyph:** stacked stones (a cairn), smallest on top, top stone in moss = growth. SVG is inline in the file — search `<ellipse cx="20"` to find it.

## 5. Open items before it's client-facing

- [ ] **Org name** — confirm Academy of Excellence vs The Uncommon Practice (pages 1, 3, 5).
- [ ] **Figures on page 5** — Robert's working numbers; confirm current. (£2k / £12.5k net £10.5k / £27.5k · £40k total · £7.5k risk-share deferred to Phase 2.)
- [ ] **Payment** — replace the placeholder with a real link or Outgrow Payment Widget.
- [ ] **Fonts** — currently Google Fonts CDN. If a network blocks it the type falls back to system faces (still legible, less character). Self-host/inline if full portability matters.
- [ ] **Capability progression model** (the pips on page 3) — a design assertion, not agreed. Define with Jon before treating as real.
- [ ] **Name** — domain (`cairnfields.com`) + UK IPO trademark check (classes 9 software, 41 training, 42 SaaS) before committing.

## 6. For the eventual real build (Phase 1+)

This prototype *is* the spec. The data model behind it:

**A Development Record =**
`{ id, capturedVia: "voice" | "ai-chat", date, eventType, title, capabilityTags[], whatHappened, whatYouDid, whatShifted, whereThisBuilds: { capability, progression }, coachNote: { author, body } }`

- **Input → structure:** a voice transcript *or* a short AI Q&A is processed by a structuring engine into the fields above. That transform is the core magic (and the core technical risk — it's load-bearing and currently underspecified).
- **Portfolio** = an ordered stack of Records (the "cairnfield").
- **Capture** has two triggers: *push* (calendar-aware nudge after a 1:1, review, etc.) and *pull* (user opens it cold).

**Phase 1 (MVP, for the September cohort):** real voice + AI-chat capture, the structuring step, record view, portfolio stack, a basic coach note. Single-tenant is fine.
**Phase 2 (on green light):** structuring engine at full strength, multi-tenancy, data governance, cross-cohort coach + portfolio views.

---

*Positioning note for the front page copy: it's partly Jon's own language ("guidance, not management — no appraisal, no pass/fail"; workshop-as-catalyst). Keep that intact — it's the trust positioning that makes buyers engage.*
