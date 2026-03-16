import { useRef, useState, useCallback } from "react";

/**
 * Browser-only TTS hook using a consistent male English voice.
 * No external API keys required.
 */
export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const cachedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (cachedVoiceRef.current) return cachedVoiceRef.current;
    const voices = window.speechSynthesis.getVoices();
    // Priority: Google UK English Male > Daniel > any English male > any English
    const pick =
      voices.find((v) => v.name === "Google UK English Male") ||
      voices.find((v) => v.lang.startsWith("en") && v.name.includes("Daniel")) ||
      voices.find((v) => v.lang.startsWith("en") && /\bmale\b/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith("en") && !/\bfemale\b/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      null;
    if (pick) cachedVoiceRef.current = pick;
    return pick;
  }, []);

  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        if (!("speechSynthesis" in window)) {
          resolve();
          return;
        }
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92;
        utterance.pitch = 1.0;

        const voice = getVoice();
        if (voice) utterance.voice = voice;

        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };

        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      });
    },
    [getVoice]
  );

  const cancel = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return { speak, cancel, isSpeaking, isSupported: "speechSynthesis" in window };
}
