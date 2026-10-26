import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DraftRestoreBannerProps {
  show: boolean;
  onRestore: () => void;
  onDiscard: () => void;
}

export function DraftRestoreBanner({ show, onRestore, onDiscard }: DraftRestoreBannerProps) {
  if (!show) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0, marginBottom: 0 }}
      animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
      exit={{ height: 0, opacity: 0, marginBottom: 0 }}
      className="overflow-hidden"
    >
      <div className="bg-[#6C63FF]/10 border border-[#6C63FF]/20 rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
            <RotateCcw className="w-6 h-6 text-[#6C63FF]" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Draf Rekaman Ditemukan</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Terdeteksi rekaman yang belum disimpan dari sesi sebelumnya.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDiscard}
            className="text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            Hapus Draf
          </Button>
          <Button
            size="sm"
            onClick={onRestore}
            className="text-xs bg-[#6C63FF] hover:bg-[#5548E8] text-white h-10 px-6 shadow-md"
          >
            Pulihkan Sekarang
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
