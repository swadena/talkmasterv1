import { motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

interface MicStatusIndicatorProps {
  isListening: boolean;
  hasError?: boolean;
}

/** Small pill showing microphone active/inactive state. */
const MicStatusIndicator = ({ isListening, hasError = false }: MicStatusIndicatorProps) => {
  if (hasError) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-destructive/20 px-2.5 py-1 backdrop-blur-md">
        <MicOff className="h-3 w-3 text-destructive" />
        <span className="text-[10px] font-medium text-destructive">No mic</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 backdrop-blur-md transition-colors duration-300 ${
      isListening ? "bg-success/20" : "bg-background/20"
    }`}>
      <Mic className={`h-3 w-3 transition-colors duration-300 ${
        isListening ? "text-success" : "text-foreground/40"
      }`} />
      {isListening && (
        <motion.div
          className="flex gap-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-[2px] rounded-full bg-success"
              animate={{ height: [4, 10, 4] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </motion.div>
      )}
      <span className={`text-[10px] font-medium transition-colors duration-300 ${
        isListening ? "text-success" : "text-foreground/40"
      }`}>
        {isListening ? "Listening" : "Mic off"}
      </span>
    </div>
  );
};

export default MicStatusIndicator;
