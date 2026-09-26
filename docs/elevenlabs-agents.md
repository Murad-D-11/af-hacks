# ElevenLabs agents (A1)

Two ElevenLabs Agents, both Turkish, both public (no auth), both driven from the browser with `@elevenlabs/react@1.15.2`. Post-call data comes from `GET /v1/convai/conversations/{id}` (see `spike/el-fetch.ts`).

> Slots marked `⟦CONTEXT PACK⟧` must be filled verbatim from the Context Pack ("Agent specs" and `DUTIES_309A`). Do not improvise them.

## 1. Intake agent

| Setting | Value |
|---|---|
| Name | `TradePass Intake (TR)` |
| Language | Turkish |
| Auth | Off (public agent) |
| Max duration | 300 s |
| System tools | End call: on |
| Client tools | none |
| Dynamic variables | `{{worker_name}}` |

First message: ⟦CONTEXT PACK: intake first message⟧

System prompt: ⟦CONTEXT PACK: intake behaviour bullets⟧

Data collection (Analysis tab), all type `string`:

| id | Description |
|---|---|
| `employments_json` | ⟦CONTEXT PACK⟧. Must say "Return ONLY a JSON array, no prose, no code fences" and give the exact object shape. |
| `transcript_english_json` | ⟦CONTEXT PACK⟧. Same "ONLY JSON" rule. |

## 2. Verification agent

| Setting | Value |
|---|---|
| Name | `TradePass Verify (TR)` |
| Language | Turkish |
| Auth | Off (public agent) |
| Max duration | 240 s |
| System tools | End call: on |
| Client tools | `confirm_field` (blocking) |
| Dynamic variables | `{{supervisor_name}}`, `{{worker_name}}`, `{{company_name}}`, `{{role_title}}`, `{{start_tr}}`, `{{end_tr}}`, `{{hours}}`, `{{duties_tr}}` |

First message: ⟦CONTEXT PACK: verify first message⟧

System prompt: ⟦CONTEXT PACK: verify behaviour bullets⟧. It must tell the agent to call `confirm_field` once per field, right after the supervisor answers (7 calls per full verification).

### `confirm_field` client tool

- Type: Client. Name exactly `confirm_field` (the browser handler matches on this string).
- "Wait for response": ON. Without this the agent does not await the tool, and the tool counts as non-blocking.
- Response timeout: 5 s. The browser handler returns `"ok"` immediately.
- Parameters:

| Param | Type | Required | Enum |
|---|---|---|---|
| `field` | string | yes | ⟦CONTEXT PACK: field enum⟧ |
| `status` | string | yes | ⟦CONTEXT PACK: status enum⟧ |
| ⟦any others from the pack⟧ | | | |

Data collection (Analysis tab), type `string`:

| id | Description |
|---|---|
| `confirmations_json` | ⟦CONTEXT PACK⟧. "Return ONLY JSON". |
| `transcript_english_json` | ⟦CONTEXT PACK⟧ |

### `DUTIES_309A` (10 duties)

| id | en | tr |
|---|---|---|
| ⟦CONTEXT PACK: 10 rows⟧ | | |

Kocaeli demo claim (the six duties sent as `duties_tr`, joined with `", "`): ⟦CONTEXT PACK⟧. `spike/app/page.tsx` currently holds a DRAFT string. Replace it.

## 3. Dashboard click-by-click

The UI labels come from the current ElevenLabs Agents dashboard and may shift slightly.

1. Go to elevenlabs.io/app/agents, then New agent, then Blank template. Name it as in the tables above.
2. Agent tab:
   - Agent language = Turkish.
   - Paste the First message and System prompt, using `{{var}}` placeholders exactly as named.
   - Pick a Turkish-capable voice. The multilingual Flash/Turbo v2.5 models support Turkish.
3. Tools, System tools: enable End call.
4. Tools, Add tool, Client (verify agent only):
   - Name `confirm_field`, add a description.
   - Wait for response ON.
   - Add the parameters with their enums.
5. Advanced: Max conversation duration = 300 s (intake) / 240 s (verify).
6. Security: leave authentication OFF, so the agent is public and the browser needs only the agent ID.
7. Analysis, Data collection: add each id above, type String, with its description.
8. Save/Publish. Copy the Agent ID into `spike/.env.local`:
   - `NEXT_PUBLIC_ELEVENLABS_INTAKE_AGENT_ID`
   - `NEXT_PUBLIC_ELEVENLABS_VERIFY_AGENT_ID`
9. API key (Profile, then API keys):
   - Create a restricted key with Agents/Conversational AI Read (`convai_read`).
   - Add Write only if you want `el-fetch` to call `POST .../analysis/run`.
   - Put it in `ELEVENLABS_API_KEY`. It is server-only; never prefix it with `NEXT_PUBLIC_`.

## 4. Running the spike (PowerShell)

```powershell
cd spike
npm.cmd run dev                       # http://localhost:3000 in Chrome
# after a call ends, copy the id from the page:
npx.cmd tsx el-fetch.ts <conversation_id>
# credits left:
Invoke-RestMethod https://api.elevenlabs.io/v1/user/subscription -Headers @{ 'xi-api-key' = '<your key>' } | Select-Object character_count, character_limit, next_character_count_reset_unix
```

`npm.ps1` is blocked by the execution policy on this machine, so use `npm.cmd` / `npx.cmd`.

## 5. Verified API facts

- React `startSession(options)` returns `void`. The conversation id arrives in `onConnect({ conversationId })`.
- `onMessage` payload is `{ message, role: "user" | "agent", source (deprecated), event_id? }`.
- `dynamicVariables` is `Record<string, string | number | boolean>`.
- GET `status` is one of `initiated | in-progress | processing | done | failed`. Analysis is only final at `done`.
- Values live at `analysis.data_collection_results.<id>.value`. They are strings, so `JSON.parse` them and strip code fences defensively.
- Post-call analysis runs an LLM (default `gemini-2.5-flash`). Its cost is tracked in `metadata.charging.analysis`. Per-call credits are in `metadata.cost`.

## 6. Observed results (fill in after testing)

| Question | Result |
|---|---|
| Both agents speak Turkish in Chrome on localhost | ☐ intake ☐ verify |
| Real `onMessage` payload (paste one user + one agent) | |
| `confirm_field` calls in one full verify run (target 7) | browser: _ / transcript: _ |
| `confirm_field` params as received (paste one) | |
| Webcam recording size / duration / mimeType | |
| Time from hang-up to `status: done` | |
| Time from `done` to analysis present | |
| `employments_json` / `transcript_english_json` / `confirmations_json` parse OK | ☐ ☐ ☐ |
| Credits per intake test / verify test (`metadata.cost`) | |
| Did `analysis/run` ever need to be called | |

## 7. Fallback chain (for B/A integration)

The chain is ElevenLabs analysis, then client-side data (the `onMessage` transcript plus the `confirm_field` params captured in the browser), then canned demo data. Each step times out quickly. User-facing errors are shown in Turkish with a retry option.
