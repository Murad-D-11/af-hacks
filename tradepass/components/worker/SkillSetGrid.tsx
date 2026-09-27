'use client';

import { useState } from 'react';
import type { SkillSetCoverage } from '@/lib/types';

const STATUS_STYLES: Record<SkillSetCoverage['status'], { tile: string; label: string; icon: string }> = {
  verified: { tile: 'border-orange/50 bg-orange/[0.07]', label: 'Verified', icon: '✓' },
  claimed: { tile: 'border-caution/40 bg-caution/10', label: "Worker's claim only", icon: '~' },
  gap: { tile: 'border-line bg-background', label: 'Gap', icon: '·' },
};

export default function SkillSetGrid({ coverage }: { coverage: SkillSetCoverage[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {coverage.map((c, i) => {
        const style = STATUS_STYLES[c.status];
        const isExpanded = expandedId === c.skillSetId;
        return (
          <button
            key={c.skillSetId}
            onClick={() => setExpandedId(isExpanded ? null : c.skillSetId)}
            style={{ animationDelay: `${i * 55}ms` }}
            className={`animate-tile-pop border p-3 text-left transition hover:border-orange/70 ${style.tile}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-foreground/50">{c.code}</span>
              <span
                className={`flex h-5 w-5 items-center justify-center text-xs font-bold ${
                  c.status === 'verified'
                    ? 'bg-orange text-plate'
                    : c.status === 'claimed'
                      ? 'bg-caution text-plate'
                      : 'bg-foreground/10 text-foreground/50'
                }`}
              >
                {style.icon}
              </span>
            </div>
            <p className="mt-1.5 text-xs font-medium leading-tight text-foreground/85">{c.title}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-foreground/50">{style.label}</span>
              {c.provisional && (
                <span className="bg-foreground/10 px-1 py-0.5 text-[9px] font-medium uppercase text-foreground/60">Provisional</span>
              )}
            </div>

            {isExpanded && (
              <div className="mt-2 space-y-1 border-t border-line pt-2">
                {c.evidence.length === 0 ? (
                  <p className="text-[11px] text-foreground/40">No evidence yet.</p>
                ) : (
                  c.evidence.map((e, idx) => (
                    <p key={idx} className="text-[11px] text-foreground/60">
                      <span className={e.source === 'verified' ? 'text-orange' : 'text-caution'}>
                        {e.source === 'verified' ? 'Verified: ' : 'Claimed: '}
                      </span>
                      {e.text}
                    </p>
                  ))
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
