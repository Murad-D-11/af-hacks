// Developer A's real implementation, replacing B1's stub. Signatures are FIXED per the
// Context Pack — do not change without telling B.
//
// SERVER-ONLY: this file calls ElevenLabs with a secret API key. NEVER import it from a
// 'use client' component or anything that ends up in the browser bundle.
export const SERVER_ONLY = true;

import type { TranscriptLine } from '../types';

export interface ElTranscriptTurn { role: 'agent' | 'user'; message: string; timeInCallSecs?: number; }
export interface ElConversation {
  conversationId: string;
  status: string; // raw ElevenLabs status, e.g. 'processing' | 'done' | 'failed'
  transcript: ElTranscriptTurn[];
  dataCollection: Record<string, string | null>; // data-collection id -> raw string value
}

const API_BASE = 'https://api.elevenlabs.io/v1/convai/conversations';
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_INTERVAL_MS = 2_000;
const REQUEST_TIMEOUT_MS = 15_000;
const TERMINAL_STATUSES = new Set(['done', 'failed']);

// --- raw ElevenLabs response shapes (only the fields we use) --------------------------

interface RawToolCall {
  tool_name?: string;
  params_as_json?: string;
}
interface RawTranscriptTurn {
  role?: string;
  message?: string | null;
  time_in_call_secs?: number;
  tool_calls?: RawToolCall[] | null;
}
interface RawDataCollectionResult {
  data_collection_id?: string;
  value?: unknown;
}
interface RawAnalysis {
  data_collection_results?: Record<string, RawDataCollectionResult> | null;
  data_collection_results_list?: RawDataCollectionResult[] | null;
}
interface RawConversation {
  conversation_id?: string;
  status?: string;
  transcript?: RawTranscriptTurn[] | null;
  analysis?: RawAnalysis | null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchConversation(apiKey: string, id: string, method: 'GET' | 'POST' = 'GET'): Promise<RawConversation> {
  const url = method === 'GET' ? `${API_BASE}/${encodeURIComponent(id)}` : `${API_BASE}/${encodeURIComponent(id)}/analysis/run`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      headers: { 'xi-api-key': apiKey, Accept: 'application/json' },
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
    }
    return JSON.parse(text) as RawConversation;
  } finally {
    clearTimeout(timer);
  }
}

function hasDataCollection(raw: RawConversation): boolean {
  const map = raw.analysis?.data_collection_results;
  const list = raw.analysis?.data_collection_results_list;
  return (!!map && Object.keys(map).length > 0) || (!!list && list.length > 0);
}

/** Flattens ElevenLabs' two possible analysis shapes (map or list) into id -> raw value. */
function collectDataCollection(raw: RawConversation): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  const map = raw.analysis?.data_collection_results;
  if (map) {
    for (const [id, result] of Object.entries(map)) {
      out[id] = normalizeValue(result?.value);
    }
  }
  const list = raw.analysis?.data_collection_results_list;
  if (list) {
    for (const result of list) {
      if (result.data_collection_id) out[result.data_collection_id] = normalizeValue(result.value);
    }
  }
  return out;
}

function normalizeValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function mapTranscript(raw: RawConversation): ElTranscriptTurn[] {
  const turns = raw.transcript ?? [];
  const out: ElTranscriptTurn[] = [];
  for (const turn of turns) {
    const role = turn.role === 'agent' || turn.role === 'user' ? turn.role : null;
    const message = (turn.message ?? '').trim();
    // Skip empty messages and tool-call-only turns (no spoken content to show the user).
    if (!role || !message) continue;
    out.push({
      role,
      message,
      timeInCallSecs: typeof turn.time_in_call_secs === 'number' ? turn.time_in_call_secs : undefined,
    });
  }
  return out;
}

function toElConversation(raw: RawConversation, fallbackId: string): ElConversation {
  return {
    conversationId: raw.conversation_id ?? fallbackId,
    status: raw.status ?? 'unknown',
    transcript: mapTranscript(raw),
    dataCollection: collectDataCollection(raw),
  };
}

/**
 * Polls GET /v1/convai/conversations/{id} until status is 'done' or 'failed', or timeoutMs
 * elapses. If status reaches 'done' but analysis/data-collection is still empty, keeps
 * polling within the same timeout budget (ElevenLabs sometimes finalizes status slightly
 * before analysis is attached). As a last resort within the same budget, triggers
 * POST .../analysis/run once and polls a little longer for it to land.
 *
 * NEVER throws: every failure path (missing key, network error, timeout, bad JSON) is
 * caught and logged via console.warn, returning null instead.
 */
