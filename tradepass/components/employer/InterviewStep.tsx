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
import { showIdMessage } from '@/lib/i18n';
import type { ConfirmField, FieldConfirmation, TranscriptLine, VerificationRequest, VoiceMode } from '@/lib/types';

const RECORDER_MIME_CANDIDATES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_VERIFY_AGENT_ID ?? '';
const CONFIGURED_MODE: VoiceMode = process.env.NEXT_PUBLIC_VOICE_MODE === 'live' ? 'live' : 'simulated';

type Phase = 'consent' | 'connecting' | 'running' | 'review' | 'finishing' | 'done' | 'error';

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
  referenceLanguage,
  onCompleted,
}: {
  request: VerificationRequest;
  workerName: string;
  referenceLanguage?: string | null;
  onCompleted: (updated: VerificationRequest) => void;
}) {
  return (
    <ConversationProvider>
      <InterviewInner request={request} workerName={workerName} referenceLanguage={referenceLanguage} onCompleted={onCompleted} />
    </ConversationProvider>
  );
}

function InterviewInner({
  request,
  workerName,
  referenceLanguage,
  onCompleted,
}: {
  request: VerificationRequest;
  workerName: string;
  referenceLanguage?: string | null;
  onCompleted: (updated: VerificationRequest) => void;
}) {
  const idMessage = showIdMessage(referenceLanguage);
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
  const [reviewBlob, setReviewBlob] = useState<Blob | null>(null);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reviewUrlRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const clockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finishedRef = useRef(false);
  // Web Audio graph used to mix the AI agent's voice into the recorded video (see
  // attachAgentAudioToRecording below). Kept in refs so cleanup can tear them down
  // without re-running the effect that created them.
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioMixContextRef = useRef<AudioContext | null>(null);
  const agentAudioObserverRef = useRef<MutationObserver | null>(null);
  const agentAudioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

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
    micStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const clearSimTimers = useCallback(() => {
    simTimersRef.current.forEach((t) => clearTimeout(t));
    simTimersRef.current = [];
  }, []);

  const stopAgentAudioMix = useCallback(() => {
    agentAudioObserverRef.current?.disconnect();
    agentAudioObserverRef.current = null;
    agentAudioSourceRef.current = null;
    if (audioMixContextRef.current) {
      audioMixContextRef.current.close().catch(() => undefined);
      audioMixContextRef.current = null;
    }
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      stopClock();
      clearSimTimers();
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') rec.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      stopAgentAudioMix();
      if (reviewUrlRef.current) URL.revokeObjectURL(reviewUrlRef.current);
    };
  }, [stopClock, clearSimTimers, stopAgentAudioMix]);

  /**
   * Mixes the ElevenLabs agent's spoken audio into the recorded video, so the final
   * clip captures both sides of the conversation (today only the employer's own mic
   * is recorded — the agent's voice plays through the browser's normal audio output
   * and was never part of the recording).
   *
   * There is no public SDK method that hands back the agent's audio as a MediaStream
   * (checked @elevenlabs/client@1.25.0: OutputController only exposes volume/frequency
   * helpers). Internally, WebAudioAdapter.attachRemoteTrack() plays the remote track
   * through a hidden <audio> element appended to document.body (style.display='none').
   * This watches the DOM for that element, then routes its audio — via a small Web
   * Audio graph — into the same MediaStreamDestination as the employer's mic, so
   * MediaRecorder captures both. The agent audio is also reconnected to the
   * AudioContext's speaker output so the employer keeps hearing it normally.
   *
   * Only meaningful in live mode: simulated mode uses window.speechSynthesis, which
   * has no MediaStream/track API to tap.
   */
  const attachAgentAudioToRecording = useCallback((micStream: MediaStream, videoTrack: MediaStreamTrack): MediaStream => {
    const audioCtx = new AudioContext();
    audioMixContextRef.current = audioCtx;
    const destination = audioCtx.createMediaStreamDestination();

    const micSource = audioCtx.createMediaStreamSource(micStream);
    micSource.connect(destination);

    const attachAgentElement = (el: HTMLAudioElement) => {
      if (agentAudioSourceRef.current) return; // already wired up
      try {
        const agentSource = audioCtx.createMediaElementSource(el);
        agentSource.connect(destination);
        agentSource.connect(audioCtx.destination); // keep it audible to the employer
        agentAudioSourceRef.current = agentSource;
      } catch {
        // createMediaElementSource throws if this element is already wired to a
        // different AudioContext/source — non-fatal, recording continues mic-only.
      }
    };

    // The agent's hidden <audio> element may already exist (fast connect) or may be
    // appended shortly after (typical case — it's created once the WebRTC remote
    // track arrives). Check immediately, then watch for it for a short window.
    const audioElements = document.querySelectorAll('audio');
    let existing: HTMLAudioElement | null = null;
    for (let i = 0; i < audioElements.length; i++) {
      if (audioElements[i].style.display === 'none') {
        existing = audioElements[i];
        break;
      }
    }
    if (existing) {
      attachAgentElement(existing);
    } else {
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node instanceof HTMLAudioElement) {
              attachAgentElement(node);
              observer.disconnect();
              agentAudioObserverRef.current = null;
              return;
            }
          }
        }
      });
      observer.observe(document.body, { childList: true });
      agentAudioObserverRef.current = observer;
      // Stop watching after a reasonable window so a leftover observer doesn't linger
      // if the agent never connects (e.g. it falls back to simulated mode instead).
      setTimeout(() => {
        if (agentAudioObserverRef.current === observer) {
          observer.disconnect();
          agentAudioObserverRef.current = null;
        }
      }, 15000);
    }

    return new MediaStream([videoTrack, ...destination.stream.getAudioTracks()]);
  }, []);

  // The live camera preview <video> element is only mounted during the 'connecting'
  // and 'running' phases (see render below). startRecorder() grabs the stream while
  // still in 'connecting', which can run before that element exists yet, so
  // videoRef.current can be null at that point and the srcObject assignment there
  // silently no-ops — leaving the preview black even though recording itself is fine.
  // This effect re-attaches the stream to the <video> element every time either
  // becomes available, regardless of render/mount order.
  useEffect(() => {
    if ((phase === 'connecting' || phase === 'running') && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [phase, hasCamera]);

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
   *
   * This only acquires the devices and wires up the live self-preview — it does NOT
   * start MediaRecorder. That happens in startMediaRecorder() below, once we know
   * whether we can also mix in the agent's audio (live mode only).
   */
  const startRecorder = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    streamRef.current = stream;
    micStreamRef.current = stream;
    setHasCamera(true);
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);
    }
  }, []);

  /** Starts MediaRecorder against `stream` (video + audio, with the agent's voice
   * already mixed in for live mode via attachAgentAudioToRecording). */
  const startMediaRecorder = useCallback((stream: MediaStream) => {
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
        if (streamRef.current) startMediaRecorder(streamRef.current);
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
        // Live mode: mix the agent's voice into the recording before starting
        // MediaRecorder (see attachAgentAudioToRecording for why this can't be
        // done via a supported SDK API). If there's no camera/mic stream
        // (skipCamera dev flag), there's nothing to record either way.
        if (streamRef.current && micStreamRef.current) {
          const videoTrack = streamRef.current.getVideoTracks()[0];
          const mixedStream = videoTrack
            ? attachAgentAudioToRecording(micStreamRef.current, videoTrack)
            : streamRef.current;
          startMediaRecorder(mixedStream);
        }
      } catch {
        setErrorMessage('Canlı görüşme başlatılamadı.');
        setMode('simulated');
        setPhase('running');
        if (streamRef.current) startMediaRecorder(streamRef.current);
        runSimulated();
      }
    } else {
      setPhase('running');
      if (streamRef.current) startMediaRecorder(streamRef.current);
      runSimulated();
    }
  }, [
    answers,
    mode,
    request.token,
    conversation,
    buildDynamicVariables,
    runSimulated,
    startRecorder,
    startMediaRecorder,
    attachAgentAudioToRecording,
    skipCamera,
  ]);

  const continueSimulated = useCallback(() => {
    setErrorMessage('');
    setMode('simulated');
    setPhase('running');
    runSimulated();
  }, [runSimulated]);

  /** Stops recording/the agent session and moves to a review step — nothing is
   * uploaded yet. The employer can watch the recording back and choose to retake
   * it (discard + start over) or submit it (upload as-is). */
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
    stopAgentAudioMix();

    if (reviewUrlRef.current) {
      URL.revokeObjectURL(reviewUrlRef.current);
      reviewUrlRef.current = null;
    }
    const url = blob.size > 0 ? URL.createObjectURL(blob) : null;
    reviewUrlRef.current = url;
    setReviewBlob(blob);
    setReviewUrl(url);
    setPhase('review');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation, stopRecorderAndGetBlob, stopTracks, stopAgentAudioMix, stopClock, clearSimTimers]);

  /** Discards the reviewed recording and restarts the whole interview from the
   * beginning (fresh camera/mic stream and, for live mode, a fresh ElevenLabs
   * session — the previous voice session already ended when "Bitir" was clicked,
   * so a full restart is the reliable option rather than trying to splice clips). */
  const retakeInterview = useCallback(() => {
    if (reviewUrlRef.current) {
      URL.revokeObjectURL(reviewUrlRef.current);
      reviewUrlRef.current = null;
    }
    setReviewBlob(null);
    setReviewUrl(null);
    setLines([]);
    setConfirmations([]);
    setConversationId(null);
    setElapsedSec(0);
    finishedRef.current = false;
    setPhase('consent');
  }, []);

  /** Uploads the reviewed recording. Only reachable from the 'review' phase. */
  const submitInterview = useCallback(async () => {
    if (!reviewBlob) return;
    setPhase('finishing');

    const durationSec = Math.floor((Date.now() - startedAtRef.current) / 1000);

    const form = new FormData();
    form.append('video', reviewBlob, 'interview.webm');
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
      if (reviewUrlRef.current) {
        URL.revokeObjectURL(reviewUrlRef.current);
        reviewUrlRef.current = null;
      }
      setReviewUrl(null);
      setReviewBlob(null);
      setPhase('done');
      onCompleted(updated as VerificationRequest);
    } catch {
      setErrorMessage('Sunucuya bağlanılamadı. Lütfen tekrar deneyin.');
      setPhase('error');
    }
  }, [reviewBlob, lines, confirmations, conversationId, mode, request.token, onCompleted]);

  if (!answers) {
    return (
      <Card>
        <p className="text-sm text-foreground/60">Önce bilgi formunu tamamlamalısınız.</p>
      </Card>
    );
  }

  if (phase === 'done' && receipt) {
    return (
      <Card className="animate-celebrate">
        <p className="text-xs uppercase tracking-wide text-signal">Tamamlandı</p>
        <h2 className="font-stamp mt-1 text-2xl font-bold uppercase tracking-wide text-foreground">Doğrulama kaydedildi</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <span className="text-xs uppercase tracking-wide text-foreground/40">Tarih</span>
            <p className="text-foreground/80">{receipt.date}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-foreground/40">Video parmak izi (SHA-256, ilk 12)</span>
            <p className="font-mono text-foreground/80">{receipt.fingerprint}</p>
          </div>
          {receipt.conversationId && (
            <div>
              <span className="text-xs uppercase tracking-wide text-foreground/40">Görüşme kimliği</span>
              <p className="font-mono text-foreground/80">{receipt.conversationId}</p>
            </div>
          )}
        </dl>
        <div className="mt-6">
          <a
            href={`/api/employments/${request.employmentId}/wev-form`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* EN: Download the employer letter draft (PDF) */}
            <Button>Doğrulama belgesini indir (PDF)</Button>
          </a>
        </div>
      </Card>
    );
  }

  return (
    <Card className="animate-rise-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-foreground/40">Adım 2 · Görüntülü doğrulama</p>
          <h2 className="font-stamp mt-1 text-2xl font-bold uppercase tracking-wide text-foreground">Görüntülü doğrulama</h2>
        </div>
        {phase === 'running' && (
          <div className="flex items-center gap-2 font-mono text-xs text-orange">
            <span className="animate-rec h-2.5 w-2.5 bg-orange" />
            REC {formatClock(elapsedSec)}
          </div>
        )}
      </div>

      {phase === 'consent' && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-foreground/60">
            {/* EN: This session will be recorded (video and audio) and used only for this application. */}
            Bu görüşme kaydedilecek (görüntü ve ses) ve yalnızca bu başvuru için kullanılacaktır. Kamera ve mikrofon
            izni isteyeceğiz.
          </p>
          <p className="border border-caution/40 bg-caution/10 p-3 text-sm text-caution">
            {/* EN: Please hold your photo work ID/badge up to the camera and keep it steady
                for about 5 seconds. Shown in the reference's own language (Reference.language). */}
            {idMessage}
          </p>
          {errorMessage && <p className="border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{errorMessage}</p>}
          <Button onClick={() => void startInterview()}>Görüşmeyi başlat</Button>
        </div>
      )}

      {phase === 'error' && (
        <div className="mt-4 space-y-4">
          <p className="border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{errorMessage}</p>
          {mode === 'live' && <Button onClick={continueSimulated}>Simüle görüşmeyle devam et</Button>}
          {mode === 'simulated' && <Button onClick={() => void startInterview()}>Tekrar dene</Button>}
        </div>
      )}

      {phase === 'connecting' && (
        <div className="mt-4 space-y-3">
          <div className="relative aspect-video w-full overflow-hidden border border-line bg-background">
            <video
              ref={videoRef}
              className="h-full w-full scale-x-[-1] object-cover"
              muted
              playsInline
              autoPlay
              aria-label="Kendi kamera görüntünüz"
            />
            {skipCamera && (
              <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-foreground/40">
                Test modu: kamera atlandı (?skipCamera=1)
              </div>
            )}
          </div>
          <p className="border border-caution/40 bg-caution/10 p-3 text-sm text-caution">{idMessage}</p>
          <p className="text-sm text-foreground/50">Bağlanılıyor…</p>
        </div>
      )}

      {phase === 'finishing' && (
        <p className="mt-4 text-sm text-foreground/50">
          {/* EN: Uploading and verifying... this may take up to ~60s while ElevenLabs analysis runs. */}
          Yükleniyor ve doğrulanıyor… (ElevenLabs analizi çalışırken bu işlem ~60 saniyeye kadar sürebilir)
        </p>
      )}

      {phase === 'review' && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-foreground/60">
            {/* EN: Watch your recording back. If you're not happy with it, you can redo the interview from scratch before sending it. */}
            Kaydınızı izleyin. Beğenmediyseniz göndermeden önce görüşmeyi baştan tekrar çekebilirsiniz.
          </p>
          <div className="relative aspect-video w-full overflow-hidden border border-line bg-background">
            {reviewUrl ? (
              <video src={reviewUrl} className="h-full w-full object-cover" controls playsInline aria-label="Kaydın önizlemesi" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-foreground/40">
                Kayıt yok (test modu: kamera atlandı)
              </div>
            )}
          </div>
          {errorMessage && <p className="border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{errorMessage}</p>}
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={retakeInterview}>Tekrar çek</Button>
            <Button onClick={() => void submitInterview()}>Gönder</Button>
          </div>
        </div>
      )}

      {phase === 'running' && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <div className="relative aspect-video w-full overflow-hidden border border-line bg-background">
              <video
                ref={videoRef}
                className="h-full w-full scale-x-[-1] object-cover"
                muted
                playsInline
                autoPlay
                aria-label="Kendi kamera görüntünüz"
              />
              {!hasCamera && (
                <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-foreground/40">
                  Test modu: kamera atlandı (?skipCamera=1)
                </div>
              )}
              {hasCamera && (
                <div className="absolute inset-x-0 bottom-0 bg-caution/90 px-3 py-2 text-center text-xs font-medium text-plate">
                  {idMessage}
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
            <p className="mb-2 text-sm font-medium text-foreground/70">Onay listesi</p>
            <FieldChecklist answers={answers} confirmations={confirmations} />
          </div>
        </div>
      )}
    </Card>
  );
}
