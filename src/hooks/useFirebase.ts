import { useEffect, useState, useCallback } from 'react';
import {
  onUserAuthStateChanged,
  subscribeToNotes,
  saveNote,
  updateNote,
  deleteNote,
  createTranscriptionSession,
  saveTranscriptionChunk,
  updateSessionStatus,
  subscribeToTranscription,
  isFirebaseConfigured,
  type FirebaseNote
} from '@/lib/firebase';
import { useUIStore } from '@/store/uiStore';
import { useNotesStore } from '@/store/notesStore';

interface UseFirebaseReturn {
  // State
  isInitialized: boolean;
  isConfigured: boolean;
  userId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Notes
  notes: FirebaseNote[];
  refreshNotes: () => void;
  saveNoteToCloud: (note: Omit<FirebaseNote, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string | null>;
  updateNoteInCloud: (noteId: string, updates: Partial<FirebaseNote>) => Promise<void>;
  deleteNoteFromCloud: (noteId: string) => Promise<void>;
  
  // Transcription Session
  createSession: (subject: string) => Promise<string | null>;
  saveTranscription: (sessionId: string, text: string, isFinal: boolean) => Promise<void>;
  endSession: (sessionId: string) => Promise<void>;
  subscribeToSession: (sessionId: string, callback: (chunks: any[]) => void) => (() => void);
}

export function useFirebase(): UseFirebaseReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<FirebaseNote[]>([]);
  const [notesUnsubscribe, setNotesUnsubscribe] = useState<(() => void) | null>(null);
  
  const { addToast } = useUIStore();
  const isConfigured = isFirebaseConfigured();

  // Initialize Firebase Auth
  useEffect(() => {
    if (!isConfigured) {
      console.log('Firebase not configured, running in offline mode');
      setIsLoading(false);
      setIsInitialized(true);
      return;
    }

    let unsubscribeAuth: (() => void) | null = null;

    const initAuth = async () => {
      // Just initialize without setting loading to false yet
      try {
        // any initial setup if needed
      } catch (err) {
        console.error('Firebase auth error:', err);
        setError('Gagal inisialisasi Firebase');
        setIsLoading(false);
        addToast({
          type: 'error',
          message: 'Gagal terhubung ke database. Data akan disimpan lokal.',
        });
      }
    };

    // Listen for auth state changes
    unsubscribeAuth = onUserAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
      setIsInitialized(true);
      setIsLoading(false);
    });

    initAuth();

    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, [isConfigured, addToast]);

  // Subscribe to GLOBAL notes unconditionally (Public Read)
  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    // Unsubscribe from previous subscription
    if (notesUnsubscribe) {
      notesUnsubscribe();
    }

    // Subscribe to notes
    const unsubscribe = subscribeToNotes((newNotes) => {
      setNotes(newNotes);
      
      // Ubah struktur FirebaseNote menjadi spesifikasi Note milik Zustand
      const appNotes = newNotes.map(note => ({
        ...note,
        id: note.id || String(note.createdAt),
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt)
      }));
      
      // Sinkronisasikan secara hardcode ke Zustand
      useNotesStore.getState().setNotes(appNotes);
    });

    setNotesUnsubscribe(() => unsubscribe);

    return () => {
      unsubscribe();
    };
  }, [isConfigured]);

  // Save note to cloud
  const saveNoteToCloud = useCallback(async (
    note: Omit<FirebaseNote, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string | null> => {
    if (!isConfigured || !userId) {
      console.warn('Cannot save note: Firebase not configured or no user');
      return null;
    }
    try {
      const noteId = await saveNote(userId, note);
      if (noteId) {
        addToast({ type: 'success', message: 'Catatan tersimpan ke cloud' });
      }
      return noteId;
    } catch (err) {
      console.error('Error saving note:', err);
      addToast({ type: 'error', message: 'Gagal menyimpan ke cloud' });
      throw err;
    }
  }, [userId, isConfigured, addToast]);

  // Update note in cloud
  const updateNoteInCloud = useCallback(async (
    noteId: string,
    updates: Partial<FirebaseNote>
  ): Promise<void> => {
    if (!isConfigured || !userId) {
      console.warn('Cannot update note: Firebase not configured or no user');
      return;
    }

    try {
      await updateNote(userId, noteId, updates);
      addToast({ type: 'success', message: 'Catatan diperbarui' });
    } catch (err) {
      console.error('Error updating note:', err);
      addToast({ type: 'error', message: 'Gagal memperbarui catatan' });
      throw err;
    }
  }, [userId, isConfigured, addToast]);

  // Delete note from cloud
  const deleteNoteFromCloud = useCallback(async (noteId: string): Promise<void> => {
    if (!isConfigured || !userId) {
      console.warn('Cannot delete note: Firebase not configured or no user');
      return;
    }

    try {
      await deleteNote(userId, noteId);
      addToast({ type: 'success', message: 'Catatan dihapus' });
    } catch (err) {
      console.error('Error deleting note:', err);
      addToast({ type: 'error', message: 'Gagal menghapus catatan' });
      throw err;
    }
  }, [userId, isConfigured, addToast]);

  // Refresh notes (manual trigger)
  const refreshNotes = useCallback(() => {
    if (!isConfigured) {
      return;
    }

    // Re-subscribe to trigger fresh data
    if (notesUnsubscribe) {
      notesUnsubscribe();
    }

    const unsubscribe = subscribeToNotes((newNotes) => {
      setNotes(newNotes);
      const appNotes = newNotes.map(note => ({
        ...note,
        id: note.id || String(note.createdAt),
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt)
      }));
      useNotesStore.getState().setNotes(appNotes);
    });

    setNotesUnsubscribe(() => unsubscribe);
  }, [isConfigured, notesUnsubscribe]);

  // Create transcription session
  const createSession = useCallback(async (subject: string): Promise<string | null> => {
    if (!isConfigured || !userId) {
      console.warn('Cannot create session: Firebase not configured or no user');
      return null;
    }

    try {
      const sessionId = await createTranscriptionSession(userId, subject);
      return sessionId;
    } catch (err) {
      console.error('Error creating session:', err);
      return null;
    }
  }, [userId, isConfigured]);

  // Save transcription chunk
  const saveTranscription = useCallback(async (
    sessionId: string,
    text: string,
    isFinal: boolean
  ): Promise<void> => {
    if (!isConfigured) {
      return;
    }

    try {
      await saveTranscriptionChunk(sessionId, { text, isFinal });
    } catch (err) {
      console.error('Error saving transcription:', err);
    }
  }, [isConfigured]);

  // End transcription session
  const endSession = useCallback(async (sessionId: string): Promise<void> => {
    if (!isConfigured) {
      return;
    }

    try {
      await updateSessionStatus(sessionId, 'completed');
    } catch (err) {
      console.error('Error ending session:', err);
    }
  }, [isConfigured]);

  // Subscribe to transcription session
  const subscribeToSession = useCallback((
    sessionId: string,
    callback: (chunks: any[]) => void
  ): (() => void) => {
    if (!isConfigured) {
      callback([]);
      return () => {};
    }

    return subscribeToTranscription(sessionId, callback);
  }, [isConfigured]);

  return {
    isInitialized,
    isConfigured,
    userId,
    isLoading,
    error,
    notes,
    refreshNotes,
    saveNoteToCloud,
    updateNoteInCloud,
    deleteNoteFromCloud,
    createSession,
    saveTranscription,
    endSession,
    subscribeToSession
  };
}
