'use client';

import { useState } from 'react';
import Link from 'next/link';
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

export default function IntakeSummary({ intake, workerId }: { intake: IntakeRecord | null; workerId: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!intake) return null;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-foreground/75">
            Work history recorded by voice in Turkish · <span className="font-mono">{formatDate(intake.completedAt)}</span>
          </p>
          <p className="mt-1 text-xs text-foreground/50">
            {intake.source === 'elevenlabs' ? 'Structured by the ElevenLabs intake agent.' : 'Structured from the recorded conversation (fallback path).'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="amber">Claims only</Badge>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-semibold uppercase text-orange hover:text-[#ff7038]"
          >
            {expanded ? 'Hide transcript' : 'Show transcript'}
          </button>
          <Link
            href={`/workers/${workerId}/intake`}
            className="text-xs font-medium text-foreground/50 hover:text-foreground/80"
          >
            Redo intake
          </Link>
        </div>
      </div>

      {expanded && (
        <div className="animate-punch-in mt-4 max-h-80 space-y-2 overflow-y-auto border border-line bg-background p-4">
          {intake.transcript.length === 0 ? (
            <p className="text-xs text-foreground/50">No transcript recorded.</p>
          ) : (
            intake.transcript.map((line, i) => <TranscriptBubble key={i} line={line} />)
          )}
        </div>
      )}
    </Card>
  );
}
