// BUG FIX #6: Remove unused getAnalytics import to prevent SSR issues
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, onValue, remove, update, get } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider, type User } from 'firebase/auth';
import { firebaseConfig } from '@/config/app.config';

// Check if Firebase config is valid
const isFirebaseConfigured = () => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId
  );
};

// Initialize Firebase only if configured
let app: ReturnType<typeof initializeApp> | null = null;
let database: ReturnType<typeof getDatabase> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    auth = getAuth(app);
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
} else {
  console.warn('Firebase not configured. Running in offline mode.');
}

// ==================== AUTH FUNCTIONS ====================

export const signInUser = async (): Promise<User | null> => {
  if (!auth) {
    console.warn('Firebase Auth not initialized');
    return null;
  }
  
  try {
    const result = await signInAnonymously(auth);
    console.log('Signed in anonymously:', result.user.uid);
    return result.user;
  } catch (error) {
    console.error('Auth error:', error);
    throw error;
  }
};

export const signInWithGoogle = async (): Promise<User | null> => {
  if (!auth) {
    console.warn('Firebase Auth not initialized');
    return null;
  }
  
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    console.log('Signed in with Google:', result.user.email);
    return result.user;
  } catch (error) {
    console.error('Google Sign In error:', error);
    throw error;
  }
};

export const logOut = async (): Promise<void> => {
  if (!auth) {
    console.warn('Firebase Auth not initialized');
    return;
  }
  
  try {
    await signOut(auth);
    console.log('User signed out');
  } catch (error) {
    console.error('Sign Out error:', error);
    throw error;
  }
};

export const getCurrentUser = (): User | null => {
  return auth?.currentUser || null;
};

