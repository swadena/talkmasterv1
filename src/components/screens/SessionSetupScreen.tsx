import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Volume2, VolumeX, Mic, MicOff, CheckCircle, AlertTriangle, Shield } from "lucide-react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import type { PracticeMode } from "@/pages/Index";

interface SessionSetupScreenProps {
  mode: PracticeMode;
  onReady: () => void;
  onBack: () => void;
}

type MicStatus = "idle" | "requesting" | "granted" | "denied" | "error";
type AudioStatus = "idle" | "testing" | "success" | "failed";

const SessionSetupScreen = ({ mode, onReady, onBack }: SessionSetupScreenProps) => {
  const [speakerStatus, setSpeakerStatus] = useState<AudioStatus>("idle");
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");
  const [micLevel, setMicLevel] = useState(0);
  const [micTested, setMicTested] = useState(false);
  const [httpsOk, setHttpsOk] = useState(true);
  const tts = useTextToSpeech();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);

  useEffect(() => {
    const isSecure =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    setHttpsOk(isSecure);
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(animFrameRef.current);
      tts.cancel();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTestSpeaker = async () => {
    setSpeakerStatus("testing");
    // Unlock audio context on this user gesture
    const success = await tts.testAudio("Hello! I'm your practice coach. If you can hear me, your audio is working great.");
    setSpeakerStatus(success ? "success" : "failed");
  };

  const handleEnableTextOnly = () => {
    tts.enableTextOnlyMode();
    setSpeakerStatus("success"); // Allow proceeding in text-only mode
  };

  const handleTestMic = async () => {
    setMicStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      setMicStatus("granted");

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let detectedSound = false;

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(avg / 80, 1);
        setMicLevel(normalized);
        if (normalized > 0.05) detectedSound = true;
        if (detectedSound && !micTested) setMicTested(true);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();

      setTimeout(() => {
        stream.getTracks().forEach((t) => t.stop());
        cancelAnimationFrame(animFrameRef.current);
        setMicLevel(0);
        if (!detectedSound) {
          setMicStatus("error");
        }
      }, 5000);
    } catch (e: any) {
      console.error("Mic access error:", e);
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setMicStatus("denied");
      } else {
        setMicStatus("error");
      }
    }
  };

  const speakerOk = speakerStatus === "success";
  const allReady = speakerOk && micTested && httpsOk;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
      className="flex h-full flex-col bg-background"
    >
      <div className="pt-14" />

      <div className="flex items-center justify-between px-6">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface ease-presence transition-transform active:scale-95"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <span className="text-sm font-medium text-foreground/80">{modeLabel} Setup</span>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-6 pt-8 flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Before we begin</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Let's make sure your audio works properly
          </p>
        </div>

        {!httpsOk && (
          <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 p-4">
            <Shield className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Secure connection required</p>
              <p className="mt-0.5 text-xs text-destructive/70">
                Microphone access requires HTTPS. Please access this app via a secure connection.
              </p>
            </div>
          </div>
        )}

        {/* Speaker Test */}
        <div className="rounded-3xl bg-surface p-5 card-depth">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                speakerOk ? "bg-success/20" : speakerStatus === "failed" ? "bg-destructive/20" : "bg-primary/10"
              }`}>
                {speakerOk ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : speakerStatus === "failed" ? (
                  <VolumeX className="h-5 w-5 text-destructive" />
                ) : (
                  <Volume2 className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Speaker</p>
                <p className="text-xs text-muted-foreground">
                  {speakerOk && tts.textOnlyMode
                    ? "Text-only mode"
                    : speakerOk
                    ? "🔊 Sound On"
                    : speakerStatus === "failed"
                    ? "Audio not working"
                    : "Test your audio output"}
                </p>
              </div>
            </div>
            <button
              onClick={handleTestSpeaker}
              disabled={speakerStatus === "testing"}
              className={`rounded-full px-4 py-2 text-xs font-medium ease-presence transition-all active:scale-95 ${
                speakerOk
                  ? "bg-success/10 text-success"
                  : speakerStatus === "testing"
                  ? "bg-primary/20 text-primary animate-pulse"
                  : speakerStatus === "failed"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {speakerStatus === "testing"
                ? "Playing..."
                : speakerOk
                ? "✓ Done"
                : speakerStatus === "failed"
                ? "Retry"
                : "Test Sound"}
            </button>
          </div>

          {/* Audio failed - show options */}
          {speakerStatus === "failed" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 flex flex-col gap-2"
            >
              <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-destructive/80 leading-relaxed">
                  Audio is not working on your device. Please check your browser settings or tap to enable sound.
                </p>
              </div>
              <button
                onClick={handleEnableTextOnly}
                className="rounded-xl bg-muted px-4 py-2.5 text-xs font-medium text-foreground transition-transform active:scale-95"
              >
                Continue with text only (no voice)
              </button>
            </motion.div>
          )}
        </div>

        {/* Microphone Test */}
        <div className="rounded-3xl bg-surface p-5 card-depth">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                micTested ? "bg-success/20" : micStatus === "denied" || micStatus === "error" ? "bg-destructive/20" : "bg-primary/10"
              }`}>
                {micTested ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : micStatus === "denied" || micStatus === "error" ? (
                  <MicOff className="h-5 w-5 text-destructive" />
                ) : (
                  <Mic className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Microphone</p>
                <p className="text-xs text-muted-foreground">
                  {micTested
                    ? "Mic working"
                    : micStatus === "denied"
                    ? "Access denied"
                    : micStatus === "error"
                    ? "No input detected"
                    : micStatus === "granted"
                    ? "Speak now..."
                    : "Test your microphone"}
                </p>
              </div>
            </div>
            <button
              onClick={handleTestMic}
              disabled={micStatus === "requesting" || micStatus === "granted"}
              className={`rounded-full px-4 py-2 text-xs font-medium ease-presence transition-all active:scale-95 ${
                micTested
                  ? "bg-success/10 text-success"
                  : micStatus === "granted"
                  ? "bg-primary/20 text-primary"
                  : micStatus === "denied" || micStatus === "error"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {micStatus === "requesting"
                ? "Requesting..."
                : micStatus === "granted"
                ? "Listening..."
                : micTested
                ? "✓ Done"
                : micStatus === "denied" || micStatus === "error"
                ? "Retry"
                : "Test Mic"}
            </button>
          </div>

          {micStatus === "granted" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4"
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    animate={{ width: `${micLevel * 100}%` }}
                    transition={{ duration: 0.05 }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
                  {Math.round(micLevel * 100)}%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {micLevel > 0.05 ? "✓ Input detected" : "Say something to test..."}
              </p>
            </motion.div>
          )}

          {micStatus === "denied" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 flex items-start gap-2 rounded-xl bg-destructive/10 p-3"
            >
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-destructive/80 leading-relaxed">
                Please enable microphone in your browser settings. On iOS Safari, go to Settings → Safari → Microphone. On Chrome, tap the lock icon in the address bar.
              </p>
            </motion.div>
          )}

          {micStatus === "error" && !micTested && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 flex items-start gap-2 rounded-xl bg-destructive/10 p-3"
            >
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-destructive/80 leading-relaxed">
                No audio input detected. Please check that your microphone is connected and not muted.
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Start button */}
      <div className="px-6 pb-10 pt-4">
        <button
          onClick={onReady}
          disabled={!allReady}
          className={`h-14 w-full rounded-2xl font-medium text-base ease-presence transition-all active:scale-[0.97] ${
            allReady
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {allReady ? "Start Session" : "Complete checks above"}
        </button>
        {allReady && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-[10px] text-muted-foreground mt-2"
          >
            {tts.textOnlyMode
              ? "Text-only mode — questions will be shown on screen."
              : "Everything looks good! Tap to begin."}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
};

export default SessionSetupScreen;
