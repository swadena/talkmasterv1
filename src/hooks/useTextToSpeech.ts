import { useRef, useState, useCallback, useEffect } from "react";

/**
 * Browser-only TTS hook using a consistent male English voice.
 * Handles mobile unlock and Chrome Android long-utterance bug.
 */
export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const cachedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const unlockedRef = useRef(false);
  const resumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        if (!("speechSynthesis" in window)) {
          resolve();
          return;
        }
        window.speechSynthesis.cancel();
        clearResumeInterval();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92;
        utterance.pitch = 1.0;

        const voice = getVoice();
        if (voice) utterance.voice = voice;

        utterance.onend = () => {
          setIsSpeaking(false);
          clearResumeInterval();
          resolve();
        };
        utterance.onerror = (e) => {
          // "interrupted" fires when we cancel intentionally — not a real error
          if (e.error === "interrupted") {
            setIsSpeaking(false);
            clearResumeInterval();
            resolve();
            return;
          }
          console.warn("TTS error:", e.error);
          setIsSpeaking(false);
          clearResumeInterval();
          resolve();
        };

        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);

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
    [getVoice, clearResumeInterval]
  );

  const cancel = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    clearResumeInterval();
    setIsSpeaking(false);
  }, [clearResumeInterval]);

  return { speak, cancel, isSpeaking, isSupported: "speechSynthesis" in window };
}