export async function waitForConversation(
  conversationId: string,
  opts?: { timeoutMs?: number; intervalMs?: number }
): Promise<ElConversation | null> {
  const apiKey = (process.env.ELEVENLABS_API_KEY ?? '').trim();
  if (!apiKey) {
    console.warn('[elevenlabs/server] waitForConversation: ELEVENLABS_API_KEY is missing.');
    return null;
  }

  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const intervalMs = opts?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const started = Date.now();
  let last: RawConversation | null = null;
  let analysisRunTried = false;

  try {
    while (Date.now() - started < timeoutMs) {
      try {
        last = await fetchConversation(apiKey, conversationId, 'GET');
      } catch (err) {
        // Transient errors (network blip, 404 right after hang-up while ElevenLabs
        // indexes the conversation, etc.) — log and retry within the timeout budget.
        console.warn(`[elevenlabs/server] waitForConversation: GET failed, retrying: ${errorMessage(err)}`);
        await sleep(intervalMs);
        continue;
      }

      const status = last.status ?? '';
      const terminal = TERMINAL_STATUSES.has(status);

      if (terminal && hasDataCollection(last)) {
        return toElConversation(last, conversationId);
      }

      if (status === 'done' && !hasDataCollection(last) && !analysisRunTried) {
        // Give analysis one nudge if it looks like it never ran, but stay within budget.
        analysisRunTried = true;
        try {
          await fetchConversation(apiKey, conversationId, 'POST');
        } catch (err) {
          console.warn(`[elevenlabs/server] waitForConversation: analysis/run failed (may lack write access): ${errorMessage(err)}`);
        }
      }

      if (terminal && analysisRunTried) {
        // Status is terminal, we already tried nudging analysis once; keep polling
        // for the rest of the timeout budget in case it lands, then fall through.
      }

      await sleep(intervalMs);
    }
  } catch (err) {
    console.warn(`[elevenlabs/server] waitForConversation: unexpected error: ${errorMessage(err)}`);
    return null;
  }

  // Timed out. If we have a terminal-status response, return it even without analysis
  // (callers can still use the transcript; parseJsonField will just return null).
  if (last && TERMINAL_STATUSES.has(last.status ?? '')) {
    console.warn(`[elevenlabs/server] waitForConversation: timed out after ${timeoutMs}ms waiting for analysis; returning conversation without full data collection.`);
    return toElConversation(last, conversationId);
  }

  console.warn(`[elevenlabs/server] waitForConversation: timed out after ${timeoutMs}ms with no terminal status.`);
  return null;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// --- JSON parsing -----------------------------------------------------------------------

/**
 * Attempts to repair the most common LLM JSON-generation mistakes observed during A1
 * testing: a stray extra closing brace right before the final closer (e.g. '..."}]}'
 * where it should be '..."]}'), and truncated output missing closers at the end.
 * Best-effort salvage, not a general JSON repair tool.
 */
function tryRepairJson(text: string): string[] {
  const candidates: string[] = [];

  const strayBraceBeforeClose = text.replace(/\}(\]\}?)$/, '$1');
  if (strayBraceBeforeClose !== text) candidates.push(strayBraceBeforeClose);

  let depthBrace = 0;
  let depthBracket = 0;
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depthBrace += 1;
    else if (ch === '}') depthBrace -= 1;
    else if (ch === '[') depthBracket += 1;
    else if (ch === ']') depthBracket -= 1;
  }
  if (depthBrace > 0 || depthBracket > 0) {
    const closers = ']'.repeat(Math.max(0, depthBracket)) + '}'.repeat(Math.max(0, depthBrace));
    candidates.push(text + closers);
  }

  return candidates;
}

/**
 * Parses a data-collection value that contains JSON. Strips markdown code fences, then
 * takes the substring from the first '{' to the last '}' (defensive against any leading/
 * trailing prose the model might add despite instructions), then JSON.parse. Falls back
 * to tryRepairJson() on failure. Returns null on failure (never throws).
 */
export function parseJsonField<T>(conv: ElConversation, id: string): T | null {
  const raw = conv.dataCollection[id];
  if (raw === null || raw === undefined || raw === '') return null;

  const withoutFences = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  const firstBrace = withoutFences.indexOf('{');
  const lastBrace = withoutFences.lastIndexOf('}');
  const candidate = firstBrace >= 0 && lastBrace > firstBrace
    ? withoutFences.slice(firstBrace, lastBrace + 1)
    : withoutFences;

  try {
    return JSON.parse(candidate) as T;
  } catch {
    for (const repaired of tryRepairJson(candidate)) {
      try {
        return JSON.parse(repaired) as T;
      } catch {
        // try next candidate
      }
    }
    console.warn(`[elevenlabs/server] parseJsonField: failed to parse data-collection field "${id}".`);
    return null;
  }
}

// --- transcript mapping ------------------------------------------------------------------

interface TranscriptEnglishJson {
  lines?: string[];
}

/**
 * Maps ElConversation.transcript into TranscriptLine[]. English text comes from
 * transcript_english_json.lines by index — ONLY if the line count matches the turn
 * count exactly; otherwise every line's `english` is null (rather than risk misaligning
 * agent/user turns with the wrong English translation).
 */
export function toTranscriptLines(conv: ElConversation, userSpeaker: 'worker' | 'employer'): TranscriptLine[] {
  const englishJson = parseJsonField<TranscriptEnglishJson>(conv, 'transcript_english_json');
  const englishLines = Array.isArray(englishJson?.lines) ? englishJson!.lines : null;
  const englishAligned = !!englishLines && englishLines.length === conv.transcript.length;

  return conv.transcript.map((turn, i) => ({
    speaker: turn.role === 'agent' ? 'agent' : userSpeaker,
    original: turn.message,
    english: englishAligned ? englishLines![i] : null,
    atSec: turn.timeInCallSecs,
  }));
}
