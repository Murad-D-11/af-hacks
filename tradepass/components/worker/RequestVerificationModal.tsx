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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
      <Card className="animate-stamp-in w-full max-w-lg">
        <div className="flex items-start justify-between">
          <h2 className="font-stamp text-2xl font-bold uppercase tracking-wide text-foreground">Request verification</h2>
          <button onClick={onClose} className="text-foreground/40 hover:text-orange" aria-label="Close">
            ✕
          </button>
        </div>

        <p className="mt-2 text-sm text-foreground/60">
          For <span className="font-medium text-foreground">{employment.employerName}</span> ({employment.reference.name || 'no reference on file'})
        </p>

        {state === 'loading' && (
          <p className="mt-6 text-sm text-foreground/50">Creating a verification link…</p>
        )}

        {state === 'error' && (
          <p className="mt-6 text-sm text-danger">Couldn&apos;t create the verification link. Please try again.</p>
        )}

        {state === 'ready' && result && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-foreground/40">Verification link</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  readOnly
                  value={result.url}
                  className="flex-1 border border-line bg-background px-3 py-2 font-mono text-xs text-foreground/75"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button variant="secondary" onClick={handleCopy}>{copied ? 'Copied' : 'Copy link'}</Button>
              </div>
            </div>

            <div className="flex items-center justify-between border border-line bg-background px-3 py-2 text-xs text-foreground/50">
              <span>
                Employer local time ({employment.reference.timezone}): <span className="font-mono text-foreground/70">{employerTime}</span>
              </span>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold uppercase text-orange hover:text-[#ff7038]"
              >
                Open employer page →
              </a>
            </div>

            <p className="text-xs text-foreground/50">
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
