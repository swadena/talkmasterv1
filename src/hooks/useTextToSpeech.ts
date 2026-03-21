import { useRef, useState, useCallback, useEffect } from "react";

/**
 * Browser-only TTS hook with mobile safety.
 * - Unlocks speechSynthesis on first user gesture (mobile requirement)
 * - Chrome Android heartbeat to prevent 15s cutoff
 * - Safety timeout: if onend never fires, resolves after estimated duration
 *   so the session never freezes
 */
export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const cachedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const unlockedRef = useRef(false);
  const resumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ensure voices are loaded (they load async in many browsers)
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) pickVoice(voices);
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  // Unlock speechSynthesis on first user interaction (required on mobile)
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const unlock = () => {
      if (unlockedRef.current) return;
      const utterance = new SpeechSynthesisUtterance("");
      utterance.volume = 0;
      window.speechSynthesis.speak(utterance);
      unlockedRef.current = true;
    };
    document.addEventListener("touchstart", unlock, { once: true });
    document.addEventListener("click", unlock, { once: true });
    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click", unlock);
    };
  }, []);

  const pickVoice = (voices: SpeechSynthesisVoice[]) => {
    const femalePattern = /\b(female|woman|girl|zira|hazel|susan|linda|samantha|karen|moira|fiona|tessa|alice|amelie|anna|carmit|damayanti|ioana|joana|kanya|kyoko|lana|laura|lekha|luciana|mariska|mei-jia|melina|milena|monica|nora|paulina|sara|satu|sin-ji|ting-ting|yelda|yuna)\b/i;
    const malePattern = /\b(male|man|daniel|james|thomas|google uk english male|aaron|alex|arthur|fred|lee|oliver|rishi|jorge|diego|luca|jacques)\b/i;

    const pick =
      voices.find((v) => v.name === "Google UK English Male") ||
      voices.find((v) => v.lang.startsWith("en") && v.name.includes("Daniel")) ||
      voices.find((v) => v.lang.startsWith("en") && malePattern.test(v.name)) ||
      voices.find((v) => v.lang.startsWith("en") && !femalePattern.test(v.name)) ||
      null;
    if (pick) cachedVoiceRef.current = pick;
  };

  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (cachedVoiceRef.current) return cachedVoiceRef.current;
    const voices = window.speechSynthesis.getVoices();
    pickVoice(voices);
    return cachedVoiceRef.current;
  }, []);

  const clearResumeInterval = useCallback(() => {
    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }
  }, []);

  const clearSafetyTimer = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        if (!("speechSynthesis" in window)) {
          resolve();
          return;
        }
        window.speechSynthesis.cancel();
        clearResumeInterval();
        clearSafetyTimer();

        let resolved = false;
        const finish = () => {
          if (resolved) return;
          resolved = true;
          setIsSpeaking(false);
          clearResumeInterval();
          clearSafetyTimer();
          resolve();
        };

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92;
        utterance.pitch = 1.0;

        const voice = getVoice();
        if (voice) utterance.voice = voice;

        utterance.onend = finish;
        utterance.onerror = (e) => {
          if (e.error === "interrupted") {
            finish();
            return;
          }
          console.warn("TTS error:", e.error);
          finish();
        };

        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);

        // Safety timeout: estimate ~80ms per character at 0.92 rate, plus 3s buffer.
        // If onend never fires (common on mobile), we still resolve so the session
        // doesn't freeze.
        const estimatedMs = Math.max(3000, (text.length * 80) / 0.92 + 3000);
        safetyTimerRef.current = setTimeout(() => {
          if (!resolved) {
            console.warn("TTS safety timeout reached — forcing resolve");
            window.speechSynthesis.cancel();
            finish();
          }
        }, estimatedMs);

        // Also detect if speech never actually started (mobile silent failure).
        // After 2s, if speechSynthesis is not speaking, resolve immediately.
        setTimeout(() => {
          if (!resolved && !window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
            console.warn("TTS never started speaking — forcing resolve");
            finish();
          }
        }, 2000);

        // Chrome Android bug: speechSynthesis pauses after ~15s.
        // Periodic resume() keeps it alive.
        resumeIntervalRef.current = setInterval(() => {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 10000);
      });
    },
    [getVoice, clearResumeInterval, clearSafetyTimer]
  );

  const cancel = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    clearResumeInterval();
    clearSafetyTimer();
    setIsSpeaking(false);
  }, [clearResumeInterval, clearSafetyTimer]);

  return { speak, cancel, isSpeaking, isSupported: "speechSynthesis" in window };
}
