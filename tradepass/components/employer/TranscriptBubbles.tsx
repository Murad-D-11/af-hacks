// EN: Live transcript display during the interview: agent lines on the left, employer
// lines on the right, auto-scrolling to the latest line.
import { useEffect, useRef } from 'react';
import type { TranscriptLine } from '@/lib/types';

export default function TranscriptBubbles({ lines }: { lines: TranscriptLine[] }) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [lines.length]);

  if (lines.length === 0) {
    return <p className="text-sm text-slate-400">Görüşme başladığında konuşma metni burada görünecek.</p>;
  }

  return (
    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
      {lines.map((line, i) => {
        const isAgent = line.speaker === 'agent';
        return (
          <div key={i} className={`flex ${isAgent ? 'justify-start' : 'justify-end'} animate-slide-in-up`}>
            <div
              className={
                'max-w-[80%] rounded-2xl px-3 py-2 text-sm ' +
                (isAgent ? 'bg-slate-100 text-slate-800' : 'bg-emerald-600 text-white')
              }
            >
              <p>{line.original}</p>
              {line.english && (
                <p className={`mt-0.5 text-xs ${isAgent ? 'text-slate-500' : 'text-emerald-100'}`}>{line.english}</p>
              )}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
