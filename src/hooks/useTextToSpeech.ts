import { useRef, useState, useCallback } from "react";

/**
 * Hook that uses ElevenLabs TTS via edge function for natural voice,
 * with browser SpeechSynthesis as fallback.
 */
export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const speakWithElevenLabs = useCallback(
    async (text: string, signal: AbortSignal): Promise<boolean> => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
          signal,
        });

        if (!response.ok) return false;

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        return new Promise<boolean>((resolve) => {
          audio.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
            resolve(true);
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
            resolve(false);
          };
          setIsSpeaking(true);
          audio.play().catch(() => resolve(false));
        });
      } catch {
        return false;
      }
    },
    []
  );

  const speakWithBrowser = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) { resolve(); return; }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92;
      utterance.pitch = 1.05;
      const voices = window.speechSynthesis.getVoices();
      const male = voices.find((v) => v.lang.startsWith("en") && v.name.includes("Daniel")) ||
        voices.find((v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("male")) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (male) utterance.voice = male;
      utterance.onend = () => { setIsSpeaking(false); resolve(); };
      utterance.onerror = () => { setIsSpeaking(false); resolve(); };
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const speak = useCallback(
    async (text: string): Promise<void> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Try ElevenLabs first, fall back to browser TTS
      const success = await speakWithElevenLabs(text, controller.signal);
      if (!success && !controller.signal.aborted) {
        await speakWithBrowser(text);
      }
    },
    [speakWithElevenLabs, speakWithBrowser]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return { speak, cancel, isSpeaking, isSupported: true };
}
