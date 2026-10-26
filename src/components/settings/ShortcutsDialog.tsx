import { Keyboard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { keyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-[#6C63FF]" />
            Shortcut Keyboard
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {keyboardShortcuts.map((cat) => (
            <div key={cat.category} className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {cat.category}
              </h4>
              <div className="space-y-2">
                {cat.shortcuts.map((sc) => (
                  <div
                    key={sc.key}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {sc.description}
                    </span>
                    <kbd className="px-2.5 py-1 text-xs font-mono font-semibold bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 shadow-sm">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
