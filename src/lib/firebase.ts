import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  type Firestore,
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  type User,
  type Auth,
} from 'firebase/auth';
import { firebaseConfig } from '@/config/app.config';

// Check if Firebase config is valid
export const isFirebaseConfigured = (): boolean => {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
};

// Initialize Firebase
let app: ReturnType<typeof initializeApp> | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('Firebase Cloud Firestore & Auth initialized successfully');
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
    provider.setCustomParameters({ prompt: 'select_account' });
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
  userId?: string;
}

export const saveNote = async (
  userId: string,
  note: Omit<FirebaseNote, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | null> => {
  if (!db) {
    console.warn('Firestore not initialized');
    return null;
  }
  
  try {
    const timestamp = Date.now();
    const notesRef = collection(db, 'notes');
    const docRef = await addDoc(notesRef, {
      ...note,
      userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    
    console.log('Note saved to Firestore:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving note to Firestore:', error);
    throw error;
  }
};

export const updateNote = async (
  _userId: string,
  noteId: string,
  updates: Partial<FirebaseNote>
): Promise<void> => {
  if (!db) {
    console.warn('Firestore not initialized');
    return;
  }
  
  try {
    const noteRef = doc(db, 'notes', noteId);
    await updateDoc(noteRef, {
      ...updates,
      updatedAt: Date.now(),
    });
    
    console.log('Note updated in Firestore:', noteId);
  } catch (error) {
    console.error('Error updating note in Firestore:', error);
    throw error;
  }
};

export const deleteNote = async (
  _userId: string,
  noteId: string
): Promise<void> => {
  if (!db) {
    console.warn('Firestore not initialized');
    return;
  }
  
  try {
    const noteRef = doc(db, 'notes', noteId);
    await deleteDoc(noteRef);
    console.log('Note deleted from Firestore:', noteId);
  } catch (error) {
    console.error('Error deleting note from Firestore:', error);
    throw error;
  }
};

export const getNoteById = async (
  _userId: string,
  noteId: string
): Promise<FirebaseNote | null> => {
  if (!db) {
    console.warn('Firestore not initialized');
    return null;
  }
  
  try {
    const noteRef = doc(db, 'notes', noteId);
    const snap = await getDoc(noteRef);
    
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as FirebaseNote;
    }
    return null;
  } catch (error) {
    console.error('Error getting note from Firestore:', error);
    throw error;
  }
};

export const subscribeToNotes = (
  callback: (notes: FirebaseNote[]) => void,
  userId?: string | null
) => {
  if (!db) {
    console.warn('Firestore not initialized');
    callback([]);
    return () => {};
  }

  const notesRef = collection(db, 'notes');
  const q = userId
    ? query(notesRef, where('userId', '==', userId))
    : query(notesRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const notesArray: FirebaseNote[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
          updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
        } as FirebaseNote;
      });
      // Sort client-side to prevent requiring complex composite indexes
      notesArray.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(notesArray);
    },
    (error) => {
      console.error('Error subscribing to Firestore notes:', error);
      callback([]);
    }
  );
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

export const createTranscriptionSession = async (
  userId: string,
  subject: string
): Promise<string | null> => {
  if (!db) {
    console.warn('Firestore not initialized');
    return null;
  }
  
  try {
    const sessionsRef = collection(db, 'sessions');
    const docRef = await addDoc(sessionsRef, {
      userId,
      subject,
      startTime: Date.now(),
      status: 'active',
    });
    
    console.log('Transcription session created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

export const saveTranscriptionChunk = async (
  sessionId: string,
  chunk: Omit<TranscriptionChunk, 'id' | 'timestamp'>
): Promise<void> => {
  if (!db) return;
  
  try {
    const chunksRef = collection(db, 'sessions', sessionId, 'chunks');
    await addDoc(chunksRef, {
      ...chunk,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error saving chunk to Firestore:', error);
  }
};

export const updateSessionStatus = async (
  sessionId: string,
  status: TranscriptionSession['status']
): Promise<void> => {
  if (!db) return;
  
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    const updates: Record<string, unknown> = { status };
    
    if (status === 'completed') {
      updates.endTime = Date.now();
    }
    
    await updateDoc(sessionRef, updates);
  } catch (error) {
    console.error('Error updating session status:', error);
  }
};

export const subscribeToTranscription = (
  sessionId: string,
  callback: (chunks: TranscriptionChunk[]) => void
) => {
  if (!db) {
    callback([]);
    return () => {};
  }
  
  const chunksRef = collection(db, 'sessions', sessionId, 'chunks');
  const q = query(chunksRef, orderBy('timestamp', 'asc'));
  
  return onSnapshot(
    q,
    (snapshot) => {
      const chunks = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as TranscriptionChunk[];
      callback(chunks);
    },
    (error) => {
      console.error('Error subscribing to transcription in Firestore:', error);
      callback([]);
    }
  );
};

// ==================== STATISTICS ====================

export const getUserStats = async (_userId: string) => {
  if (!db) return null;
  
  try {
    const notesRef = collection(db, 'notes');
    const snapshot = await getDocs(notesRef);
    const notes = snapshot.docs.map((d) => d.data() as FirebaseNote);
    
    const stats = {
      totalNotes: notes.length,
      totalDuration: notes.reduce((sum, n) => sum + (n.duration || 0), 0),
      totalWords: notes.reduce((sum, n) => sum + (n.wordCount || 0), 0),
      subjects: {} as Record<string, { count: number; duration: number }>,
      dailyActivity: {} as Record<string, { count: number; duration: number }>,
    };
    
    notes.forEach((note) => {
      if (!stats.subjects[note.subject]) {
        stats.subjects[note.subject] = { count: 0, duration: 0 };
      }
      stats.subjects[note.subject].count++;
      stats.subjects[note.subject].duration += note.duration || 0;
      
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

export { app, db, auth };
export const database = db;
export default app;
