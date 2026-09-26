'use client';

import { useState } from 'react';
import type { IntakeRecord } from '@/lib/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import TranscriptBubble from '@/components/intake/TranscriptBubble';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function IntakeSummary({ intake }: { intake: IntakeRecord | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!intake) return null;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-700">
            Work history recorded by voice in Turkish · <span className="font-mono">{formatDate(intake.completedAt)}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {intake.source === 'elevenlabs' ? 'Structured by the ElevenLabs intake agent.' : 'Structured from the recorded conversation (fallback path).'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="amber">Claims only</Badge>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
          >
            {expanded ? 'Hide transcript' : 'Show transcript'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
          {intake.transcript.length === 0 ? (
            <p className="text-xs text-slate-500">No transcript recorded.</p>
          ) : (
            intake.transcript.map((line, i) => <TranscriptBubble key={i} line={line} />)
          )}
        </div>
      )}
    </Card>
  );
}
