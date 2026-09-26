export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { store } from '@/lib/store';
import IntakeConversation from '@/components/intake/IntakeConversation';

export default function IntakePage({ params }: { params: { id: string } }) {
  const worker = store.getWorker(params.id);
  if (!worker) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-slate-900">Tell us your work history, in your own language</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          {worker.name} speaks Turkish with our voice assistant. Everything he says is recorded as his claim, to be
          verified by his former employers.
        </p>
      </div>

      <IntakeConversation workerId={worker.id} workerName={worker.name} />
    </div>
  );
}
