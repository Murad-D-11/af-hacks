'use client';

import { useState } from 'react';
import type { SkillSetCoverage } from '@/lib/types';

const STATUS_STYLES: Record<SkillSetCoverage['status'], { tile: string; label: string; icon: string }> = {
  verified: { tile: 'border-emerald-300 bg-emerald-50', label: 'Verified', icon: '✓' },
  claimed: { tile: 'border-amber-300 bg-amber-50', label: "Worker's claim only", icon: '~' },
  gap: { tile: 'border-slate-200 bg-slate-50', label: 'Gap', icon: '·' },
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
            style={{ animationDelay: `${i * 60}ms` }}
            className={`animate-tile-pop rounded-xl border p-3 text-left transition hover:shadow-sm ${style.tile}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-slate-500">{c.code}</span>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                  c.status === 'verified' ? 'bg-emerald-600 text-white' : c.status === 'claimed' ? 'bg-amber-400 text-white' : 'bg-slate-300 text-slate-600'
                }`}
              >
                {style.icon}
              </span>
            </div>
            <p className="mt-1.5 text-xs font-medium leading-tight text-slate-800">{c.title}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">{style.label}</span>
              {c.provisional && (
                <span className="rounded bg-slate-200 px-1 py-0.5 text-[9px] font-medium uppercase text-slate-600">Provisional</span>
              )}
            </div>

            {isExpanded && (
              <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
                {c.evidence.length === 0 ? (
                  <p className="text-[11px] text-slate-400">No evidence yet.</p>
                ) : (
                  c.evidence.map((e, idx) => (
                    <p key={idx} className="text-[11px] text-slate-600">
                      <span className={e.source === 'verified' ? 'text-emerald-700' : 'text-amber-700'}>
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
