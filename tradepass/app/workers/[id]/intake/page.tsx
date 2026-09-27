export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { store } from '@/lib/store';
import IntakeConversation from '@/components/intake/IntakeConversation';

export default function IntakePage({ params }: { params: { id: string } }) {
  const worker = store.getWorker(params.id);
  if (!worker) notFound();

  return (
    <div className="animate-rise-in space-y-6">
      <div>
        {/* EN: Tell us your work history, in your own language */}
        <h1 className="font-stamp text-4xl font-bold uppercase tracking-wide text-foreground">
          Çalışma geçmişinizi kendi dilinizde anlatın
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground/60">
          {/* EN: {worker.name} speaks Turkish with our voice assistant. Everything he
              says is recorded as his claim, to be verified by his former employers. */}
          {worker.name}, sesli asistanımızla Türkçe konuşacak. Söylediği her şey onun beyanı olarak kaydedilir ve
          daha sonra eski işverenleri tarafından doğrulanır.
        </p>
      </div>

      <IntakeConversation workerId={worker.id} workerName={worker.name} />
    </div>
  );
}
