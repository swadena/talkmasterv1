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
        utterance.rate = 0.92;
        utterance.pitch = 1.05;
        utterance.volume = 1.0;

        // Pick the most natural-sounding English voice available
        const voices = window.speechSynthesis.getVoices();
        
        // Priority order: premium neural voices first, then quality defaults
        const voicePreferences = [
          "Google UK English Male",
          "Google UK English Female", 
          "Daniel",
          "Samantha",
          "Karen",
          "Google US English",
          "Microsoft David",
          "Microsoft Zira",
        ];
        
        let preferred = null;
        for (const name of voicePreferences) {
          preferred = voices.find((v) => v.name.includes(name) && v.lang.startsWith("en"));
          if (preferred) break;
        }
        
        // Fallback: any English voice marked as natural/premium
        if (!preferred) {
          preferred = voices.find(
            (v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Neural") || v.name.includes("Premium"))
          );
        }
        
        // Final fallback: any English voice
        if (!preferred) {
          preferred = voices.find((v) => v.lang.startsWith("en"));
        }
        
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
