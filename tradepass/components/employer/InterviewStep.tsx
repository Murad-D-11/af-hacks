'use client';
// EN: The video verification interview: webcam + mic recording running in parallel
// with either a live ElevenLabs voice session or a simulated (speechSynthesis) replay,
// a live 7-field checklist, transcript bubbles, and upload-on-finish.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import FieldChecklist from './FieldChecklist';
import TranscriptBubbles from './TranscriptBubbles';
import { simulatedInterview } from '@/lib/evidence/simulated';
import { monthTr } from '@/lib/hours';
import { DUTIES_309A } from '@/lib/skills/309A';
import type { ConfirmField, FieldConfirmation, TranscriptLine, VerificationRequest, VoiceMode } from '@/lib/types';

const RECORDER_MIME_CANDIDATES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_VERIFY_AGENT_ID ?? '';
const CONFIGURED_MODE: VoiceMode = process.env.NEXT_PUBLIC_VOICE_MODE === 'live' ? 'live' : 'simulated';

type Phase = 'consent' | 'connecting' | 'running' | 'finishing' | 'done' | 'error';

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return RECORDER_MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
}

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function InterviewStep({
  request,
  workerName,
  onCompleted,
}: {
  request: VerificationRequest;
  workerName: string;
  onCompleted: (updated: VerificationRequest) => void;
}) {
  return (
    <ConversationProvider>
      <InterviewInner request={request} workerName={workerName} onCompleted={onCompleted} />
    </ConversationProvider>
  );
}

