'use client';

export type MicState = 'idle' | 'requesting' | 'active' | 'ended';

export default function MicButton({ state, onStart, onEnd }: { state: MicState; onStart: () => void; onEnd: () => void }) {
  if (state === 'active') {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
          <span className="relative inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg">
            <MicIcon />
          </span>
        </div>
        <button
          onClick={onEnd}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          End conversation
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onStart}
      disabled={state === 'requesting'}
      className="flex flex-col items-center gap-3 disabled:opacity-60"
    >
      <span className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-700">
        <MicIcon />
      </span>
      <span className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">
        {state === 'requesting' ? 'Connecting…' : 'Start speaking (Türkçe)'}
      </span>
    </button>
  );
}

function MicIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-9 w-9">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 0 1-14 0M12 19v3" />
    </svg>
  );
}
