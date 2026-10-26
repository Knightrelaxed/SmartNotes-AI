import { useState, useRef, useEffect } from 'react';
import { useRecordStore } from '@/store/recordStore';
import { useNotesStore } from '@/store/notesStore';
import { useUIStore } from '@/store/uiStore';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAI } from '@/hooks/useAI';
import { useFirebase } from '@/hooks/useFirebase';
import { useSettingsStore } from '@/store/settingsStore';
import { formatDate } from '@/utils/formatters';
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
    setProcessing,
    addSegment,
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

    const intervalMs = autoSaveInterval * 60 * 1000;
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

  const handleStop = () => {
    stopRecording();
    setShowSaveDialog(true);
    setNoteTitle(`Kuliah ${currentSubject || 'Umum'} - ${formatDate(new Date(), 'd MMMM yyyy')}`);
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
        }
      } catch {
        aiError = true;
      }
    } else {
      aiError = true;
    }

    const baseData = {
      title: noteTitle,
      content: fullText,
      subject: currentSubject,
      duration,
      wordCount,
      summary: (!aiError && aiResult?.summary) ? aiResult.summary : '',
      keywords: (!aiError && aiResult?.keywords && aiResult.keywords.length > 0) ? aiResult.keywords : [],
      outline: (!aiError && aiResult?.outline && aiResult.outline.length > 0) ? aiResult.outline : [],
    };

    // Save locally first
    addNote(baseData);

    // Sync to cloud if authenticated
    if (isFirebaseReady && userId) {
      try {
        await saveNoteToCloud(baseData);
      } catch (err) {
        console.error('Failed to sync to cloud:', err);
      }
    }

    setShowSaveDialog(false);
    resetRecording();
    localStorage.removeItem('smartnotes_draft');
    setLastAutoSave(null);

    if (aiError && shouldUseAI) {
      addToast({
        type: 'warning',
        message: 'Catatan disimpan! Pemrosesan AI gagal, coba proses ulang dari halaman catatan.',
      });
    } else {
      addToast({
        type: 'success',
        message: 'Catatan berhasil disimpan!',
      });
    }

    setCurrentPage('notes');
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
        onStart={handleStart}
        onPause={pauseRecording}
        onResume={resumeRecording}
        onStop={handleStop}
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
