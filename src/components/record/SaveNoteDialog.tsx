import { Sparkles, RotateCcw, Save, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatDuration } from '@/utils/formatters';

interface SaveNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onChangeTitle: (title: string) => void;
  duration: number;
  wordCount: number;
  isProcessing: boolean;
  onDiscard: () => void;
  onSave: () => void;
  onDownloadAudio?: () => void;
}

export function SaveNoteDialog({
  open,
  onOpenChange,
  title,
  onChangeTitle,
  duration,
  wordCount,
  isProcessing,
  onDiscard,
  onSave,
  onDownloadAudio,
}: SaveNoteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#6C63FF]" />
            Simpan Catatan
          </DialogTitle>
          <DialogDescription>
            Simpan transkripsi dan proses dengan AI untuk menghasilkan ringkasan dan kata kunci.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Judul Catatan
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => onChangeTitle(e.target.value)}
              placeholder="Masukkan judul catatan..."
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <span className="text-gray-500">Durasi</span>
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatDuration(duration)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <span className="text-gray-500">Jumlah Kata</span>
              <p className="font-semibold text-gray-900 dark:text-white">{wordCount}</p>
            </div>
          </div>

          {isProcessing && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#6C63FF]/10 text-[#6C63FF]">
              <div className="w-5 h-5 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">AI sedang memproses ringkasan catatan...</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {onDownloadAudio && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDownloadAudio}
              className="text-xs text-gray-700 dark:text-gray-300 border-dashed border-gray-300 dark:border-gray-700 hover:text-[#6C63FF] hover:border-[#6C63FF]"
              title="Unduh rekaman suara asli perkuliahan ke komputer/ponsel"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Unduh Audio (.webm)
            </Button>
          )}

          <div className="flex items-center justify-end gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={onDiscard}
              disabled={isProcessing}
              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 text-xs sm:text-sm"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Buang
            </Button>
            <Button
              onClick={onSave}
              disabled={!title.trim() || isProcessing}
              className="bg-gradient-to-r from-[#6C63FF] to-[#5548E8] text-white text-xs sm:text-sm"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {isProcessing ? 'Memproses...' : 'Simpan & Proses AI'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
