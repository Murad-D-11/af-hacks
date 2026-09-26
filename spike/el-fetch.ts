/**
 * TradePass A1 spike: fetch a finished ElevenLabs conversation and its post-call analysis.
 *
 * Usage (from spike/):
 *   npx.cmd tsx el-fetch.ts <conversation_id>
 *
 * Reads ELEVENLABS_API_KEY from spike/.env.local. Never prints the key.
 *
 * Flow:
 *   1. GET /v1/convai/conversations/{id} every 2s (max 90s) until status is "done" or "failed".
 *   2. If done but analysis / data_collection_results is empty, POST .../analysis/run once
 *      (needs a key with write access) and poll again (max 60s).
 *   3. Print status, metadata, transcript turns, confirm_field tool calls, full analysis JSON,
 *      and JSON.parse the data-collection values employments_json, transcript_english_json,
 *      confirmations_json.
 *
 * Response shape verified against https://api.elevenlabs.io/openapi.json:
 *   status: initiated | in-progress | processing | done | failed
 *   analysis.data_collection_results.<id>.value  (JSON blobs are stored as strings)
 */

import path from "node:path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });

const API_BASE = "https://api.elevenlabs.io/v1/convai/conversations";
const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_MS = 90_000;
const ANALYSIS_RERUN_MAX_MS = 60_000;
const REQUEST_TIMEOUT_MS = 15_000;
const TERMINAL_STATUSES = new Set(["done", "failed"]);
const JSON_FIELDS = ["employments_json", "transcript_english_json", "confirmations_json"] as const;

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

interface ToolCall {
  request_id?: string;
  tool_name?: string;
  params_as_json?: string;
  type?: string;
}

interface TranscriptTurn {
  role?: string;
  message?: string | null;
  time_in_call_secs?: number;
  tool_calls?: ToolCall[] | null;
  tool_results?: unknown[] | null;
  interrupted?: boolean;
}

interface DataCollectionResult {
  data_collection_id?: string;
  value?: unknown;
  rationale?: string;
  json_schema?: unknown;
}

interface Analysis {
  call_successful?: string;
  transcript_summary?: string;
  call_summary_title?: string;
  data_collection_results?: Record<string, DataCollectionResult> | null;
  data_collection_results_list?: DataCollectionResult[] | null;
  evaluation_criteria_results?: unknown;
}

interface Conversation {
  conversation_id?: string;
  agent_id?: string;
  agent_name?: string;
  status?: string;
  transcript?: TranscriptTurn[] | null;
  metadata?: {
    call_duration_secs?: number;
    cost?: number;
    termination_reason?: string;
    charging?: unknown;
    [key: string]: unknown;
  } | null;
  analysis?: Analysis | null;
  conversation_initiation_client_data?: unknown;
}

class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`HTTP ${status}: ${body.slice(0, 300)}`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function hr(title: string): void {
  console.log(`\n=== ${title} ${"=".repeat(Math.max(0, 70 - title.length))}`);
}

async function request(apiKey: string, url: string, method: "GET" | "POST"): Promise<Conversation> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      headers: { "xi-api-key": apiKey, Accept: "application/json" },
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new HttpError(res.status, text);
    return JSON.parse(text) as Conversation;
  } finally {
    clearTimeout(timer);
  }
}

