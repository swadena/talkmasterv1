import { useRef, useState, useCallback } from "react";

/**
 * Hook wrapping the browser's SpeechSynthesis API for reading text aloud.
 * Returns a promise from `speak()` that resolves when speech finishes.
 */
export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!isSupported) {
          resolve();
          return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to pick a natural-sounding English voice
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("Google") ||
              v.name.includes("Samantha") ||
              v.name.includes("Daniel") ||
              v.name.includes("Karen") ||
              v.name.includes("Natural"))
        );
        if (preferred) utterance.voice = preferred;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        utterance.onerror = (e) => {
          setIsSpeaking(false);
          // "interrupted" and "canceled" are not real errors
          if (e.error === "interrupted" || e.error === "canceled") {
            resolve();
          } else {
            console.warn("TTS error:", e.error);
            resolve(); // resolve anyway so the flow continues
          }
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      });
    },
    [isSupported]
  );

  const cancel = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return { speak, cancel, isSpeaking, isSupported };
}
