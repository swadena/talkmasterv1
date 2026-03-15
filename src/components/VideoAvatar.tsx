import { motion } from "framer-motion";

interface VideoAvatarProps {
  src: string;
  state?: "listening" | "speaking" | "thinking";
}

/**
 * Simulates a live video-call participant with subtle movement animations.
 * Uses CSS keyframe-driven transforms on the image to create the illusion of
 * a living, breathing human on a video call (slight zoom drift, position shift).
 */
const VideoAvatar = ({ src, state = "listening" }: VideoAvatarProps) => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base image with continuous subtle motion */}
      <motion.img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover video-avatar-alive"
        initial={{ scale: 1.05 }}
        animate={{ scale: 1.05 }}
      />

      {/* Breathing overlay pulse */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(ellipse at 50% 40%, transparent 60%, hsla(0,0%,0%,0.15) 100%)",
            "radial-gradient(ellipse at 52% 42%, transparent 58%, hsla(0,0%,0%,0.2) 100%)",
            "radial-gradient(ellipse at 48% 38%, transparent 62%, hsla(0,0%,0%,0.12) 100%)",
            "radial-gradient(ellipse at 50% 40%, transparent 60%, hsla(0,0%,0%,0.15) 100%)",
          ],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* State-specific overlays */}
      {state === "speaking" && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-1/3"
          animate={{
            background: [
              "linear-gradient(to top, hsla(0,0%,0%,0.3), transparent)",
              "linear-gradient(to top, hsla(0,0%,0%,0.15), transparent)",
              "linear-gradient(to top, hsla(0,0%,0%,0.3), transparent)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {state === "thinking" && (
        <motion.div
          className="absolute inset-0 bg-background/10"
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
};

export default VideoAvatar;
