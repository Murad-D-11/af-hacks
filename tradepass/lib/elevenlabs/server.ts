// STUB (B1). Developer A replaces this file's implementation in A2.
// Signatures are FIXED per the Context Pack — do not change without telling A.
import type { TranscriptLine } from '../types';

export interface ElTranscriptTurn { role: 'agent' | 'user'; message: string; timeInCallSecs?: number; }
export interface ElConversation {
  conversationId: string;
  status: string; // raw ElevenLabs status, e.g. 'processing' | 'done' | 'failed'
  transcript: ElTranscriptTurn[];
  dataCollection: Record<string, string | null>; // data-collection id -> raw string value
}

// Returns null on missing API key, network error, or timeout. NEVER throws.
export async function waitForConversation(
  conversationId: string,
  opts?: { timeoutMs?: number; intervalMs?: number }
): Promise<ElConversation | null> {
  return null;
}

// Parses a data-collection value that contains JSON. Returns null on failure.
export function parseJsonField<T>(conv: ElConversation, id: string): T | null {
  return null;
}

// Maps turns + transcript_english_json into TranscriptLine[] (english null where missing).
export function toTranscriptLines(conv: ElConversation, userSpeaker: 'worker' | 'employer'): TranscriptLine[] {
  return [];
}