export const onUserAuthStateChanged = (callback: (user: User | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  
  return onAuthStateChanged(auth, callback);
};

// ==================== NOTES FUNCTIONS ====================

export interface FirebaseNote {
  id?: string;
  title: string;
  content: string;
  subject: string;
  createdAt: number;
  updatedAt: number;
  duration: number;
  wordCount: number;
  summary?: string;
  keywords?: string[];
  outline?: string[];
}

export const saveNote = async (userId: string, note: Omit<FirebaseNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
  if (!database) {
    console.warn('Firebase Database not initialized');
    return null;
  }
  
  try {
    const notesRef = ref(database, `users/${userId}/notes`);
    const newNoteRef = push(notesRef);
    const timestamp = Date.now();
    
    await set(newNoteRef, {
      ...note,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    
    console.log('Note saved to Firebase:', newNoteRef.key);
    return newNoteRef.key;
  } catch (error) {
    console.error('Error saving note:', error);
    throw error;
  }
};

export const updateNote = async (userId: string, noteId: string, updates: Partial<FirebaseNote>): Promise<void> => {
  if (!database) {
    console.warn('Firebase Database not initialized');
    return;
  }
  
  try {
    const noteRef = ref(database, `users/${userId}/notes/${noteId}`);
    await update(noteRef, {
      ...updates,
      updatedAt: Date.now()
    });
    
    console.log('Note updated:', noteId);
  } catch (error) {
    console.error('Error updating note:', error);
    throw error;
  }
};

export const deleteNote = async (userId: string, noteId: string): Promise<void> => {
  if (!database) {
    console.warn('Firebase Database not initialized');
    return;
  }
  
  try {
    const noteRef = ref(database, `users/${userId}/notes/${noteId}`);
    await remove(noteRef);
    console.log('Note deleted:', noteId);
  } catch (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
};

export const getNoteById = async (userId: string, noteId: string): Promise<FirebaseNote | null> => {
  if (!database) {
    console.warn('Firebase Database not initialized');
    return null;
  }
  
  try {
    const noteRef = ref(database, `users/${userId}/notes/${noteId}`);
    const snapshot = await get(noteRef);
    
    if (snapshot.exists()) {
      return { id: noteId, ...snapshot.val() } as FirebaseNote;
    }
    return null;
  } catch (error) {
    console.error('Error getting note:', error);
    throw error;
  }
};

// Mengubah parameter agar tidak selalu butuh spesifik userId demi merangkum seluruh notes admin secara public
// Mengambil data langsung dari public_notes
export const subscribeToNotes = (callback: (notes: FirebaseNote[]) => void) => {
  if (!database) {
    console.warn('Firebase Database not initialized');
    callback([]);
    return () => {};
  }
  
  // Baca root "users" agar tampilkan ke pengunjung public
  const notesRef = ref(database, `users`);
  
  return onValue(notesRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      let notesArray: FirebaseNote[] = [];
      
      // Loop tiap akun user/admin
      Object.keys(data).forEach(uid => {
        const userNotes = data[uid].notes;
        if (userNotes) {
          const parsedNotes = Object.entries(userNotes).map(([id, note]: [string, any]) => ({
            id,
            ...note
          })) as FirebaseNote[];
          notesArray = [...notesArray, ...parsedNotes];
        }
      });
      
      // Sort by createdAt descending
      notesArray.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(notesArray);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error('Error subscribing to global notes:', error);
    callback([]);
  });
};

// ==================== REAL-TIME TRANSCRIPTION SESSIONS ====================

export interface TranscriptionChunk {
  id?: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
  speaker?: string;
}

export interface TranscriptionSession {
  id?: string;
  userId: string;
  subject: string;
  startTime: number;
  endTime?: number;
  status: 'active' | 'paused' | 'completed';
  chunks?: TranscriptionChunk[];
}

export const createTranscriptionSession = async (userId: string, subject: string): Promise<string | null> => {
  if (!database) {
    console.warn('Firebase Database not initialized');
    return null;
  }
  
  try {
    const sessionsRef = ref(database, 'sessions');
    const newSessionRef = push(sessionsRef);
    
    await set(newSessionRef, {
      userId,
      subject,
      startTime: Date.now(),
      status: 'active'
    });
    
    console.log('Transcription session created:', newSessionRef.key);
    return newSessionRef.key;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

export const saveTranscriptionChunk = async (sessionId: string, chunk: Omit<TranscriptionChunk, 'id' | 'timestamp'>): Promise<void> => {
  if (!database) {
    console.warn('Firebase Database not initialized');
    return;
  }
  
  try {
    const chunksRef = ref(database, `sessions/${sessionId}/chunks`);
    const newChunkRef = push(chunksRef);
    
    await set(newChunkRef, {
      ...chunk,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error saving transcription chunk:', error);
    throw error;
  }
};

export const updateSessionStatus = async (sessionId: string, status: TranscriptionSession['status']): Promise<void> => {
  if (!database) {
    console.warn('Firebase Database not initialized');
    return;
  }
  
  try {
    const sessionRef = ref(database, `sessions/${sessionId}`);
    const updates: any = { status };
    
    if (status === 'completed') {
      updates.endTime = Date.now();
    }
    
    await update(sessionRef, updates);
  } catch (error) {
    console.error('Error updating session status:', error);
    throw error;
  }
};

export const subscribeToTranscription = (sessionId: string, callback: (chunks: TranscriptionChunk[]) => void) => {
  if (!database) {
    console.warn('Firebase Database not initialized');
    callback([]);
    return () => {};
  }
  
  const chunksRef = ref(database, `sessions/${sessionId}/chunks`);
  
  return onValue(chunksRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const chunksArray = Object.entries(data).map(([id, chunk]: [string, any]) => ({
        id,
        ...chunk
      })) as TranscriptionChunk[];
      
      // Sort by timestamp ascending
      chunksArray.sort((a, b) => a.timestamp - b.timestamp);
      callback(chunksArray);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error('Error subscribing to transcription:', error);
    callback([]);
  });
};

// ==================== STATISTICS FUNCTIONS ====================

export const getUserStats = async (userId: string) => {
  if (!database) {
    console.warn('Firebase Database not initialized');
    return null;
  }
  
  try {
    const notesRef = ref(database, `users/${userId}/notes`);
    const snapshot = await get(notesRef);
    
    if (!snapshot.exists()) {
      return {
        totalNotes: 0,
        totalDuration: 0,
        totalWords: 0,
        subjects: {},
        dailyActivity: {}
      };
    }
    
    const notes = Object.values(snapshot.val()) as FirebaseNote[];
    
    const stats = {
      totalNotes: notes.length,
      totalDuration: notes.reduce((sum, n) => sum + (n.duration || 0), 0),
      totalWords: notes.reduce((sum, n) => sum + (n.wordCount || 0), 0),
      subjects: {} as Record<string, { count: number; duration: number }>,
      dailyActivity: {} as Record<string, { count: number; duration: number }>
    };
    
    notes.forEach(note => {
      // Subject stats
      if (!stats.subjects[note.subject]) {
        stats.subjects[note.subject] = { count: 0, duration: 0 };
      }
      stats.subjects[note.subject].count++;
      stats.subjects[note.subject].duration += note.duration || 0;
      
      // Daily activity
      const date = new Date(note.createdAt).toISOString().split('T')[0];
      if (!stats.dailyActivity[date]) {
        stats.dailyActivity[date] = { count: 0, duration: 0 };
      }
      stats.dailyActivity[date].count++;
      stats.dailyActivity[date].duration += note.duration || 0;
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting stats:', error);
    throw error;
  }
};

// ==================== EXPORT ====================

export { app, database, auth, isFirebaseConfigured };
export default app;
