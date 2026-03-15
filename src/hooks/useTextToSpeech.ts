import { useRef, useState, useCallback } from "react";

/**
 * Hook wrapping the browser's SpeechSynthesis API for reading text aloud.
 * Returns a promise from `speak()` that resolves when speech finishes.
 */
export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  // Select and cache a single male voice once
  const getVoice = useCallback(() => {
    if (selectedVoiceRef.current) {
      return selectedVoiceRef.current;
    }

    const voices = window.speechSynthesis.getVoices();
    
    // Priority order: male voices to match avatar
    const voicePreferences = [
      "Google UK English Male",
      "Daniel",
      "Microsoft David",
      "Google US English",
      "Alex",
      "Fred",
    ];
    
    let preferred = null;
    for (const name of voicePreferences) {
      preferred = voices.find((v) => v.name.includes(name) && v.lang.startsWith("en"));
      if (preferred) break;
    }
    
    // Fallback: any male English voice
    if (!preferred) {
      preferred = voices.find(
        (v) => v.lang.startsWith("en") && (v.name.toLowerCase().includes("male") || v.name.includes("Daniel") || v.name.includes("David"))
      );
    }
    
    // Final fallback: any English voice
    if (!preferred) {
      preferred = voices.find((v) => v.lang.startsWith("en"));
    }
    
    // Cache the selected voice for consistency
    if (preferred) {
      selectedVoiceRef.current = preferred;
      console.log("Selected consistent voice:", preferred.name);
    }
    
    return preferred;
  }, []);

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

        // Use the cached voice for consistency
        const voice = getVoice();
        if (voice) utterance.voice = voice;

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