/** Polls GET until `done(conv)` is true or time runs out. Returns the last good response. */
async function poll(
  apiKey: string,
  id: string,
  maxMs: number,
  done: (c: Conversation) => boolean,
): Promise<Conversation | null> {
  const url = `${API_BASE}/${encodeURIComponent(id)}`;
  const started = Date.now();
  let last: Conversation | null = null;
  let lastStatus = "";

  while (Date.now() - started < maxMs) {
    try {
      last = await request(apiKey, url, "GET");
      const status = last.status ?? "(no status)";
      if (status !== lastStatus) {
        console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] status: ${status}`);
        lastStatus = status;
      }
      if (done(last)) return last;
    } catch (err) {
      if (err instanceof HttpError && (err.status === 401 || err.status === 403)) {
        throw new Error(`Auth failed (${err.status}). Check ELEVENLABS_API_KEY and that it has Conversational AI read access.`);
      }
      // 404 right after hang-up is possible while the conversation is being indexed; keep polling.
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] request failed, retrying: ${msg}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  return last;
}

function hasDataCollection(c: Conversation): boolean {
  const map = c.analysis?.data_collection_results;
  const list = c.analysis?.data_collection_results_list;
  return (!!map && Object.keys(map).length > 0) || (!!list && list.length > 0);
}

function getDataCollectionValue(c: Conversation, id: string): { found: boolean; value: unknown } {
  const map = c.analysis?.data_collection_results;
  if (map && id in map) return { found: true, value: map[id]?.value };
  const hit = c.analysis?.data_collection_results_list?.find((r) => r.data_collection_id === id);
  if (hit) return { found: true, value: hit.value };
  return { found: false, value: undefined };
}

/**
 * Attempts to repair common LLM JSON-generation mistakes seen in practice:
 *  - a stray extra closing brace right before the final closer, e.g. `..."}]}"` where
 *    it should just be `..."]}"` (the model double-closed the last string's container).
 *  - missing closing brackets/braces at the very end (truncated output).
 * This is a best-effort salvage, not a general JSON repair tool: it only tries a small,
 * targeted set of fixes and gives up if none of them parse.
 */
function tryRepairJson(text: string): string[] {
  const candidates: string[] = [];

  // Fix 1: a single stray `}` immediately before the last `]` and/or `}` in the string.
  // e.g. `..."foo"}]}` -> `..."foo"]}` (drop the extra `}` that closes nothing).
  const strayBraceBeforeClose = text.replace(/\}(\]\}?)$/, "$1");
  if (strayBraceBeforeClose !== text) candidates.push(strayBraceBeforeClose);

  // Fix 2: count bracket/brace balance and append whatever closers are missing at the end
  // (handles truncated output that just stops mid-structure).
  let depthBrace = 0;
  let depthBracket = 0;
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depthBrace += 1;
    else if (ch === "}") depthBrace -= 1;
    else if (ch === "[") depthBracket += 1;
    else if (ch === "]") depthBracket -= 1;
  }
  if (depthBrace > 0 || depthBracket > 0) {
    const closers = "]".repeat(Math.max(0, depthBracket)) + "}".repeat(Math.max(0, depthBrace));
    candidates.push(text + closers);
  }

  return candidates;
}

/** Values arrive as strings; the LLM sometimes wraps them in ```json fences or emits slightly malformed JSON. */
function parseJsonValue(value: unknown): { ok: true; data: Json; repaired?: boolean } | { ok: false; error: string } {
  if (value === null || value === undefined || value === "") return { ok: false, error: "empty value" };
  if (typeof value !== "string") return { ok: true, data: value as Json };
  const cleaned = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  try {
    return { ok: true, data: JSON.parse(cleaned) as Json };
  } catch (firstErr) {
    for (const candidate of tryRepairJson(cleaned)) {
      try {
        return { ok: true, data: JSON.parse(candidate) as Json, repaired: true };
      } catch {
        // try the next candidate
      }
    }
    const err = firstErr;
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function printTranscript(c: Conversation): number {
  const turns = c.transcript ?? [];
  let confirmCalls = 0;
  if (turns.length === 0) {
    console.log("(no transcript turns)");
    return 0;
  }
  for (const turn of turns) {
    const t = typeof turn.time_in_call_secs === "number" ? `${turn.time_in_call_secs}s`.padStart(5) : "   ?s";
    const role = (turn.role ?? "?").padEnd(5);
    const msg = turn.message ?? "";
    console.log(`${t} ${role} ${msg}${turn.interrupted ? "  [interrupted]" : ""}`);
    for (const call of turn.tool_calls ?? []) {
      if (call.tool_name === "confirm_field") confirmCalls += 1;
      console.log(`        -> tool_call ${call.tool_name ?? "?"} (${call.type ?? "?"}) ${call.params_as_json ?? ""}`);
    }
  }
  return confirmCalls;
}

async function main(): Promise<void> {
  const id = (process.argv[2] ?? "").trim();
  if (!id) {
    console.error("Usage: npx.cmd tsx el-fetch.ts <conversation_id>");
    process.exit(2);
  }
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    console.error(`Conversation id looks wrong: "${id}"`);
    process.exit(2);
  }
  const apiKey = (process.env.ELEVENLABS_API_KEY ?? "").trim();
  if (!apiKey) {
    console.error("ELEVENLABS_API_KEY is empty. Fill it in spike/.env.local and run this from the spike/ folder.");
    process.exit(2);
  }

  hr(`Polling ${id}`);
  const t0 = Date.now();
  let conv = await poll(apiKey, id, POLL_MAX_MS, (c) => TERMINAL_STATUSES.has(c.status ?? ""));
  if (!conv) {
    console.error("Never got a response for this conversation id.");
    process.exit(1);
  }
  if (!TERMINAL_STATUSES.has(conv.status ?? "")) {
    console.warn(`Gave up after ${POLL_MAX_MS / 1000}s with status "${conv.status}". Printing what we have.`);
  }

  if (conv.status === "done" && !hasDataCollection(conv)) {
    hr("Analysis empty: POST /analysis/run");
    try {
      await request(apiKey, `${API_BASE}/${encodeURIComponent(id)}/analysis/run`, "POST");
      console.log("Re-run requested. Polling for analysis...");
      const rerun = await poll(apiKey, id, ANALYSIS_RERUN_MAX_MS, hasDataCollection);
      if (rerun) conv = rerun;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`analysis/run failed (key may lack write access, or no data collection configured): ${msg}`);
    }
  }
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  hr("Summary");
  console.log(`status:            ${conv.status}`);
  console.log(`agent:             ${conv.agent_name ?? "?"} (${conv.agent_id ?? "?"})`);
  console.log(`duration (s):      ${conv.metadata?.call_duration_secs ?? "?"}`);
  console.log(`cost (credits):    ${conv.metadata?.cost ?? "?"}`);
  console.log(`termination:       ${conv.metadata?.termination_reason ?? "?"}`);
  console.log(`analysis ready in: ~${elapsed}s after this script started`);
  if (conv.metadata?.charging !== undefined) {
    console.log(`charging:          ${JSON.stringify(conv.metadata.charging)}`);
  }

  hr("Transcript");
  const confirmCalls = printTranscript(conv);
  console.log(`\nconfirm_field tool calls in transcript: ${confirmCalls}`);

  hr("Dynamic variables sent (conversation_initiation_client_data)");
  console.log(JSON.stringify(conv.conversation_initiation_client_data ?? null, null, 2));

  hr("Full analysis JSON");
  console.log(JSON.stringify(conv.analysis ?? null, null, 2));

  hr("Parsed data-collection fields");
  const results: Record<string, string> = {};
  for (const field of JSON_FIELDS) {
    const { found, value } = getDataCollectionValue(conv, field);
    if (!found) {
      results[field] = "MISSING (not configured on this agent, or analysis not run)";
      console.log(`\n--- ${field}: MISSING`);
      continue;
    }
    const parsed = parseJsonValue(value);
    if (parsed.ok) {
      const shape = Array.isArray(parsed.data) ? `array[${parsed.data.length}]` : typeof parsed.data;
      results[field] = parsed.repaired ? `ok, REPAIRED (${shape})` : `ok (${shape})`;
      console.log(`\n--- ${field}: parsed${parsed.repaired ? " (after repairing malformed JSON from the model)" : ""}`);
      console.log(JSON.stringify(parsed.data, null, 2));
    } else {
      results[field] = `INVALID JSON: ${parsed.error}`;
      console.log(`\n--- ${field}: INVALID JSON (${parsed.error}). Raw value:`);
      console.log(String(value));
    }
  }

  hr("Result");
  for (const [field, result] of Object.entries(results)) {
    console.log(`${field.padEnd(24)} ${result}`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
