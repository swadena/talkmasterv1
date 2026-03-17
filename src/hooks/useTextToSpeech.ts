import { useRef, useState, useCallback, useEffect } from "react";

/**
 * Browser-only TTS hook using a consistent male English voice.
 * No external API keys required.
 */
export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const cachedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

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

  const pickVoice = (voices: SpeechSynthesisVoice[]) => {
    // Strictly enforce a consistent male voice — never allow female voices
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
