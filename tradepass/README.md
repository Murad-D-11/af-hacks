# TradePass

**TradePass turns the internationally trained tradespeople already on a contractor's crew into licensed journeypersons. Their former employers abroad confirm the facts on recorded video, in their own language, on their own schedule, and TradePass packages that into the evidence file Ontario requires.**

## The problem

- Canada is short of tradespeople — construction alone needs about 306,200 hires by 2034, with a projected 34,300-worker shortfall — while experienced immigrants are stuck below their skill level (38% work in jobs needing only a high school diploma, versus 18% of Canadian-born workers).
- Ontario's compulsory trades (electrician, plumber, and others) require a Certificate of Qualification. An experienced foreign electrician can be standing on a Canadian job site as a labourer, unable to legally do the work they trained for.
- The path out — a Trade Equivalency Assessment (TEA) from Skilled Trades Ontario — breaks down because former employers are overseas, in different time zones and languages, and reference calls routinely go unanswered.

## How it works

1. **Emre speaks his history.** The worker talks in Turkish to a TradePass voice assistant in the browser. It's turned into an English work history, clearly labelled as his claim — not yet verified by anyone.
2. **The contractor sends the employer link.** One click creates a unique verification link for a past job.
3. **The employer fills in the facts themselves.** The former employer opens the link on their own schedule, in their own language, and enters dates, hours, role, and duties on a form. They never see what the worker claimed.
4. **Video confirmation with the voice agent.** The employer's webcam records while a voice assistant reads back only the employer's own answers and asks them to confirm each one — consent, identity, company, role, dates, hours, duties.
5. **Evidence package.** TradePass bundles the video, a Turkish/English transcript, a tamper-evident audit trail (IP, timestamps, conversation ID, SHA-256 video fingerprint), any discrepancies between the worker's claim and the employer's answers, verified hours, 309A skill-set coverage, and a draft employer letter for signature.

Skilled Trades Ontario still makes every decision. TradePass makes the file complete, credible, and checkable.

## Principles

- The AI never supplies facts about the worker. Worker facts are labelled "claimed." Employer facts come only from the employer's own form; the video interview only confirms them.
- Evidence is tamper-evident, recorded, and auditable — never claimed to be fraud-proof.
- Verification is asynchronous: the employer verifies on their own schedule, in their own language. No phone calls.
- Skilled Trades Ontario makes all decisions. TradePass never claims a guaranteed licence. The employer letter is a draft for the employer to sign.

## Stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS.
- Data: a local `data/db.json` file — no database, gitignored.
- Voice and AI: **ElevenLabs only** — two ElevenAgents (worker intake, employer verification) plus post-call data-collection analysis for structuring and translation. No other AI provider is used anywhere in this project.
- Video: the browser's `getUserMedia` + `MediaRecorder` (webm), recorded locally.
- PDFs: `@react-pdf/renderer`, server-side.
- A **simulated mode** (`NEXT_PUBLIC_VOICE_MODE=simulated`) drives both conversations from a scripted transcript with the browser's `speechSynthesis`, so the demo never depends on live credits or network access to ElevenLabs.

## Setup

1. Copy `.env.example` to `.env.local` and fill in your ElevenLabs API key and agent IDs (leave `NEXT_PUBLIC_VOICE_MODE=simulated` to run without using any credits).
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Seed the demo data:
   ```powershell
   npx tsx scripts/seed.ts
   ```
4. Start the dev server:
   ```powershell
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000).

## Demo script

1. **Reset to the intake scenario** — either the "Reset (intake)" button on the dashboard footer, or:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/api/demo/reset?scenario=intake" -Method Post
   ```
2. **Emre speaks his history.** Open his worker page and start the voice intake. His Kocaeli job appears in English, labelled "claimed."
3. **The gap.** The worker page shows **NOT READY**, 6,235 of 9,000 verified hours, 3 of 8 skill sets verified.
4. **Request verification.** One click creates a unique link. Open the employer page in another tab (append `?demo=1` for the guided employer walkthrough).
5. **Murat fills the form and completes the video interview**, confirming each answer on camera.
6. **Back on the contractor tab**, the page auto-refreshes: **READY TO SUBMIT**, 19,680 verified hours, 8 of 8 skill sets. A flag notes the discrepancy between the worker's claimed start date and the employer's confirmed start date.
7. **Evidence**: the video, transcript, audit trail, and both PDFs (Work Experience Verification form, full evidence package) are ready to download.

## Voice and evidence

> _Owned by the ElevenLabs / employer-side developer — agent configuration, the employer verification flow, video capture and fingerprinting, and PDF generation are documented separately in `docs/elevenlabs-agents.md`._

## Disclaimers

This is a hackathon MVP, not production software. It does not perform identity verification, face matching, or document checks; it does not submit anything to Skilled Trades Ontario; and it does not send real emails, WhatsApp messages, or phone calls. All seeded worker and employer data is fictional. Skilled Trades Ontario makes all licensing decisions — TradePass never guarantees a licence.
