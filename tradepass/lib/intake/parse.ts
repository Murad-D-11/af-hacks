import type { Employment, Reference } from '../types';

/**
 * Raw shape of one entry in the intake agent's `employments_json` data-collection field.
 * Per the Context Pack's agent spec: dates are 'YYYY-MM' strings (endDate may be null for
 * an ongoing job), hoursPerWeek is a number, and tasks/roleTitle/supervisorTitle are English.
 */
export interface RawParsedEmployment {
  employerName?: unknown;
  city?: unknown;
  country?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  hoursPerWeek?: unknown;
  roleTitle?: unknown;
  tasks?: unknown;
  supervisorName?: unknown;
  supervisorTitle?: unknown;
}

export interface RawEmploymentsPayload {
  employments?: unknown;
}

const YEAR_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function isValidYearMonth(value: unknown): value is string {
  return typeof value === 'string' && YEAR_MONTH_RE.test(value);
}

function toReferenceTimezone(country: string | null): string {
  const normalized = (country ?? '').trim().toLowerCase();
  if (normalized === 'türkiye' || normalized === 'turkiye' || normalized === 'turkey') {
    return 'Europe/Istanbul';
  }
  return 'UTC';
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return null;
}

function toTasksArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
}

/**
 * Validates and maps one raw parsed employment (from employments_json, or a hand-built
 * fallback) into a partial Employment. Returns null if the entry is missing an employer
 * name or a valid 'YYYY-MM' start date — per the B3 spec, such entries are dropped.
 */
export function mapRawEmployment(raw: RawParsedEmployment, preferredLanguage: string): Omit<Employment, 'id' | 'workerId' | 'status' | 'latestRequestId' | 'attemptLog' | 'origin'> | null {
  const employerName = toStringOrNull(raw.employerName);
  const startDate = raw.startDate;

  if (!employerName) return null;
  if (!isValidYearMonth(startDate)) return null;

  const endDate = isValidYearMonth(raw.endDate) ? raw.endDate : null;
  const hoursPerWeek = typeof raw.hoursPerWeek === 'number' && Number.isFinite(raw.hoursPerWeek) ? raw.hoursPerWeek : 0;
  const city = toStringOrNull(raw.city) ?? '';
  const country = toStringOrNull(raw.country) ?? '';
  const roleTitle = toStringOrNull(raw.roleTitle) ?? '';
  const supervisorName = toStringOrNull(raw.supervisorName) ?? '';
  const supervisorTitle = toStringOrNull(raw.supervisorTitle) ?? '';

  const reference: Reference = {
    name: supervisorName,
    title: supervisorTitle,
    email: null,
    phone: null,
    language: preferredLanguage,
    timezone: toReferenceTimezone(country),
  };

  return {
    employerName,
    city,
    country,
    startDate,
    endDate,
    hoursPerWeek,
    roleTitle,
    tasks: toTasksArray(raw.tasks),
    reference,
  };
}

export function mapRawEmploymentsPayload(payload: RawEmploymentsPayload | null, preferredLanguage: string) {
  if (!payload || !Array.isArray(payload.employments)) return [];
  return payload.employments
    .map(raw => mapRawEmployment(raw as RawParsedEmployment, preferredLanguage))
    .filter((e): e is NonNullable<ReturnType<typeof mapRawEmployment>> => e !== null);
}
