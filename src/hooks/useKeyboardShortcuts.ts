import { useEffect, useCallback } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useRecordStore } from '@/store/recordStore';

export function useKeyboardShortcuts() {
  const { currentPage, setCurrentPage, toggleSidebar } = useUIStore();
  const { state, startRecording, stopRecording, pauseRecording, resumeRecording } = useRecordStore();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdKey = isMac ? event.metaKey : event.ctrlKey;

    // Global shortcuts
    if (cmdKey) {
      switch (event.key.toLowerCase()) {
        case 'k':
          event.preventDefault();
          setCurrentPage('search');
          break;
        case 'b':
          event.preventDefault();
          toggleSidebar();
          break;
        case ',':
          event.preventDefault();
          setCurrentPage('settings');
          break;
        case 'n':
          event.preventDefault();
          setCurrentPage('record');
          break;
      }
    }

    // Recording page shortcuts
    if (currentPage === 'record') {
      if (cmdKey && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        if (state === 'idle') {
          startRecording();
        } else if (state === 'recording' || state === 'paused') {
          stopRecording();
        }
      }

      if (state === 'recording' && event.code === 'Space' && !cmdKey) {
        event.preventDefault();
        pauseRecording();
      }

      if (state === 'paused' && event.code === 'Space' && !cmdKey) {
        event.preventDefault();
        resumeRecording();
      }
    }
  }, [currentPage, state, setCurrentPage, toggleSidebar, startRecording, stopRecording, pauseRecording, resumeRecording]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export const keyboardShortcuts = [
  {
    category: 'Global',
    shortcuts: [
      { key: 'Ctrl/Cmd + K', description: 'Buka pencarian' },
      { key: 'Ctrl/Cmd + B', description: 'Toggle sidebar' },
      { key: 'Ctrl/Cmd + ,', description: 'Buka pengaturan' },
      { key: 'Ctrl/Cmd + N', description: 'Rekaman baru' },
    ],
  },
  {
    category: 'Halaman Rekaman',
    shortcuts: [
      { key: 'Ctrl/Cmd + R', description: 'Mulai/Berhenti merekam' },
      { key: 'Space', description: 'Jeda/Lanjutkan' },
      { key: 'Ctrl/Cmd + S', description: 'Simpan transkripsi' },
    ],
  },
];
