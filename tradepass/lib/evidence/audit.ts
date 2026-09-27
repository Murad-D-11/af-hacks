// Developer A's evidence/audit helpers, used by the employer-facing verify routes.
import { readDb, writeDb } from '../store';
import type { AuditEvent } from '../types';

export interface ClientInfo {
  ip: string | null;
  userAgent: string | null;
}

/**
 * Extracts client IP and user-agent from a Request. Prefers the first value in
 * x-forwarded-for (the original client, when behind a proxy), falls back to
 * x-real-ip, then null. On localhost this is commonly '::1' or missing entirely —
 * store whatever we get as-is, don't normalize or reject it.
 */
export function clientInfo(req: Request): ClientInfo {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const firstForwarded = forwardedFor ? forwardedFor.split(',')[0]?.trim() : null;
  const ip = firstForwarded || realIp || null;
  const userAgent = req.headers.get('user-agent');
  return { ip: ip || null, userAgent: userAgent || null };
}

/**
 * Appends an audit event to a request's audit trail, but ONLY if no event of this
 * exact `type` has been recorded yet — so repeated calls (e.g. the employer refreshing
 * the verify page) don't spam duplicate 'link_opened' events. Returns true if an event
 * was recorded, false if one already existed (or the request wasn't found).
 */
export function recordFirst(requestId: string, type: string, detail: string): boolean {
  const db = readDb();
  const request = db.requests.find((r) => r.id === requestId);
  if (!request) return false;

  const alreadyRecorded = request.audit.events.some((e) => e.type === type);
  if (alreadyRecorded) return false;

  const event: AuditEvent = { at: new Date().toISOString(), type, detail };
  request.audit.events.push(event);
  writeDb(db);
  return true;
}
