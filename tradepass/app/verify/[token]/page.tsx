'use client';
// EN: Employer-facing verification page. Turkish copy throughout; English equivalents
// in comments. This is the ONLY place the employer's own facts get entered — the
// worker's claimed dates/hours/tasks are never shown here or returned by the GET route.
import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StepIndicator from '@/components/employer/StepIndicator';
import EmployerForm from '@/components/employer/EmployerForm';
import InterviewStep from '@/components/employer/InterviewStep';
import { localTime } from '@/lib/timezones';
import type { Reference, VerificationRequest } from '@/lib/types';

interface VerifyPageData {
  request: VerificationRequest;
  worker: { name: string; trade: string };
  employerName: string;
  reference: Reference;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: VerifyPageData };

export default function VerifyPage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === '1';

  const [state, setState] = useState<LoadState>({ status: 'loading' });

  // Once completed, the employer can still choose to redo the video interview from
  // this same link (e.g. they made a mistake and only noticed after closing the tab).
  // This is a purely local choice — nothing server-side changes until they actually
  // finish a new recording, at which point /interview/complete overwrites the
  // previous result (that route already tolerates re-submission from 'completed').
  const [redoRequested, setRedoRequested] = useState(false);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await fetch(`/api/verify/${params.token}`);
      const body = await res.json();
      if (!res.ok) {
        setState({ status: 'error', message: body.error ?? 'Bir hata oluştu.' });
        return;
      }
      setState({ status: 'ready', data: body as VerifyPageData });
    } catch {
      setState({ status: 'error', message: 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.' });
    }
  }, [params.token]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      <Card>
        <p className="text-sm text-foreground/50">Yükleniyor…</p>
      </Card>
    );
  }

  if (state.status === 'error') {
    return (
      <Card>
        <p className="text-sm text-red-700">{state.message}</p>
      </Card>
    );
  }

  const { data } = state;
  const { request, worker, employerName, reference } = data;

  const updateRequest = (updated: VerificationRequest) => {
    setState({ status: 'ready', data: { ...data, request: updated } });
  };

  const showInterviewStep =
    request.status === 'form_submitted' || request.status === 'interviewing' || (request.status === 'completed' && redoRequested);

  return (
    <div className="animate-rise-in space-y-6">
      <PageHeader workerName={worker.name} employerTimezone={reference.timezone} />

      {request.status === 'completed' && !redoRequested ? (
        <ThankYouScreen employerName={employerName} employmentId={request.employmentId} onRedo={() => setRedoRequested(true)} />
      ) : showInterviewStep ? (
        <>
          <StepIndicator current="interview" />
          <InterviewStep
            request={request}
            workerName={worker.name}
            referenceLanguage={reference.language}
            onCompleted={updateRequest}
          />
        </>
      ) : (
        <>
          <StepIndicator current="form" />
          <EmployerForm
            request={request}
            employerName={employerName}
            reference={reference}
            isDemo={isDemo}
            onSubmitted={updateRequest}
          />
        </>
      )}
    </div>
  );
}

function PageHeader({ workerName, employerTimezone }: { workerName: string; employerTimezone: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-orange">TradePass</p>
      <h1 className="font-stamp mt-1 text-3xl font-bold uppercase tracking-wide text-foreground">Çalışma Deneyimi Doğrulaması</h1>
      <p className="mt-1 text-sm text-foreground/60">
        {/* EN: {workerName}, Ontario electrician license application. */}
        {workerName}, Ontario elektrikçi lisans başvurusu.
      </p>
      <p className="mt-3 text-xs text-foreground/40">
        {/* EN: Your local time: {time}. You can complete this whenever you like. */}
        Yerel saatiniz: {localTime(employerTimezone)} · İstediğiniz zaman tamamlayabilirsiniz.
      </p>
    </Card>
  );
}

function ThankYouScreen({
  employerName,
  employmentId,
  onRedo,
}: {
  employerName: string;
  employmentId: string;
  onRedo: () => void;
}) {
  return (
    <Card className="animate-celebrate">
      <p className="text-xs uppercase tracking-wide text-signal">Tamamlandı</p>
      <h2 className="font-stamp mt-1 text-2xl font-bold uppercase tracking-wide text-foreground">Teşekkür ederiz</h2>
      <p className="mt-2 text-sm text-foreground/60">
        {/* EN: Thank you, {employerName}. Your verification has been recorded and submitted. */}
        Teşekkür ederiz, {employerName}. Doğrulamanız kaydedildi ve gönderildi. Başka bir işlem yapmanıza gerek yok.
      </p>
      <div className="mt-4">
        <a href={`/api/employments/${employmentId}/wev-form`} target="_blank" rel="noopener noreferrer">
          {/* EN: Download the employer letter draft (PDF) */}
          <Button>Doğrulama belgesini indir (PDF)</Button>
        </a>
      </div>
      <button
        onClick={onRedo}
        className="mt-4 text-xs font-medium text-foreground/50 hover:text-foreground/80"
      >
        {/* EN: Made a mistake? Redo the video verification. */}
        Bir hata mı yaptınız? Görüntülü doğrulamayı tekrar yapın.
      </button>
    </Card>
  );
}
