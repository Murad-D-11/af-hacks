'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import type { Employment, TranscriptLine } from '@/lib/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import MicButton, { type MicState } from './MicButton';
import TranscriptBubble from './TranscriptBubble';
import EmploymentClaimCard from './EmploymentClaimCard';
import { SIMULATED_INTAKE_SCRIPT } from '@/lib/intake/simulated';

const VOICE_MODE = process.env.NEXT_PUBLIC_VOICE_MODE === 'live' ? 'live' : 'simulated';
const INTAKE_AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_INTAKE_AGENT_ID;

type SubmitPhase = 'idle' | 'submitting' | 'done' | 'error';

function speakTurkish(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'tr-TR';
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
}

function IntakeInner({ workerId, workerName }: { workerId: string; workerName: string }) {
  const [micState, setMicState] = useState<MicState>('idle');
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle');
  const [employments, setEmployments] = useState<Employment[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const simulatedTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const submittedRef = useRef(false);

  const submitIntake = useCallback(
    async (finalTranscript: TranscriptLine[], mode: 'live' | 'simulated', convId: string | null) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitPhase('submitting');
      try {
        const res = await fetch(`/api/workers/${workerId}/intake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, conversationId: convId, clientTranscript: finalTranscript }),
        });
        if (!res.ok) throw new Error(`Intake request failed: ${res.status}`);
        const data = await res.json();
        setEmployments(data.employments ?? []);
        setSubmitPhase('done');
      } catch (err) {
        console.error(err);
        // EN: Something went wrong structuring your history. You can still continue —
        // we'll show what we captured.
        setErrorMessage('Geçmişiniz düzenlenirken bir sorun oluştu. Yine de devam edebilirsiniz — kaydettiklerimizi göstereceğiz.');
        setSubmitPhase('error');
      }
    },
    [workerId]
  );

  const conversation = useConversation({
    onConnect: ({ conversationId: id }) => {
      setConversationId(id);
      setMicState('active');
    },
    onDisconnect: () => {
      setMicState('ended');
      submitIntake(transcriptRef.current, 'live', conversationIdRef.current);
    },
    onMessage: ({ message, role }) => {
      setTranscript((prev) => {
        const next: TranscriptLine[] = [
          ...prev,
          { speaker: role === 'agent' ? 'agent' : 'worker', original: message, english: null, atSec: Math.round(performance.now() / 1000) },
        ];
        transcriptRef.current = next;
        return next;
      });
    },
    onError: (message) => {
      console.error('ElevenLabs conversation error:', message);
      if (VOICE_MODE === 'live') {
        // Live start failed — fall back to the simulated script so the demo never breaks.
        startSimulated();
      }
    },
  });

  // Keep refs in sync so callbacks registered once still see fresh values.
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const conversationIdRef = useRef<string | null>(null);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);

  useEffect(() => {
    return () => {
      simulatedTimers.current.forEach(clearTimeout);
    };
  }, []);

  const startSimulated = useCallback(() => {
    setMicState('active');
    setTranscript([]);
    transcriptRef.current = [];

    for (const line of SIMULATED_INTAKE_SCRIPT) {
      const timer = setTimeout(() => {
        setTranscript((prev) => {
          const next: TranscriptLine[] = [...prev, { speaker: line.speaker, original: line.original, english: line.english, atSec: line.atSec }];
          transcriptRef.current = next;
          return next;
        });
        if (line.speaker === 'agent') {
          void speakTurkish(line.original);
        }
      }, line.atSec * 1000);
      simulatedTimers.current.push(timer);
    }

    const lastLine = SIMULATED_INTAKE_SCRIPT[SIMULATED_INTAKE_SCRIPT.length - 1];
    const endTimer = setTimeout(() => {
      setMicState('ended');
      submitIntake(transcriptRef.current, 'simulated', null);
    }, (lastLine.atSec + 3) * 1000);
    simulatedTimers.current.push(endTimer);
  }, [submitIntake]);

  const handleStart = useCallback(async () => {
    setMicState('requesting');
    setErrorMessage(null);

    if (VOICE_MODE === 'live' && INTAKE_AGENT_ID) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        conversation.startSession({
          agentId: INTAKE_AGENT_ID,
          dynamicVariables: { worker_name: workerName },
        });
      } catch (err) {
        console.error('Failed to start live conversation, falling back to simulated:', err);
        startSimulated();
      }
      return;
    }

    startSimulated();
  }, [conversation, startSimulated, workerName]);

  const handleEnd = useCallback(() => {
    if (VOICE_MODE === 'live' && INTAKE_AGENT_ID && conversationId) {
      conversation.endSession();
    } else {
      simulatedTimers.current.forEach(clearTimeout);
      setMicState('ended');
      submitIntake(transcriptRef.current, 'simulated', null);
    }
  }, [conversation, conversationId, submitIntake]);

  /** Discards the just-submitted intake and returns to the mic button so the worker
   * can speak again from scratch. The next successful submission overwrites the
   * previous one server-side (POST /api/workers/[id]/intake replaces worker.intake
   * and re-upserts matching employments), so nothing extra needs to happen here. */
  const handleRedo = useCallback(() => {
    simulatedTimers.current.forEach(clearTimeout);
    simulatedTimers.current = [];
    submittedRef.current = false;
    setTranscript([]);
    transcriptRef.current = [];
    setConversationId(null);
    conversationIdRef.current = null;
    setEmployments(null);
    setErrorMessage(null);
    setSubmitPhase('idle');
    setMicState('idle');
  }, []);

  return (
    <div className="space-y-8">
      {micState === 'idle' && (
        <Card className="animate-stamp-in text-center">
          <p className="mb-6 text-sm text-foreground/60">
            {/* EN: We'll ask to use your microphone. Everything you say is recorded
                and transcribed so your former employers can verify it later — nothing
                is shared until you send them a link. */}
            Mikrofonunuzu kullanmak için izin isteyeceğiz. Söylediğiniz her şey kaydedilir ve yazıya dökülür, böylece
            eski işverenleriniz daha sonra doğrulayabilir — siz onlara bir bağlantı gönderene kadar hiçbir bilgi
            paylaşılmaz.
          </p>
          <div className="flex justify-center">
            <MicButton state={micState} onStart={handleStart} onEnd={handleEnd} />
          </div>
        </Card>
      )}

      {(micState === 'requesting' || micState === 'active') && (
        <div className="flex flex-col items-center gap-6">
          <MicButton state={micState} onStart={handleStart} onEnd={handleEnd} />
          <div className="w-full space-y-2">
            {transcript.map((line, i) => (
              <TranscriptBubble key={i} line={line} />
            ))}
          </div>
        </div>
      )}

      {micState === 'ended' && submitPhase !== 'done' && (
        <Card className="text-center">
          <p className="text-sm text-foreground/60">
            {/* EN: {errorMessage} / Structuring your history… this can take up to a minute. */}
            {submitPhase === 'error' ? errorMessage : 'Geçmişiniz düzenleniyor… bu işlem bir dakikaya kadar sürebilir.'}
          </p>
        </Card>
      )}

      {micState === 'ended' && submitPhase === 'done' && employments && (
        <div className="animate-rise-in grid gap-6 lg:grid-cols-2">
          <div>
            {/* EN: Transcript */}
            <h2 className="font-stamp mb-3 text-lg font-bold uppercase tracking-wide text-foreground">Konuşma Metni</h2>
            <div className="space-y-2 border border-line bg-background p-4">
              {transcript.map((line, i) => (
                <TranscriptBubble key={i} line={line} />
              ))}
            </div>
          </div>
          <div>
            {/* EN: Work history */}
            <h2 className="font-stamp mb-3 text-lg font-bold uppercase tracking-wide text-foreground">Çalışma Geçmişi</h2>
            <div className="space-y-4">
              {employments.length === 0 ? (
                <Card>
                  <p className="text-sm text-foreground/50">
                    {/* EN: No employment could be structured from this conversation yet. */}
                    Bu görüşmeden henüz bir iş geçmişi çıkarılamadı.
                  </p>
                </Card>
              ) : (
                employments.map((e) => <EmploymentClaimCard key={e.id} employment={e} />)
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <Button variant="secondary" onClick={handleRedo}>
                {/* EN: Redo intake */}
                Tekrar kaydet
              </Button>
              <a href={`/api/workers/${workerId}/package`} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary">
                  {/* EN: Download evidence package (PDF) */}
                  Kanıt paketini indir (PDF)
                </Button>
              </a>
              <a href={`/workers/${workerId}`}>
                <Button>
                  {/* EN: Continue → */}
                  Devam et →
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IntakeConversation({ workerId, workerName }: { workerId: string; workerName: string }) {
  return (
    <ConversationProvider>
      <IntakeInner workerId={workerId} workerName={workerName} />
    </ConversationProvider>
  );
}
