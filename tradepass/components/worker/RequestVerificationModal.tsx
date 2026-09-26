'use client';

import { useEffect, useState } from 'react';
import type { Employment } from '@/lib/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { localTime } from '@/lib/timezones';

interface RequestVerificationResponse {
  requestId: string;
  token: string;
  url: string;
}

export default function RequestVerificationModal({
  employment,
  onClose,
  onCreated,
}: {
  employment: Employment;
  onClose: () => void;
  onCreated?: (result: RequestVerificationResponse) => void;
}) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [result, setResult] = useState<RequestVerificationResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function createRequest() {
      try {
        const res = await fetch(`/api/employments/${employment.id}/request-verification`, { method: 'POST' });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = (await res.json()) as RequestVerificationResponse;
        if (cancelled) return;
        setResult(data);
        setState('ready');
        onCreated?.(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setState('error');
      }
    }

    createRequest();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employment.id]);

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context) — the link is still visible to copy manually.
    }
  };

  const employerTime = localTime(employment.reference.timezone);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <Card className="w-full max-w-lg">
        <div className="flex items-start justify-between">
          <h2 className="font-serif text-xl font-semibold text-slate-900">Request verification</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            ✕
          </button>
        </div>

        <p className="mt-2 text-sm text-slate-600">
          For <span className="font-medium text-slate-900">{employment.employerName}</span> ({employment.reference.name || 'no reference on file'})
        </p>

        {state === 'loading' && (
          <p className="mt-6 text-sm text-slate-500">Creating a verification link…</p>
        )}

        {state === 'error' && (
          <p className="mt-6 text-sm text-red-600">Couldn&apos;t create the verification link. Please try again.</p>
        )}

        {state === 'ready' && result && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400">Verification link</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  readOnly
                  value={result.url}
                  className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button variant="secondary" onClick={handleCopy}>{copied ? 'Copied' : 'Copy link'}</Button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <span>
                Employer local time ({employment.reference.timezone}): <span className="font-mono text-slate-700">{employerTime}</span>
              </span>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-700 hover:text-emerald-800"
              >
                Open employer page →
              </a>
            </div>

            <p className="text-xs text-slate-500">
              Send this link to the former employer. They enter the facts themselves and confirm them on video;
              TradePass never writes them on their behalf.
            </p>
          </div>
        )}

        <div className="mt-6 text-right">
          <Button variant="ghost" onClick={onClose}>Done</Button>
        </div>
      </Card>
    </div>
  );
}
