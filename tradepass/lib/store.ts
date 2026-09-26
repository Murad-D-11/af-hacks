import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Worker, Employment, VerificationRequest, WorkerDetail, AuditEvent } from './types';

export type DB = { workers: Worker[]; employments: Employment[]; requests: VerificationRequest[] };
const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const empty = (): DB => ({ workers: [], employments: [], requests: [] });

export function readDb(): DB {
  if (!fs.existsSync(DB_PATH)) return empty();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) as DB;
}
export function writeDb(db: DB) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
export const newId = () => crypto.randomUUID();
export const newToken = () => crypto.randomBytes(12).toString('base64url');

export const store = {
  listWorkers: () => readDb().workers,
  getWorker: (id: string) => readDb().workers.find(w => w.id === id) ?? null,
  updateWorker(id: string, patch: Partial<Worker>): Worker | null {
    const db = readDb(); const i = db.workers.findIndex(x => x.id === id);
    if (i < 0) return null;
    db.workers[i] = { ...db.workers[i], ...patch }; writeDb(db); return db.workers[i];
  },
  getWorkerDetail(id: string): WorkerDetail | null {
    const db = readDb(); const worker = db.workers.find(w => w.id === id);
    if (!worker) return null;
    return { worker,
      employments: db.employments.filter(e => e.workerId === id),
      requests: db.requests.filter(r => r.workerId === id) };
  },
  getEmployment: (id: string) => readDb().employments.find(e => e.id === id) ?? null,
  upsertEmployment(e: Employment): Employment {
    const db = readDb(); const i = db.employments.findIndex(x => x.id === e.id);
    if (i >= 0) db.employments[i] = e; else db.employments.push(e);
    writeDb(db); return e;
  },
  updateEmployment(id: string, patch: Partial<Employment>): Employment | null {
    const db = readDb(); const i = db.employments.findIndex(x => x.id === id);
    if (i < 0) return null;
    db.employments[i] = { ...db.employments[i], ...patch }; writeDb(db); return db.employments[i];
  },
  createRequest(r: VerificationRequest): VerificationRequest {
    const db = readDb(); db.requests.push(r); writeDb(db); return r;
  },
  getRequest: (id: string) => readDb().requests.find(r => r.id === id) ?? null,
  getRequestByToken: (token: string) => readDb().requests.find(r => r.token === token) ?? null,
  updateRequest(id: string, patch: Partial<VerificationRequest>): VerificationRequest | null {
    const db = readDb(); const i = db.requests.findIndex(x => x.id === id);
    if (i < 0) return null;
    db.requests[i] = { ...db.requests[i], ...patch }; writeDb(db); return db.requests[i];
  },
  addAuditEvent(id: string, type: string, detail: string): VerificationRequest | null {
    const db = readDb(); const r = db.requests.find(x => x.id === id);
    if (!r) return null;
    const ev: AuditEvent = { at: new Date().toISOString(), type, detail };
    r.audit.events.push(ev); writeDb(db); return r;
  },
};
