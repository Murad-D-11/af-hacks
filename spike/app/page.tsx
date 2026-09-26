"use client";

/**
 * TradePass A1 spike: throwaway page that proves
 *  1. both ElevenLabs agents start a Turkish voice session in Chrome on localhost,
 *  2. the verification agent fires the `confirm_field` client tool (target: 7 calls),
 *  3. the webcam + mic record in parallel with the voice session (MediaRecorder),
 *  4. we get a conversationId to hand to `el-fetch.ts`.
 *
 * Everything the SDK emits is logged raw so we can document the real payload shapes.
 * SDK facts verified against node_modules/@elevenlabs/react@1.15.2 type defs:
 *  - React `startSession(options)` returns void (no promise); the id arrives via onConnect.
 *  - onMessage payload: { message, role: "user"|"agent", source (deprecated), event_id? }.
 *  - dynamicVariables: Record<string, string | number | boolean>.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";

type TestKind = "intake" | "verify";
type LogKind =
  | "info"
  | "status"
  | "connect"
  | "disconnect"
  | "message"
  | "mode"
  | "tool"
  | "agent_tool"
  | "recorder"
  | "event"
  | "error";

type LogEntry = { id: number; at: string; kind: LogKind; data: unknown };
type ToolCall = { at: string; params: unknown };

// Must be referenced literally so Next.js inlines them at build time.
const AGENT_IDS: Record<TestKind, string> = {
  intake: process.env.NEXT_PUBLIC_ELEVENLABS_INTAKE_AGENT_ID ?? "",
  verify: process.env.NEXT_PUBLIC_ELEVENLABS_VERIFY_AGENT_ID ?? "",
};

const CONFIRM_TARGET = 7;
const CONNECT_TIMEOUT_MS = 15_000;
const MAX_LOG = 400;
// Incoming event types that would flood the log (audio chunks, keepalives, VAD scores).
const NOISY_EVENT_TYPES = new Set(["audio", "ping", "vad_score", "audio_alignment"]);

// Kocaeli demo claim: the six DUTIES_309A `tr` labels (d_mcc, d_plc, d_motors, d_drawings, d_conduit, d_loto)
// from the Context Pack, verbatim, joined with ", ".
const DUTIES_TR_DEMO = [
  "Motor kontrol merkezi kurulumu",
  "PLC kontrol panosu kablolaması",
  "Motor ve sürücü arızalarını tespit edip giderme",
  "Elektrik projelerini okuma ve revize etme",
  "Kablo kanalı ve kablo tavası döşeme",
  "Kilitleme-etiketleme ve iş güvenliği",
].join(", ");

const DEFAULT_VARS: Record<TestKind, Record<string, string>> = {
  intake: { worker_name: "Emre Yıldız" },
  verify: {
    supervisor_name: "Murat Demir",
    worker_name: "Emre Yıldız",
    company_name: "Kocaeli Endüstri Elektrik",
    role_title: "Endüstriyel Elektrikçi",
    start_tr: "Temmuz 2013",
    end_tr: "Mart 2019",
    hours: "45",
    duties_tr: DUTIES_TR_DEMO,
  },
};

const RECORDER_MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
];

function nowStamp(): string {
  return new Date().toISOString().slice(11, 23);
}

/** JSON.stringify that survives Errors, Events, DOM nodes and cycles. */
function safeJson(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(
      value,
      (_key, v: unknown) => {
        if (v instanceof Error) return { name: v.name, message: v.message };
        if (typeof Event !== "undefined" && v instanceof Event) return { eventType: v.type };
        if (typeof Node !== "undefined" && v instanceof Node) return `[${v.nodeName}]`;
        if (typeof v === "object" && v !== null) {
          if (seen.has(v)) return "[circular]";
          seen.add(v);
        }
        return v;
      },
      2,
    );
  } catch (err) {
    return `[unserializable: ${String(err)}]`;
  }
}

