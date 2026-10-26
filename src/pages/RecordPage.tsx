import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Pause,
  Play,
  Square,
  Save,
  Clock,
  Type,
  Sparkles,
  RotateCcw,
  Wand2
} from 'lucide-react';
import { useRecordStore } from '@/store/recordStore';
import { useNotesStore } from '@/store/notesStore';
import { useUIStore } from '@/store/uiStore';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAI } from '@/hooks/useAI';
import { useFirebase } from '@/hooks/useFirebase';
import { useSettingsStore } from '@/store/settingsStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// Audio Visualizer Component
function AudioVisualizer() {
  const { audioLevel } = useRecordStore();
  const bars = 20;

  return (
    <div className="flex items-center justify-center gap-0.5 h-12">
      {Array.from({ length: bars }).map((_, i) => {
        const height = Math.max(10, Math.min(100, audioLevel * (0.5 + Math.random() * 0.5)));
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

// Format duration to HH:MM:SS
function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function RecordPage() {
  const {
    state,
    segments,
    currentText,
    currentSubject,
    setCurrentSubject,
    getDuration,
    getWordCount,
    getFullTranscription,
    resetRecording,
    setProcessing,
    addSegment
  } = useRecordStore();

  const { addNote, subjects } = useNotesStore();
  const { addToast, setCurrentPage } = useUIStore();
  const { startRecording, stopRecording, pauseRecording, resumeRecording, error } = useAudioRecorder();
  const { processNote, correctText, isProcessing: isAIProcessing } = useAI();
  const { saveNoteToCloud, isConfigured: isFirebaseReady, userId } = useFirebase();
  const { ai, interface: { autoSaveInterval } } = useSettingsStore();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [showRestoreDraft, setShowRestoreDraft] = useState(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const transcriptionRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check for existing draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('smartnotes_draft');
    if (draft && state === 'idle') {
      setShowRestoreDraft(true);
    }
  }, [state]);

  const handleRestoreDraft = () => {
    const draftStr = localStorage.getItem('smartnotes_draft');
    if (!draftStr) return;

    try {
      const draft = JSON.parse(draftStr);
      setCurrentSubject(draft.subject);
      // We manually add the content as a single segment for simplicity
      useRecordStore.getState().clearTranscription();
      addSegment(draft.content, true);
      addToast({ type: 'success', message: 'Draft berhasil dipulihkan!' });
      setShowRestoreDraft(false);
    } catch (e) {
      console.error('Failed to restore draft', e);
      localStorage.removeItem('smartnotes_draft');
    }
  };

  // Smart Auto-Scroll: only follow bottom if user has not scrolled up manually
  const SCROLL_THRESHOLD = 80; // px from bottom — if within this, user is "at bottom"

  const handleTranscriptionScroll = () => {
    const el = transcriptionRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // If user scrolled more than threshold from bottom → they scrolled up intentionally
    setIsUserScrolledUp(distanceFromBottom > SCROLL_THRESHOLD);
  };

  const scrollToBottom = (smooth = true) => {
    const el = transcriptionRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
    });
  };

  // Auto-scroll when new transcription arrives — ONLY if user is at/near bottom
  useEffect(() => {
    if (!isUserScrolledUp) {
      scrollToBottom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, currentText]);

  // Auto-save interval — saves a draft to localStorage while recording
  useEffect(() => {
    // Clear previous timer
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    // Only run while recording or paused
    if (state !== 'recording' && state !== 'paused') return;

    const intervalMs = autoSaveInterval * 60 * 1000; // convert minutes to ms
    autoSaveTimerRef.current = setInterval(() => {
      const text = getFullTranscription();
      if (!text.trim()) return;

      const draft = {
        subject: currentSubject,
        content: text,
        wordCount: getWordCount(),
        duration: getDuration(),
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('smartnotes_draft', JSON.stringify(draft));
      setLastAutoSave(new Date());
    }, intervalMs);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [state, autoSaveInterval, currentSubject, getFullTranscription, getWordCount, getDuration, addToast]);

  const handleCorrectText = async () => {
    const fullText = getFullTranscription();
    if (!fullText || fullText.trim().length === 0) return;

    try {
      addToast({ type: 'info', message: 'Memperbaiki transkripsi dengan AI...' });
      const result = await correctText(fullText, 'id');
      if (result && result.correctedText && result.correctedText !== fullText) {
        addToast({ type: 'success', message: 'Teks perbaikan siap. Menyimpan ke draft...' });
        const draft = {
          subject: currentSubject,
          content: result.correctedText,
          wordCount: result.correctedText.split(/\s+/).filter(Boolean).length,
          duration: getDuration(),
          savedAt: new Date().toISOString(),
          isCorrected: true
        };
        localStorage.setItem('smartnotes_draft', JSON.stringify(draft));
        setLastAutoSave(new Date());
      }
    } catch (err) {
      addToast({ type: 'error', message: 'Gagal memperbaiki transkripsi' });
    }
  };

  // Show error toast
  useEffect(() => {
    if (error) {
      addToast({ type: 'error', message: error });
    }
  }, [error, addToast]);

  const handleStart = async () => {
    await startRecording();
  };

  const handleStop = () => {
    stopRecording();
    setShowSaveDialog(true);
    setNoteTitle(`Untitled - ${format(new Date(), 'd MMMM yyyy', { locale: id })}`);
  };

  const handleSave = async () => {
    if (!noteTitle.trim()) return;

    setProcessing();

    const fullText = getFullTranscription();
    const duration = getDuration();
    const wordCount = getWordCount();

    let aiResult;
    let aiError = false;

    const trimmedText = fullText.trim();
    const shouldUseAI =
      (ai.autoSummarize || ai.autoExtractKeywords || ai.autoCreateOutline || ai.generateFlashcards) &&
      trimmedText.length >= 2 &&
      wordCount >= 1;

    // Process with Gemini AI (with fallback if fails)
    if (shouldUseAI) {
      try {
        aiResult = await processNote(trimmedText, {
          generateSummary: ai.autoSummarize,
          extractKeywords: ai.autoExtractKeywords,
          createOutline: ai.autoCreateOutline,
          generateFlashcards: ai.generateFlashcards,
          language: 'id',
        });

        if (aiResult.error) {
          aiError = true;
          console.warn('AI processing failed:', aiResult.error);
        }
      } catch (err) {
        aiError = true;
        console.error('AI processing error:', err);
      }
    } else {
      aiError = true;
      if (!trimmedText) {
        console.warn('AI processing skipped: transcription text is empty.');
      }
    }

    // BASE DATA (Data inti)
    const baseData = {
      title: noteTitle,
      content: fullText,
      subject: currentSubject,
      duration,
      wordCount,
      summary: (!aiError && aiResult?.summary)
        ? aiResult.summary
        : '',
      keywords: (!aiError && aiResult?.keywords && aiResult.keywords.length > 0)
        ? aiResult.keywords
        : [],
      outline: (!aiError && aiResult?.outline && aiResult.outline.length > 0)
        ? aiResult.outline
        : [],
    };

    // Selalu simpan ke local Zustand store agar data aman tersimpan
    addNote(baseData);

    // Jika Firebase siap dan user terautentikasi, sinkronisasikan juga ke cloud
    if (isFirebaseReady && userId) {
      try {
        await saveNoteToCloud(baseData);
      } catch (err) {
        console.error('Failed to save to cloud:', err);
      }
    }

    setShowSaveDialog(false);
    resetRecording();
    // Clear auto-save draft after manual save
    localStorage.removeItem('smartnotes_draft');
    setLastAutoSave(null);

    if (aiError && shouldUseAI) {
      addToast({
        type: 'warning',
        message: 'Catatan disimpan! Pemrosesan AI gagal, coba proses ulang dari halaman catatan.'
      });
    } else {
      addToast({
        type: 'success',
        message: 'Catatan berhasil disimpan!'
      });
    }

    setCurrentPage('notes');
  };

  const handleDiscard = () => {
    setShowSaveDialog(false);
    resetRecording();
    // Clear auto-save draft on discard too
    localStorage.removeItem('smartnotes_draft');
    setLastAutoSave(null);
    addToast({
      type: 'info',
      message: 'Rekaman dibatalkan'
    });
  };


  return (
    <div className="space-y-6">
      {/* Draft Restore Notice */}
      <AnimatePresence>
        {showRestoreDraft && (
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
                  onClick={() => { localStorage.removeItem('smartnotes_draft'); setShowRestoreDraft(false); }}
                  className="text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  Hapus Draf
                </Button>
                <Button
                  size="sm"
                  onClick={handleRestoreDraft}
                  className="text-xs bg-[#6C63FF] hover:bg-[#5548E8] text-white h-10 px-6 shadow-md"
                >
                  Pulihkan Sekarang
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300',
                state === 'recording' ? 'bg-red-500 animate-recording-pulse' :
                  state === 'paused' ? 'bg-yellow-500' :
                    'bg-[#6C63FF]'
              )}>
                {state === 'recording' ? (
                  <div className="w-4 h-4 bg-white rounded-sm" />
                ) : state === 'paused' ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Mic className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {state === 'recording' ? 'Sedang Merekam...' :
                    state === 'paused' ? 'Dijeda' :
                      state === 'processing' ? 'Memproses...' :
                        'Siap Merekam'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(), 'EEEE, d MMMM yyyy | HH:mm', { locale: id })} WIB
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Subject Selector */}
              <Select value={currentSubject} onValueChange={setCurrentSubject} disabled={state !== 'idle'}>
                <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800">
                  <SelectValue placeholder="Pilih mata kuliah" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.name}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: subject.color }} />
                        {subject.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transcription Display */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="w-5 h-5 text-[#6C63FF]" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Transkripsi Langsung</h3>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <AnimatePresence>
                {lastAutoSave && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-full text-xs font-medium text-green-600 dark:text-green-400 shadow-sm"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Draft tersimpan {lastAutoSave.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </motion.div>
                )}
              </AnimatePresence>

              {state === 'idle' && getFullTranscription().length > 10 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCorrectText}
                  disabled={isAIProcessing}
                  className="h-7 text-xs flex items-center gap-1.5"
                >
                  <Wand2 className="w-3 h-3 text-[#6C63FF]" />
                  {isAIProcessing ? 'Memperbaiki...' : 'Perbaiki Teks'}
                </Button>
              )}

              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDuration(getDuration())}
              </span>
              <span>{getWordCount()} kata</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 relative">
          <div
            ref={transcriptionRef}
            onScroll={handleTranscriptionScroll}
            className="h-[400px] overflow-y-auto p-6 space-y-4 scrollbar-thin relative"
          >
            {segments.length === 0 && !currentText && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Type className="w-12 h-12 mb-4 opacity-50" />
                <p>Transkripsi akan muncul di sini</p>
                <p className="text-sm">Klik tombol rekam untuk memulai</p>
              </div>
            )}

            <AnimatePresence>
              {segments.map((segment) => (
                <motion.div
                  key={segment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xs text-gray-400 font-mono mt-1">
                      {format(segment.timestamp, 'HH:mm:ss')}
                    </span>
                    <p className="flex-1 text-gray-700 dark:text-gray-300 leading-relaxed">
                      {segment.text}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {currentText && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-3"
              >
                <span className="text-xs text-gray-400 font-mono mt-1">
                  {format(new Date(), 'HH:mm:ss')}
                </span>
                <p className="flex-1 text-gray-700 dark:text-gray-300 leading-relaxed">
                  {currentText}
                  <span className="inline-block w-0.5 h-5 bg-[#6C63FF] ml-1 animate-pulse" />
                </p>
              </motion.div>
            )}
            {/* Sentinel div for precise scroll target */}
            <div ref={bottomSentinelRef} className="h-1" />
          </div>

          {/* Jump-to-bottom pill — appears when user scrolls up */}
          <AnimatePresence>
            {isUserScrolledUp && (state === 'recording' || state === 'paused') && (
              <motion.button
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.9 }}
                onClick={() => { scrollToBottom(); setIsUserScrolledUp(false); }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#6C63FF] text-white text-xs font-semibold shadow-lg shadow-[#6C63FF]/30 hover:bg-[#5548E8] transition-all"
              >
                <span className="animate-bounce">↓</span>
                Teks Terbaru
              </motion.button>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Control Panel */}
      <Card className="border-0 shadow-lg sticky bottom-4 md:bottom-6 z-10">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Audio Visualizer */}
            <div className="hidden md:block w-48">
              {state === 'recording' ? (
                <AudioVisualizer />
              ) : (
                <div className="h-12 flex items-center justify-center text-gray-400 text-sm">
                  {state === 'idle' ? 'Siap merekam' : 'Audio dijeda'}
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="text-2xl font-mono font-semibold text-gray-900 dark:text-white">
              {formatDuration(getDuration())}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {state === 'idle' ? (
                <Button
                  onClick={handleStart}
                  size="lg"
                  className="bg-gradient-to-r from-[#6C63FF] to-[#5548E8] hover:opacity-90 text-white px-8"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Mulai Rekam
                </Button>
              ) : state === 'recording' ? (
                <>
                  <Button
                    onClick={pauseRecording}
                    variant="outline"
                    size="lg"
                    className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                  >
                    <Pause className="w-5 h-5 mr-2" />
                    Jeda
                  </Button>
                  <Button
                    onClick={handleStop}
                    size="lg"
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Square className="w-5 h-5 mr-2" />
                    Berhenti
                  </Button>
                </>
              ) : state === 'paused' ? (
                <>
                  <Button
                    onClick={resumeRecording}
                    variant="outline"
                    size="lg"
                    className="border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/10"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Lanjutkan
                  </Button>
                  <Button
                    onClick={handleStop}
                    size="lg"
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Square className="w-5 h-5 mr-2" />
                    Berhenti
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
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
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#6C63FF]/50 focus:border-[#6C63FF] outline-none"
                placeholder="Masukkan judul catatan..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <span className="text-gray-500">Durasi</span>
                <p className="font-semibold text-gray-900 dark:text-white">{formatDuration(getDuration())}</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <span className="text-gray-500">Jumlah Kata</span>
                <p className="font-semibold text-gray-900 dark:text-white">{getWordCount()}</p>
              </div>
            </div>

            {/* BUG FIX #13: Use only isAIProcessing from hook for consistent state */}
            {isAIProcessing && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#6C63FF]/10 text-[#6C63FF]">
                <div className="w-5 h-5 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">AI sedang memproses catatan...</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleDiscard}
              disabled={isAIProcessing}
              className="text-red-500 hover:bg-red-50"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Buang
            </Button>
            <Button
              onClick={handleSave}
              disabled={!noteTitle.trim() || isAIProcessing}
              className="bg-gradient-to-r from-[#6C63FF] to-[#5548E8] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {isAIProcessing ? 'Memproses...' : 'Simpan & Proses AI'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
