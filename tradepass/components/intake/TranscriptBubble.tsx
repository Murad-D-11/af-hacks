import type { TranscriptLine } from '@/lib/types';

export default function TranscriptBubble({ line }: { line: TranscriptLine }) {
  const isWorker = line.speaker === 'worker';
  return (
    <div className={`animate-slide-in-up flex ${isWorker ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] border px-4 py-2.5 text-sm ${
          isWorker ? 'border-orange bg-orange text-plate' : 'border-line bg-plate-raised text-foreground/85'
        }`}
      >
        <p className={isWorker ? 'text-plate' : 'text-foreground'}>{line.original}</p>
        {line.english && (
          <p className={`mt-1 text-xs italic ${isWorker ? 'text-plate/70' : 'text-foreground/45'}`}>{line.english}</p>
        )}
      </div>
    </div>
  );
}
