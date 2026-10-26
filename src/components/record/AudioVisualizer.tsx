import { motion } from 'framer-motion';
import { useRecordStore } from '@/store/recordStore';

interface AudioVisualizerProps {
  bars?: number;
}

export function AudioVisualizer({ bars = 20 }: AudioVisualizerProps) {
  const { audioLevel } = useRecordStore();

  return (
    <div className="flex items-center justify-center gap-0.5 h-12">
      {Array.from({ length: bars }).map((_, i) => {
        // Vary height naturally across bars without calling non-deterministic math during render
        const multiplier = 0.5 + ((i % 5) / 10);
        const height = Math.max(10, Math.min(100, audioLevel * multiplier));
        return (
          <motion.div
            key={i}
            className="w-1.5 bg-gradient-to-t from-[#6C63FF] to-[#FF6584] rounded-full"
            animate={{
              height: `${height}%`,
              opacity: audioLevel > 0 ? 1 : 0.3,
            }}
            transition={{
              duration: 0.1,
              ease: 'easeInOut',
            }}
          />
        );
      })}
    </div>
  );
}
