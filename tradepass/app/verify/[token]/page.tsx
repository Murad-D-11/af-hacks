'use client';
// EN: Employer-facing verification page. Turkish copy throughout; English equivalents
// in comments. This is the ONLY place the employer's own facts get entered — the
// worker's claimed dates/hours/tasks are never shown here or returned by the GET route.
import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/Card';
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
        <p className="text-sm text-slate-500">Yükleniyor…</p>
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

  return (
    <div className="space-y-6">
      <PageHeader workerName={worker.name} employerTimezone={reference.timezone} />

      {request.status === 'completed' ? (
        <ThankYouScreen employerName={employerName} />
      ) : request.status === 'form_submitted' || request.status === 'interviewing' ? (
        <>
          <StepIndicator current="interview" />
          <InterviewStep request={request} workerName={worker.name} onCompleted={updateRequest} />
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
      <p className="text-xs uppercase tracking-wide text-slate-400">TradePass</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold text-slate-900">Çalışma Deneyimi Doğrulaması</h1>
      <p className="mt-1 text-sm text-slate-600">
        {/* EN: {workerName}, Ontario electrician license application. */}
        {workerName}, Ontario elektrikçi lisans başvurusu.
      </p>
      <p className="mt-3 text-xs text-slate-400">
        {/* EN: Your local time: {time}. You can complete this whenever you like. */}
        Yerel saatiniz: {localTime(employerTimezone)} · İstediğiniz zaman tamamlayabilirsiniz.
      </p>
    </Card>
  );
}

function ThankYouScreen({ employerName }: { employerName: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-emerald-600">Tamamlandı</p>
      <h2 className="mt-1 font-serif text-xl font-semibold text-slate-900">Teşekkür ederiz</h2>
      <p className="mt-2 text-sm text-slate-600">
        {/* EN: Thank you, {employerName}. Your verification has been recorded and submitted. */}
        Teşekkür ederiz, {employerName}. Doğrulamanız kaydedildi ve gönderildi. Başka bir işlem yapmanıza gerek yok.
      </p>
    </Card>
  );
}
