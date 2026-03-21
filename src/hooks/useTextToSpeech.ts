import { useRef, useState, useCallback, useEffect } from "react";

/**
 * Browser-only TTS hook with mobile safety, debug logging, and text-only fallback.
 *
 * Features:
 * - Explicit audio unlock on user gesture (mobile requirement)
 * - Chrome Android heartbeat to prevent 15s cutoff
 * - Safety timeout so sessions never freeze
 * - Consistent voice locking per session
 * - Debug logging for all audio events
 * - Text-only fallback mode if TTS fails
 */

const DEBUG = true;
function ttsLog(...args: unknown[]) {
  if (DEBUG) console.log("[TTS]", ...args);
}

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [textOnlyMode, setTextOnlyMode] = useState(false);
  const [lastSpokenText, setLastSpokenText] = useState("");
  const cachedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const unlockedRef = useRef(false);
  const audioContextUnlockedRef = useRef(false);
  const resumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failCountRef = useRef(0);

  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  // Load voices
  useEffect(() => {
    if (!isSupported) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      ttsLog("Voices loaded:", voices.length);
      if (voices.length > 0) pickVoice(voices);
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const pickVoice = (voices: SpeechSynthesisVoice[]) => {
    const malePattern = /\b(male|man|daniel|james|thomas|google uk english male|aaron|alex|arthur|fred|lee|oliver|rishi|jorge|diego|luca|jacques)\b/i;
    const femalePattern = /\b(female|woman|girl|zira|hazel|susan|linda|samantha|karen|moira|fiona|tessa|alice|amelie|anna|carmit|damayanti|ioana|joana|kanya|kyoko|lana|laura|lekha|luciana|mariska|mei-jia|melina|milena|monica|nora|paulina|sara|satu|sin-ji|ting-ting|yelda|yuna)\b/i;

    const pick =
      voices.find((v) => v.name === "Google UK English Male") ||
      voices.find((v) => v.lang.startsWith("en") && v.name.includes("Daniel")) ||
      voices.find((v) => v.lang.startsWith("en") && malePattern.test(v.name)) ||
      voices.find((v) => v.lang.startsWith("en") && !femalePattern.test(v.name)) ||
      null;

    if (pick) {
      cachedVoiceRef.current = pick;
      ttsLog("Voice locked:", pick.name, pick.lang);
    }
  };

  /**
   * Unlock audio context + speechSynthesis. MUST be called from a user gesture handler.
   * Returns true if audio appears to be working.
   */
  const unlockAudio = useCallback(async (): Promise<boolean> => {
    ttsLog("unlockAudio called");

    // Unlock AudioContext
    if (!audioContextUnlockedRef.current) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        await ctx.resume();
        // Create a short silent oscillator to fully unlock
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
        audioContextUnlockedRef.current = true;
        ttsLog("AudioContext unlocked");
      } catch (e) {
        ttsLog("AudioContext unlock failed:", e);
      }
    }

    // Unlock speechSynthesis
    if (!unlockedRef.current && isSupported) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("");
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
        unlockedRef.current = true;
        ttsLog("speechSynthesis unlocked");
      } catch (e) {
        ttsLog("speechSynthesis unlock failed:", e);
      }
    }

    return isSupported;
  }, [isSupported]);

  /**
   * Test audio by speaking a short phrase. Returns true if speech started successfully.
   * MUST be called from a user gesture (tap/click) handler.
   */
  const testAudio = useCallback(
    async (testPhrase = "Welcome, let's begin"): Promise<boolean> => {
      ttsLog("testAudio starting with:", testPhrase);
      await unlockAudio();

      if (!isSupported) {
        ttsLog("testAudio: speechSynthesis not supported");
        setTextOnlyMode(true);
        return false;
      }

      return new Promise((resolve) => {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(testPhrase);
        utterance.rate = 0.92;
        utterance.pitch = 1.0;

        const voice = getVoice();
        if (voice) {
          utterance.voice = voice;
          ttsLog("testAudio using voice:", voice.name);
        }

        let resolved = false;
        const done = (success: boolean) => {
          if (resolved) return;
          resolved = true;
          setIsSpeaking(false);
          ttsLog("testAudio result:", success ? "success" : "failed");
          if (!success) {
            failCountRef.current++;
            if (failCountRef.current >= 2) {
              ttsLog("Multiple failures, enabling text-only mode");
              setTextOnlyMode(true);
            }
          } else {
            failCountRef.current = 0;
          }
          resolve(success);
        };

        utterance.onend = () => done(true);
        utterance.onerror = (e) => {
          ttsLog("testAudio error:", e.error);
          if (e.error === "interrupted") {
            done(true); // Interrupted is fine
          } else {
            done(false);
          }
        };

        setIsSpeaking(true);
        setLastSpokenText(testPhrase);
        window.speechSynthesis.speak(utterance);

        // Check if speech actually started after 2s
        setTimeout(() => {
          if (!resolved && !window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
            ttsLog("testAudio: speech never started");
            window.speechSynthesis.cancel();
            done(false);
          }
        }, 2000);

        // Safety timeout
        setTimeout(() => {
          if (!resolved) {
            ttsLog("testAudio: safety timeout");
            window.speechSynthesis.cancel();
            done(true); // Assume it played if we got this far
          }
        }, 8000);
      });
    },
    [isSupported, unlockAudio]
  );

  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (cachedVoiceRef.current) return cachedVoiceRef.current;
    if (!isSupported) return null;
    const voices = window.speechSynthesis.getVoices();
    pickVoice(voices);
    return cachedVoiceRef.current;
  }, [isSupported]);

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
      setLastSpokenText(text);

      // If in text-only mode, just show text and resolve after a delay
      if (textOnlyMode || !isSupported) {
        ttsLog("Text-only mode, skipping speech for:", text.substring(0, 50));
        setIsSpeaking(true);
        return new Promise((resolve) => {
          // Give user time to read (rough estimate: 60ms per char, min 2s, max 10s)
          const readTime = Math.min(10000, Math.max(2000, text.length * 60));
          setTimeout(() => {
            setIsSpeaking(false);
            resolve();
          }, readTime);
        });
      }

      return new Promise((resolve) => {
        ttsLog("speak start:", text.substring(0, 60));
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
          ttsLog("speak finished");
          resolve();
        };

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92;
        utterance.pitch = 1.0;

        const voice = getVoice();
        if (voice) {
          utterance.voice = voice;
          ttsLog("Using voice:", voice.name);
        } else {
          ttsLog("No voice found, using default");
        }

        utterance.onend = finish;
        utterance.onerror = (e) => {
          if (e.error === "interrupted") {
            finish();
            return;
          }
          ttsLog("speak error:", e.error);
          failCountRef.current++;
          if (failCountRef.current >= 3) {
            ttsLog("Too many failures, switching to text-only mode");
            setTextOnlyMode(true);
          }
          finish();
        };

        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);

        // Safety timeout
        const estimatedMs = Math.max(3000, (text.length * 80) / 0.92 + 3000);
        safetyTimerRef.current = setTimeout(() => {
          if (!resolved) {
            ttsLog("Safety timeout reached — forcing resolve");
            window.speechSynthesis.cancel();
            finish();
          }
        }, estimatedMs);

        // Detect if speech never started
        setTimeout(() => {
          if (!resolved && !window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
            ttsLog("Speech never started — forcing resolve");
            failCountRef.current++;
            finish();
          }
        }, 2000);

        // Chrome Android heartbeat
        resumeIntervalRef.current = setInterval(() => {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 10000);
      });
    },
    [getVoice, clearResumeInterval, clearSafetyTimer, textOnlyMode, isSupported]
  );

  const cancel = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
    clearResumeInterval();
    clearSafetyTimer();
    setIsSpeaking(false);
  }, [clearResumeInterval, clearSafetyTimer, isSupported]);

  const replay = useCallback(async () => {
    if (!lastSpokenText) return;
    ttsLog("Replaying:", lastSpokenText.substring(0, 50));
    await speak(lastSpokenText);
  }, [lastSpokenText, speak]);

  const enableTextOnlyMode = useCallback(() => {
    ttsLog("Text-only mode enabled by user");
    setTextOnlyMode(true);
  }, []);

  const disableTextOnlyMode = useCallback(() => {
    ttsLog("Text-only mode disabled");
    setTextOnlyMode(false);
    failCountRef.current = 0;
  }, []);

  return {
    speak,
    cancel,
    replay,
    testAudio,
    unlockAudio,
    isSpeaking,
    isSupported,
    textOnlyMode,
    lastSpokenText,
    enableTextOnlyMode,
    disableTextOnlyMode,
  };
}