function InterviewInner({
  request,
  workerName,
  onCompleted,
}: {
  request: VerificationRequest;
  workerName: string;
  onCompleted: (updated: VerificationRequest) => void;
}) {
  const answers = request.answers;

  // DEV-ONLY escape hatch for testing on hardware without a webcam: ?skipCamera=1 skips
  // getUserMedia entirely (no recording is produced). Never advertised to real employers
  // — camera+mic stay mandatory by default; this is an explicit opt-in per-visit flag,
  // not a setting that changes behaviour for anyone else.
  const searchParams = useSearchParams();
  const skipCamera = searchParams.get('skipCamera') === '1';

  const [phase, setPhase] = useState<Phase>('consent');
  const [mode, setMode] = useState<VoiceMode>(CONFIGURED_MODE);
  const [errorMessage, setErrorMessage] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [confirmations, setConfirmations] = useState<FieldConfirmation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ date: string; fingerprint: string; conversationId: string | null } | null>(null);
  const [hasCamera, setHasCamera] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const clockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finishedRef = useRef(false);

  const conversation = useConversation({
    onConnect: ({ conversationId: id }) => setConversationId(id),
    onMessage: (payload: { message: string; role: string }) => {
      // Only final messages are delivered by this SDK version (no tentative/final flag
      // per docs/elevenlabs-agents.md); treat every onMessage as a final line.
      if (!payload.message) return;
      setLines((prev) => [
        ...prev,
        { speaker: payload.role === 'agent' ? 'agent' : 'employer', original: payload.message, english: null },
      ]);
    },
    onDisconnect: () => {
      if (!finishedRef.current) void finishInterview();
    },
    onError: (message: string) => {
      setErrorMessage(message || 'Görüşme sırasında bir hata oluştu.');
    },
  });

  const stopClock = useCallback(() => {
    if (clockIntervalRef.current) {
      clearInterval(clockIntervalRef.current);
      clockIntervalRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const clearSimTimers = useCallback(() => {
    simTimersRef.current.forEach((t) => clearTimeout(t));
    simTimersRef.current = [];
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      stopClock();
      clearSimTimers();
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') rec.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [stopClock, clearSimTimers]);

  const buildDynamicVariables = useCallback((): Record<string, string> => {
    if (!answers) return {};
    const dutiesTr = answers.dutyIds.map((id) => DUTIES_309A.find((d) => d.id === id)?.tr ?? id).join(', ');
    return {
      supervisor_name: answers.supervisorName,
      worker_name: workerName,
      company_name: answers.companyName,
      role_title: answers.roleTitle,
      start_tr: monthTr(answers.startDate),
      end_tr: monthTr(answers.endDate),
      hours: String(answers.hoursPerWeek),
      duties_tr: dutiesTr,
    };
  }, [answers, workerName]);

  /** Camera + mic are mandatory for a real verification session (getUserMedia throws if
   * either is unavailable/denied, and that's intentional — a verification recording
   * without video isn't real evidence). The only bypass is the explicit ?skipCamera=1
   * dev flag below, for testing on hardware without a webcam.
   */
  const startRecorder = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    streamRef.current = stream;
    setHasCamera(true);
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);
    }
    const mimeType = pickRecorderMime();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.start(1000);
    recorderRef.current = rec;
  }, []);

  const stopRecorderAndGetBlob = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === 'inactive') {
        resolve(new Blob(chunksRef.current, { type: 'video/webm' }));
        return;
      }
      rec.onstop = () => {
        resolve(new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' }));
      };
      rec.stop();
    });
  }, []);

  const runSimulated = useCallback(() => {
    if (!answers) return;
    const steps = simulatedInterview(answers);
    for (const step of steps) {
      const timer = setTimeout(() => {
        if (step.line) {
          setLines((prev) => [...prev, step.line!]);
          if (step.line.speaker === 'agent' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
              const utter = new SpeechSynthesisUtterance(step.line.original);
              utter.lang = 'tr-TR';
              window.speechSynthesis.speak(utter);
            } catch {
              // speechSynthesis unsupported/blocked — non-fatal, transcript still shows.
            }
          }
        }
        if (step.confirm) {
          setConfirmations((prev) => [...prev, step.confirm!]);
        }
      }, step.atSec * 1000);
      simTimersRef.current.push(timer);
    }
    // End the simulated call shortly after the last step.
    const lastAtSec = steps[steps.length - 1]?.atSec ?? 0;
    const endTimer = setTimeout(() => {
      void finishInterview();
    }, (lastAtSec + 3) * 1000);
    simTimersRef.current.push(endTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  const startInterview = useCallback(async () => {
    if (!answers) return;
    setErrorMessage('');
    setPhase('connecting');

    if (skipCamera) {
      setHasCamera(false);
    } else {
      try {
        await startRecorder();
      } catch {
        setErrorMessage('Kamera veya mikrofon erişimi alınamadı. Tarayıcı izinlerini kontrol edin.');
        setPhase('error');
        return;
      }
    }

    try {
      await fetch(`/api/verify/${request.token}/interview/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
    } catch {
      // Non-fatal — the complete route re-validates status server-side anyway.
    }

    startedAtRef.current = Date.now();
    clockIntervalRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 500);

    if (mode === 'live') {
      if (!AGENT_ID) {
        setErrorMessage('Doğrulama ajanı yapılandırılmamış (NEXT_PUBLIC_ELEVENLABS_VERIFY_AGENT_ID eksik).');
        setMode('simulated');
        setPhase('running');
        runSimulated();
        return;
      }
      try {
        conversation.startSession({
          agentId: AGENT_ID,
          connectionType: 'webrtc',
          dynamicVariables: buildDynamicVariables(),
          clientTools: {
            confirm_field: async (params: { field: string; status: string; note?: string }) => {
              const field = params.field as ConfirmField;
              setConfirmations((prev) => [
                ...prev.filter((c) => c.field !== field),
                { field, status: params.status as FieldConfirmation['status'], note: params.note ?? null, atSec: Math.floor((Date.now() - startedAtRef.current) / 1000) },
              ]);
              return 'ok';
            },
          },
        });
        setPhase('running');
      } catch {
        setErrorMessage('Canlı görüşme başlatılamadı.');
        setMode('simulated');
        setPhase('running');
        runSimulated();
      }
    } else {
      setPhase('running');
      runSimulated();
    }
  }, [answers, mode, request.token, conversation, buildDynamicVariables, runSimulated, startRecorder, skipCamera]);

  const continueSimulated = useCallback(() => {
    setErrorMessage('');
    setMode('simulated');
    setPhase('running');
    runSimulated();
  }, [runSimulated]);

  const finishInterview = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stopClock();
    clearSimTimers();
    setPhase('finishing');

    try {
      conversation.endSession();
    } catch {
      // already disconnected — fine.
    }

    const blob = await stopRecorderAndGetBlob();
    stopTracks();

    const durationSec = Math.floor((Date.now() - startedAtRef.current) / 1000);

    const form = new FormData();
    form.append('video', blob, 'interview.webm');
    form.append(
      'payload',
      JSON.stringify({
        transcript: lines,
        confirmations,
        conversationId,
        durationSec,
        mode,
      }),
    );

    try {
      const res = await fetch(`/api/verify/${request.token}/interview/complete`, {
        method: 'POST',
        body: form,
      });
      const updated = await res.json();
      if (!res.ok) {
        setErrorMessage(updated.error ?? 'Doğrulama tamamlanamadı.');
        setPhase('error');
        return;
      }
      const fingerprint: string = updated.audit?.videoSha256 ? updated.audit.videoSha256.slice(0, 12) : '—';
      setReceipt({
        date: new Date(updated.completedAt ?? Date.now()).toLocaleString('tr-TR'),
        fingerprint,
        conversationId: updated.audit?.conversationId ?? conversationId,
      });
      setPhase('done');
      onCompleted(updated as VerificationRequest);
    } catch {
      setErrorMessage('Sunucuya bağlanılamadı. Lütfen tekrar deneyin.');
      setPhase('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation, stopRecorderAndGetBlob, stopTracks, lines, confirmations, conversationId, mode, request.token, onCompleted, stopClock, clearSimTimers]);

  if (!answers) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Önce bilgi formunu tamamlamalısınız.</p>
      </Card>
    );
  }

  if (phase === 'done' && receipt) {
    return (
      <Card>
        <p className="text-xs uppercase tracking-wide text-emerald-600">Tamamlandı</p>
        <h2 className="mt-1 font-serif text-xl font-semibold text-slate-900">Doğrulama kaydedildi</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <span className="text-xs uppercase tracking-wide text-slate-400">Tarih</span>
            <p className="text-slate-800">{receipt.date}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-slate-400">Video parmak izi (SHA-256, ilk 12)</span>
            <p className="font-mono text-slate-800">{receipt.fingerprint}</p>
          </div>
          {receipt.conversationId && (
            <div>
              <span className="text-xs uppercase tracking-wide text-slate-400">Görüşme kimliği</span>
              <p className="font-mono text-slate-800">{receipt.conversationId}</p>
            </div>
          )}
        </dl>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Adım 2 · Görüntülü doğrulama</p>
          <h2 className="mt-1 font-serif text-xl font-semibold text-slate-900">Görüntülü doğrulama</h2>
        </div>
        {phase === 'running' && (
          <div className="flex items-center gap-2 font-mono text-xs text-red-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
            REC {formatClock(elapsedSec)}
          </div>
        )}
      </div>

      {phase === 'consent' && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-600">
            {/* EN: This session will be recorded (video and audio) and used only for this application. */}
            Bu görüşme kaydedilecek (görüntü ve ses) ve yalnızca bu başvuru için kullanılacaktır. Kamera ve mikrofon
            izni isteyeceğiz.
          </p>
          {errorMessage && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
          <Button onClick={() => void startInterview()}>Görüşmeyi başlat</Button>
        </div>
      )}

      {phase === 'error' && (
        <div className="mt-4 space-y-4">
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>
          {mode === 'live' && <Button onClick={continueSimulated}>Simüle görüşmeyle devam et</Button>}
          {mode === 'simulated' && <Button onClick={() => void startInterview()}>Tekrar dene</Button>}
        </div>
      )}

      {phase === 'connecting' && (
        <p className="mt-4 text-sm text-slate-500">Bağlanılıyor…</p>
      )}

      {phase === 'finishing' && (
        <p className="mt-4 text-sm text-slate-500">
          {/* EN: Uploading and verifying... this may take up to ~60s while ElevenLabs analysis runs. */}
          Yükleniyor ve doğrulanıyor… (ElevenLabs analizi çalışırken bu işlem ~60 saniyeye kadar sürebilir)
        </p>
      )}

      {(phase === 'running' || phase === 'finishing') && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
              <video
                ref={videoRef}
                className="h-full w-full scale-x-[-1] object-cover"
                muted
                playsInline
                autoPlay
                aria-label="Kendi kamera görüntünüz"
              />
              {!hasCamera && (
                <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-slate-400">
                  Test modu: kamera atlandı (?skipCamera=1)
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={conversation.isSpeaking ? 'blue' : 'gray'}>
                {mode === 'live'
                  ? conversation.isSpeaking
                    ? 'Asistan konuşuyor'
                    : 'Dinleniyor'
                  : 'Simüle görüşme'}
              </Badge>
              {phase === 'running' && (
                <Button variant="ghost" onClick={() => void finishInterview()}>
                  Bitir
                </Button>
              )}
            </div>
            <TranscriptBubbles lines={lines} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Onay listesi</p>
            <FieldChecklist answers={answers} confirmations={confirmations} />
          </div>
        </div>
      )}
    </Card>
  );
}
