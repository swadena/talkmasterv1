import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import coachListening from "@/assets/coach-listening.mp4";
import coachSpeakingVideo from "@/assets/coach-speaking.mp4";

interface VideoAvatarProps {
  state?: "listening" | "speaking" | "thinking";
}

/**
 * Renders a looping video of a real person to simulate a video-call participant.
 * Switches between a "listening" clip and a "speaking" clip based on state.
 */
const VideoAvatar = ({ state = "listening" }: VideoAvatarProps) => {
  const listeningRef = useRef<HTMLVideoElement>(null);
  const speakingRef = useRef<HTMLVideoElement>(null);

  const showSpeaking = state === "speaking";

  // Keep both videos playing so transitions are seamless
  useEffect(() => {
    listeningRef.current?.play().catch(() => {});
    speakingRef.current?.play().catch(() => {});
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      {/* Listening video (default) */}
      <video
        ref={listeningRef}
        src={coachListening}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          showSpeaking ? "opacity-0" : "opacity-100"
        }`}
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Speaking video */}
      <video
        ref={speakingRef}
        src={coachSpeakingVideo}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          showSpeaking ? "opacity-100" : "opacity-0"
        }`}
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Subtle vignette for UI readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/60" />

      {/* Thinking overlay */}
      {state === "thinking" && (
        <motion.div
          className="absolute inset-0 bg-background/20"
          animate={{ opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
};

export default VideoAvatar;
