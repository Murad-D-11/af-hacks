import type { TranscriptLine } from '@/lib/types';

export default function TranscriptBubble({ line }: { line: TranscriptLine }) {
  const isWorker = line.speaker === 'worker';
  return (
    <div className={`flex ${isWorker ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          isWorker ? 'bg-emerald-600 text-white' : 'bg-white text-slate-800 border border-slate-200'
        }`}
      >
        <p className={isWorker ? 'text-white' : 'text-slate-900'}>{line.original}</p>
        {line.english && (
          <p className={`mt-1 text-xs italic ${isWorker ? 'text-emerald-50' : 'text-slate-500'}`}>{line.english}</p>
        )}
      </div>
    </div>
  );
}
