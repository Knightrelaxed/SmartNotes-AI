import { useState, useRef, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useRecordStore } from '@/store/recordStore';
import { useNotesStore } from '@/store/notesStore';
import { useUIStore } from '@/store/uiStore';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAI } from '@/hooks/useAI';
import { useFirebase } from '@/hooks/useFirebase';
import { useSettingsStore } from '@/store/settingsStore';
import { formatDate, formatDuration } from '@/utils/formatters';
import { DraftRestoreBanner } from '@/components/record/DraftRestoreBanner';
import { RecordControls } from '@/components/record/RecordControls';
import { TranscriptionDisplay } from '@/components/record/TranscriptionDisplay';
import { SaveNoteDialog } from '@/components/record/SaveNoteDialog';

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
    addSegment,
  } = useRecordStore();

  const { notes, addNote, updateNote, addSubject, subjects } = useNotesStore();
  const { addToast, setCurrentPage } = useUIStore();
  const {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    error,
    engine,
    isLiveConnected,
  } = useAudioRecorder();
  const { processNote, correctText, isProcessing: isAIProcessing } = useAI();
  const { saveNoteToCloud, isConfigured: isFirebaseReady } = useFirebase();
  const { ai, interface: { autoSaveInterval } } = useSettingsStore();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [showRestoreDraft, setShowRestoreDraft] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleAddBookmark = () => {
    if (state !== 'recording') return;
    const timeStr = formatDuration(getDuration());
    addSegment(`⭐ [POIN PENTING - ${timeStr}]`, true);
    addToast({ type: 'info', message: `Poin penting ditandai (${timeStr})` });
  };

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
      useRecordStore.getState().clearTranscription();
      addSegment(draft.content, true);
      addToast({ type: 'success', message: 'Draft berhasil dipulihkan!' });
      setShowRestoreDraft(false);
    } catch {
      localStorage.removeItem('smartnotes_draft');
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('smartnotes_draft');
    setShowRestoreDraft(false);
  };

  // Auto-save interval — saves a draft to localStorage while recording
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    if (state !== 'recording' && state !== 'paused') return;

    // autoSaveInterval is in seconds (or minutes for legacy values < 30)
    const intervalMs = autoSaveInterval >= 30 ? autoSaveInterval * 1000 : autoSaveInterval * 60 * 1000;
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
  }, [state, autoSaveInterval, currentSubject, getFullTranscription, getWordCount, getDuration]);

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
          isCorrected: true,
        };
        localStorage.setItem('smartnotes_draft', JSON.stringify(draft));
        setLastAutoSave(new Date());
      }
    } catch {
      addToast({ type: 'error', message: 'Gagal memperbaiki transkripsi' });
    }
  };

  useEffect(() => {
    if (error) {
      addToast({ type: 'error', message: error });
    }
  }, [error, addToast]);

  const handleStart = async () => {
    await startRecording();
  };

  const handleStop = async () => {
    const duration = getDuration();
    const wordCount = getWordCount();

    // Prevent saving accidental ghost notes (< 5s and < 3 words)
    if (duration < 5 && wordCount < 3) {
      await stopRecording();
      resetRecording();
      localStorage.removeItem('smartnotes_draft');
      setLastAutoSave(null);
      addToast({
        type: 'info',
        message: 'Rekaman terlalu singkat (< 5 detik), tidak disimpan.',
      });
      return;
    }

    await stopRecording();
    setShowSaveDialog(true);
    const defaultTitle = currentSubject
      ? `${currentSubject} - ${formatDate(new Date(), 'd MMMM yyyy')}`
      : `Catatan - ${formatDate(new Date(), 'd MMMM yyyy')}`;
    setNoteTitle(defaultTitle);
  };

  const handleSave = async () => {
    if (!noteTitle.trim()) return;

    const fullText = getFullTranscription();
    const duration = getDuration();
    const wordCount = getWordCount();
    const chosenSubject = currentSubject;
    const initialTitle = noteTitle.trim();

    // 1. Instantly close save dialog and reset recording state (non-blocking UX)
    setShowSaveDialog(false);
    resetRecording();
    localStorage.removeItem('smartnotes_draft');
    setLastAutoSave(null);

    // 2. Save note immediately to local store
    const baseData = {
      title: initialTitle,
      content: fullText,
      subject: chosenSubject,
      duration,
      wordCount,
      summary: '',
      keywords: [],
      outline: [],
    };

    const noteId = addNote(baseData);
    addToast({
      type: 'success',
      message: 'Catatan tersimpan! Ringkasan AI diproses di latar belakang...',
    });
    setCurrentPage('notes');

    // 3. Process AI asynchronously in the background
    const trimmedText = fullText.trim();
    const shouldUseAI =
      (ai.autoSummarize || ai.autoExtractKeywords || ai.autoCreateOutline || ai.generateFlashcards) &&
      trimmedText.length >= 2 &&
      wordCount >= 1;

    if (shouldUseAI) {
      try {
        const aiResult = await processNote(trimmedText, {
          generateSummary: ai.autoSummarize,
          extractKeywords: ai.autoExtractKeywords,
          createOutline: ai.autoCreateOutline,
          generateFlashcards: ai.generateFlashcards,
          language: 'id',
        });

        if (aiResult && !aiResult.error) {
          // If title was default/generic, auto-update with AI title!
          const isGenericTitle =
            initialTitle.startsWith('Catatan -') ||
            (chosenSubject && initialTitle === `${chosenSubject} - ${formatDate(new Date(), 'd MMMM yyyy')}`);

          const finalTitle = (isGenericTitle && aiResult.title) ? aiResult.title : initialTitle;

          const updatedNote = {
            ...baseData,
            title: finalTitle,
            summary: aiResult.summary || '',
            keywords: aiResult.keywords || [],
            outline: aiResult.outline || [],
            flashcards: aiResult.flashcards || [],
          };

          updateNote(noteId, updatedNote);

          if (isFirebaseReady) {
            saveNoteToCloud(updatedNote).catch(console.error);
          }

          addToast({
            type: 'success',
            message: `Ringkasan AI untuk "${finalTitle}" selesai dibuat!`,
          });
          return;
        }
      } catch (err) {
        console.warn('[RecordPage] Background AI processing failed:', err);
      }
    }

    // If AI was disabled or encountered an error, sync base note to cloud
    if (isFirebaseReady) {
      saveNoteToCloud(baseData).catch(console.error);
    }
  };

  const handleDiscard = () => {
    setShowSaveDialog(false);
    resetRecording();
    localStorage.removeItem('smartnotes_draft');
    setLastAutoSave(null);
    addToast({
      type: 'info',
      message: 'Rekaman dibatalkan',
    });
  };

  return (
    <div className="space-y-6">
      {/* Onboarding Guide for New Users */}
      {showOnboarding && notes.length === 0 && state === 'idle' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#6C63FF]/10 via-[#5548E8]/10 to-[#FF6584]/10 border border-[#6C63FF]/20 flex items-start justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#6C63FF] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                Panduan Memulai Cepat
              </h4>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-600 dark:text-gray-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-4 h-4 rounded-full bg-[#6C63FF]/20 text-[#6C63FF] flex items-center justify-center text-[10px] font-bold">1</span>
                  Pilih mata kuliah
                </span>
                <span className="text-gray-400">→</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-4 h-4 rounded-full bg-[#6C63FF]/20 text-[#6C63FF] flex items-center justify-center text-[10px] font-bold">2</span>
                  Klik Mulai Merekam
                </span>
                <span className="text-gray-400">→</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-4 h-4 rounded-full bg-[#6C63FF]/20 text-[#6C63FF] flex items-center justify-center text-[10px] font-bold">3</span>
                  AI otomatis mentranskripsi & membuat kartu belajar
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowOnboarding(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
            title="Tutup panduan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Draft Restore Notice */}
      <DraftRestoreBanner
        show={showRestoreDraft}
        onRestore={handleRestoreDraft}
        onDiscard={handleDiscardDraft}
      />

      {/* Control Header & Action Bar */}
      <RecordControls
        state={state}
        duration={getDuration()}
        currentSubject={currentSubject}
        subjects={subjects}
        onSelectSubject={setCurrentSubject}
        onAddSubject={(name) => {
          addSubject({ name, color: '#6C63FF' });
          setCurrentSubject(name);
          addToast({ type: 'success', message: `Mata kuliah "${name}" ditambahkan!` });
        }}
        onStart={handleStart}
        onPause={pauseRecording}
        onResume={resumeRecording}
        onStop={handleStop}
        onAddBookmark={handleAddBookmark}
        engine={engine}
        isLiveConnected={isLiveConnected}
      />

      {/* Transcription Display */}
      <TranscriptionDisplay
        state={state}
        segments={segments}
        currentText={currentText}
        duration={getDuration()}
        wordCount={getWordCount()}
        lastAutoSave={lastAutoSave}
        isAIProcessing={isAIProcessing}
        onCorrectText={handleCorrectText}
        onStartRecord={startRecording}
      />

      {/* Save Note Dialog */}
      <SaveNoteDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        title={noteTitle}
        onChangeTitle={setNoteTitle}
        duration={getDuration()}
        wordCount={getWordCount()}
        isProcessing={isAIProcessing}
        onDiscard={handleDiscard}
        onSave={handleSave}
      />
    </div>
  );
}
