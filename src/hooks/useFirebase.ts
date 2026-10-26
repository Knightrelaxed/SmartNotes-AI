import { useEffect, useState, useCallback, useRef } from 'react';
import {
  signInUser,
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
  const notesUnsubscribeRef = useRef<(() => void) | null>(null);
  
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
    unsubscribeAuth = onUserAuthStateChanged(async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        try {
          const anonUser = await signInUser();
          if (anonUser) {
            setUserId(anonUser.uid);
          }
        } catch {
          setUserId(null);
        }
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
    if (notesUnsubscribeRef.current) {
      notesUnsubscribeRef.current();
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
      
      // Merge dengan catatan lokal agar catatan tidak terhapus jika Firebase kosong
      if (appNotes.length > 0) {
        const currentNotes = useNotesStore.getState().notes;
        const cloudIds = new Set(appNotes.map(n => n.id));
        const localOnlyNotes = currentNotes.filter(n => !cloudIds.has(n.id));
        useNotesStore.getState().setNotes([...appNotes, ...localOnlyNotes]);
      }
    });

    notesUnsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
      notesUnsubscribeRef.current = null;
    };
  }, [isConfigured]);

  // Save note to cloud
  const saveNoteToCloud = useCallback(async (
    note: Omit<FirebaseNote, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string | null> => {
    if (!isConfigured) {
      console.warn('Cannot save note: Firebase not configured');
      return null;
    }
    const currentUserId = userId || 'anonymous';
    try {
      const noteId = await saveNote(currentUserId, note);
      if (noteId) {
        addToast({ type: 'success', message: 'Catatan tersimpan ke Cloud Firestore' });
      }
      return noteId;
    } catch (err) {
      console.error('Error saving note:', err);
      addToast({ type: 'error', message: 'Gagal menyimpan ke Cloud Firestore' });
      throw err;
    }
  }, [userId, isConfigured, addToast]);

  // Update note in cloud
  const updateNoteInCloud = useCallback(async (
    noteId: string,
    updates: Partial<FirebaseNote>
  ): Promise<void> => {
    if (!isConfigured) {
      console.warn('Cannot update note: Firebase not configured');
      return;
    }

    try {
      await updateNote(userId || 'anonymous', noteId, updates);
      addToast({ type: 'success', message: 'Catatan diperbarui di Cloud' });
    } catch (err) {
      console.error('Error updating note:', err);
      addToast({ type: 'error', message: 'Gagal memperbarui catatan di Cloud' });
      throw err;
    }
  }, [userId, isConfigured, addToast]);

  // Delete note from cloud
  const deleteNoteFromCloud = useCallback(async (noteId: string): Promise<void> => {
    if (!isConfigured) {
      console.warn('Cannot delete note: Firebase not configured');
      return;
    }

    try {
      await deleteNote(userId || 'anonymous', noteId);
      addToast({ type: 'success', message: 'Catatan dihapus dari Cloud' });
    } catch (err) {
      console.error('Error deleting note:', err);
      addToast({ type: 'error', message: 'Gagal menghapus catatan dari Cloud' });
      throw err;
    }
  }, [userId, isConfigured, addToast]);

  // Refresh notes (manual trigger)
  const refreshNotes = useCallback(() => {
    if (!isConfigured) {
      return;
    }

    // Re-subscribe to trigger fresh data
    if (notesUnsubscribeRef.current) {
      notesUnsubscribeRef.current();
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

    notesUnsubscribeRef.current = unsubscribe;
  }, [isConfigured]);

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