/** Parses the textarea JSON into the shape the SDK accepts for dynamicVariables. */
function parseVars(text: string): Record<string, string | number | boolean> {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Dynamic variables must be a JSON object.");
  }
  const out: Record<string, string | number | boolean> = {};
  for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
      out[key] = val;
    } else {
      throw new Error(`Variable "${key}" must be a string, number or boolean.`);
    }
  }
  return out;
}

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return RECORDER_MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
}

function errorText(err: unknown): string {
  if (err instanceof DOMException) return `${err.name}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return String(err);
}

export default function Page() {
  return (
    <ConversationProvider>
      <Spike />
    </ConversationProvider>
  );
}

function Spike() {
  const [activeTest, setActiveTest] = useState<TestKind | null>(null);
  const [conversationId, setConversationId] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [varsText, setVarsText] = useState<Record<TestKind, string>>({
    intake: JSON.stringify(DEFAULT_VARS.intake, null, 2),
    verify: JSON.stringify(DEFAULT_VARS.verify, null, 2),
  });
  const [showRawEvents, setShowRawEvents] = useState(false);
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const logIdRef = useRef(0);
  const showRawRef = useRef(false);
  const statusRef = useRef<string>("disconnected");
  const connectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoUrlRef = useRef("");

  useEffect(() => {
    showRawRef.current = showRawEvents;
  }, [showRawEvents]);

  const push = useCallback((kind: LogKind, data: unknown) => {
    const entry: LogEntry = { id: ++logIdRef.current, at: nowStamp(), kind, data };
    setLog((prev) => {
      const next = [...prev, entry];
      return next.length > MAX_LOG ? next.slice(next.length - MAX_LOG) : next;
    });
  }, []);

  const clearConnectTimer = useCallback(() => {
    if (connectTimerRef.current) {
      clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stopRecorder = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop(); // onstop handles blob + track cleanup
    } else {
      stopTracks();
    }
  }, [stopTracks]);

  const startCameraRecorder = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("getUserMedia unavailable (needs https or localhost).");
    }
    if (typeof MediaRecorder === "undefined") {
      throw new Error("MediaRecorder unavailable in this browser.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    });
    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);
    }

    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = "";
      setVideoUrl("");
    }

    const mimeType = pickRecorderMime();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    const startedAt = performance.now();

    rec.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onerror = (e: Event) => push("error", { source: "MediaRecorder", event: e.type });
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
      const seconds = Math.round((performance.now() - startedAt) / 100) / 10;
      push("recorder", {
        event: "stop",
        bytes: blob.size,
        megabytes: Math.round((blob.size / 1024 / 1024) * 100) / 100,
        mimeType: blob.type,
        chunks: chunksRef.current.length,
        seconds,
      });
      if (blob.size > 0) {
        const url = URL.createObjectURL(blob);
        videoUrlRef.current = url;
        setVideoUrl(url);
      } else {
        push("error", { source: "MediaRecorder", message: "Recording is empty (0 bytes)." });
      }
      setRecording(false);
      stopTracks();
    };

    rec.start(1000); // 1s timeslices so a crash still leaves chunks
    recorderRef.current = rec;
    setRecording(true);
    push("recorder", {
      event: "start",
      mimeType: rec.mimeType || mimeType || "(browser default)",
      videoTracks: stream.getVideoTracks().map((t) => t.label),
      audioTracks: stream.getAudioTracks().map((t) => t.label),
    });
  }, [push, stopTracks]);

  // Callbacks registered here stay ref-stable across renders (SDK registers them with the provider).
  const conversation = useConversation({
    onConnect: ({ conversationId: id }) => {
      clearConnectTimer();
      setConversationId(id);
      push("connect", { conversationId: id });
    },
    onDisconnect: (details) => {
      clearConnectTimer();
      push("disconnect", details);
      stopRecorder();
      setActiveTest(null);
    },
    onMessage: (payload) => push("message", payload),
    onModeChange: (payload) => push("mode", payload),
    onStatusChange: (payload) => {
      statusRef.current = payload.status;
      push("status", payload);
    },
    onError: (message, context) => push("error", { message, context }),
    onUnhandledClientToolCall: (payload) =>
      push("error", { message: "Unhandled client tool call (name mismatch?)", payload }),
    onAgentToolRequest: (payload) => push("agent_tool", { request: payload }),
    onAgentToolResponse: (payload) => push("agent_tool", { response: payload }),
    onIncomingEvent: (event: unknown) => {
      if (!showRawRef.current) return;
      const type =
        typeof event === "object" && event !== null && "type" in event
          ? String((event as { type: unknown }).type)
          : "";
      if (NOISY_EVENT_TYPES.has(type)) return;
      push("event", event);
    },
  });

  const { status, isSpeaking } = conversation;
  const busy = activeTest !== null || status === "connecting" || status === "connected";

  const startTest = useCallback(
    async (kind: TestKind) => {
      const agentId = AGENT_IDS[kind];
      if (!agentId) {
        push("error", {
          message: `Missing NEXT_PUBLIC_ELEVENLABS_${kind === "intake" ? "INTAKE" : "VERIFY"}_AGENT_ID in spike/.env.local (restart npm run dev after editing).`,
        });
        return;
      }

      let dynamicVariables: Record<string, string | number | boolean>;
      try {
        dynamicVariables = parseVars(varsText[kind]);
      } catch (err) {
        push("error", { message: `Dynamic variables JSON invalid: ${errorText(err)}` });
        return;
      }

      setConversationId("");
      setToolCalls([]);
      setCopied(false);
      setActiveTest(kind);
      push("info", { test: kind, agentId, dynamicVariables });

      if (kind === "verify") {
        try {
          await startCameraRecorder();
        } catch (err) {
          push("error", { source: "camera", message: errorText(err) });
          stopTracks();
          setActiveTest(null);
          return;
        }
      }

      try {
        conversation.startSession({
          agentId,
          connectionType: "webrtc",
          dynamicVariables,
          clientTools: {
            // Must be configured in the dashboard as a BLOCKING client tool named exactly `confirm_field`.
            confirm_field: async (params: unknown) => {
              const at = nowStamp();
              push("tool", { name: "confirm_field", params });
              setToolCalls((prev) => [...prev, { at, params }]);
              return "ok";
            },
          },
        });
      } catch (err) {
        push("error", { source: "startSession", message: errorText(err) });
        stopRecorder();
        setActiveTest(null);
        return;
      }

      clearConnectTimer();
      connectTimerRef.current = setTimeout(() => {
        if (statusRef.current !== "connected") {
          push("error", {
            message: `No connection after ${CONNECT_TIMEOUT_MS / 1000}s. Check the agent is public, the ID is right, and mic permission was granted.`,
          });
        }
      }, CONNECT_TIMEOUT_MS);
    },
    [varsText, push, startCameraRecorder, stopTracks, stopRecorder, clearConnectTimer, conversation],
  );

  const endTest = useCallback(() => {
    clearConnectTimer();
    try {
      conversation.endSession();
    } catch (err) {
      push("error", { source: "endSession", message: errorText(err) });
    }
    stopRecorder();
    setActiveTest(null);
  }, [conversation, stopRecorder, clearConnectTimer, push]);

  // Cleanup on unmount: release camera and object URLs.
  useEffect(() => {
    return () => {
      clearConnectTimer();
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    };
  }, [clearConnectTimer]);

  const fetchCommand = conversationId ? `npx.cmd tsx el-fetch.ts ${conversationId}` : "";

  const copyCommand = useCallback(async () => {
    if (!fetchCommand) return;
    try {
      await navigator.clipboard.writeText(fetchCommand);
      setCopied(true);
    } catch (err) {
      push("error", { source: "clipboard", message: errorText(err) });
    }
  }, [fetchCommand, push]);

  const confirmCount = toolCalls.length;

  return (
    <main className="spike">
      <header className="spike-head">
        <p className="eyebrow">TradePass · A1 spike · throwaway</p>
        <h1>ElevenLabs agent bench</h1>
        <p className="lede">
          Turkish voice sessions, <code>confirm_field</code> client tool, parallel webcam recording.
        </p>
      </header>

      <section className="grid">
        <div className="panel">
          <div className="status-row" aria-live="polite">
            <span className={`dot dot-${status}`} aria-hidden="true" />
            <span>
              status: <strong>{status}</strong>
              {status === "connected" ? ` · ${isSpeaking ? "agent speaking" : "listening"}` : ""}
            </span>
          </div>

          <div className="buttons">
            <button type="button" onClick={() => void startTest("intake")} disabled={busy}>
              Test intake agent
            </button>
            <button type="button" onClick={() => void startTest("verify")} disabled={busy}>
              Test verification agent
            </button>
            <button type="button" className="ghost" onClick={endTest} disabled={!busy}>
              End session
            </button>
          </div>

          <dl className="facts">
            <dt>Intake agent ID</dt>
            <dd>{AGENT_IDS.intake || <em className="warn">missing in .env.local</em>}</dd>
            <dt>Verify agent ID</dt>
            <dd>{AGENT_IDS.verify || <em className="warn">missing in .env.local</em>}</dd>
            <dt>Conversation ID</dt>
            <dd>{conversationId || "none yet"}</dd>
            <dt>confirm_field calls</dt>
            <dd>
              <strong className={confirmCount >= CONFIRM_TARGET ? "ok" : ""}>{confirmCount}</strong> /{" "}
              {CONFIRM_TARGET} expected (verification)
            </dd>
          </dl>

          {fetchCommand && (
            <div className="cmd">
              <code>{fetchCommand}</code>
              <button type="button" className="ghost small" onClick={() => void copyCommand()}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}

          <label className="toggle">
            <input
              type="checkbox"
              checked={showRawEvents}
              onChange={(e) => setShowRawEvents(e.target.checked)}
            />
            Log raw incoming events (audio/ping/vad filtered out)
          </label>
        </div>

        <div className="panel">
          <h2>Webcam (verification test only)</h2>
          <video
            ref={videoRef}
            className="preview"
            muted
            playsInline
            autoPlay
            aria-label="Live webcam preview"
          />
          <p className="small-text">
            {recording ? "● recording" : "not recording"}
            {videoUrl && (
              <>
                {" · "}
                <a href={videoUrl} download="spike-verify.webm">
                  download last recording
                </a>
              </>
            )}
          </p>
          {videoUrl && (
            <video className="preview" src={videoUrl} controls aria-label="Last recording playback" />
          )}
        </div>
      </section>

      <section className="grid">
        {(["intake", "verify"] as const).map((kind) => (
          <div className="panel" key={kind}>
            <label htmlFor={`vars-${kind}`}>
              <h2>{kind === "intake" ? "Intake" : "Verification"} dynamic variables (JSON)</h2>
            </label>
            <textarea
              id={`vars-${kind}`}
              value={varsText[kind]}
              onChange={(e) => setVarsText((prev) => ({ ...prev, [kind]: e.target.value }))}
              rows={kind === "intake" ? 4 : 12}
              spellCheck={false}
              disabled={busy}
            />
            {kind === "verify" && (
              <p className="small-text">
                duties_tr = the six Kocaeli DUTIES_309A tr labels (d_mcc, d_plc, d_motors, d_drawings, d_conduit,
                d_loto) from the Context Pack.
              </p>
            )}
          </div>
        ))}
      </section>

      {toolCalls.length > 0 && (
        <section className="panel">
          <h2>confirm_field params</h2>
          <ol className="tool-list">
            {toolCalls.map((c, i) => (
              <li key={i}>
                <span className="at">{c.at}</span>
                <pre>{safeJson(c.params)}</pre>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="panel">
        <div className="log-head">
          <h2>Raw log ({log.length})</h2>
          <button type="button" className="ghost small" onClick={() => setLog([])}>
            Clear
          </button>
        </div>
        <ol className="log" aria-live="off">
          {log.map((entry) => (
            <li key={entry.id} className={`log-${entry.kind}`}>
              <span className="at">{entry.at}</span>
              <span className="kind">{entry.kind}</span>
              <pre>{safeJson(entry.data)}</pre>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
