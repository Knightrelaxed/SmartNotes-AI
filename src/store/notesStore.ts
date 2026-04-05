import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Note, Subject, SearchResult } from '@/types';

interface NotesState {
  notes: Note[];
  subjects: Subject[];
  searchQuery: string;
  searchResults: SearchResult[];
  filterSubject: string | null;
  filterDateRange: { start: Date | null; end: Date | null };
  sortBy: 'latest' | 'oldest' | 'duration' | 'wordCount';
  
  // Actions
  setNotes: (notes: Note[]) => void;
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  getNoteById: (id: string) => Note | undefined;
  
  // Search & Filter
  setSearchQuery: (query: string) => void;
  setFilterSubject: (subject: string | null) => void;
  setFilterDateRange: (range: { start: Date | null; end: Date | null }) => void;
  setSortBy: (sort: NotesState['sortBy']) => void;
  performSearch: () => void;
  
  // Subjects
  addSubject: (subject: Omit<Subject, 'id' | 'noteCount'>) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  
  // Getters
  getFilteredNotes: () => Note[];
  getTotalWordCount: () => number;
  getTotalDuration: () => number;
}

const defaultSubjects: Subject[] = [
  { id: '1', name: 'Kalkulus', color: '#6C63FF', noteCount: 0 },
  { id: '2', name: 'Algoritma', color: '#FF6584', noteCount: 0 },
  { id: '3', name: 'Basis Data', color: '#4CAF50', noteCount: 0 },
  { id: '4', name: 'Pemrograman', color: '#FFC107', noteCount: 0 },
  { id: '5', name: 'Jaringan', color: '#9C27B0', noteCount: 0 },
];

// Sample notes for demo (Cleared for Production)
const sampleNotes: Note[] = [];

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: sampleNotes,
      subjects: defaultSubjects,
      searchQuery: '',
      searchResults: [],
      filterSubject: null,
      filterDateRange: { start: null, end: null },
      sortBy: 'latest',

      setNotes: (notes) => set({ notes }),

      addNote: (note) => {
          const id = Date.now().toString();
          const newNote: Note = {
            ...note,
            id,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          set((state) => ({ notes: [newNote, ...state.notes] }));
          return id;
        },

        updateNote: (id, updates) => {
          set((state) => ({
            notes: state.notes.map((note) =>
              note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note
            ),
          }));
        },

        deleteNote: (id) => {
          set((state) => ({
            notes: state.notes.filter((note) => note.id !== id),
          }));
        },

        getNoteById: (id) => {
          return get().notes.find((note) => note.id === id);
        },

        setSearchQuery: (query) => {
          set({ searchQuery: query });
          if (query.trim()) {
            get().performSearch();
          } else {
            set({ searchResults: [] });
          }
        },

        setFilterSubject: (subject) => set({ filterSubject: subject }),
        
        setFilterDateRange: (range) => set({ filterDateRange: range }),
        
        setSortBy: (sort) => set({ sortBy: sort }),

        performSearch: () => {
          const { notes, searchQuery } = get();
          if (!searchQuery.trim()) {
            set({ searchResults: [] });
            return;
          }

          const query = searchQuery.toLowerCase();
          const results: SearchResult[] = [];

          notes.forEach((note) => {
            const content = note.content.toLowerCase();
            const title = note.title.toLowerCase();
            
            if (content.includes(query) || title.includes(query)) {
              // Find excerpt around the match
              const matchIndex = content.indexOf(query);
              let startIndex = 0;
              let endIndex = 100;
              
              if (matchIndex !== -1) {
                startIndex = Math.max(0, matchIndex - 50);
                endIndex = Math.min(content.length, matchIndex + query.length + 100);
              } else {
                endIndex = Math.min(content.length, 100);
              }
              
              const excerpt = '...' + content.slice(startIndex, endIndex) + '...';
              
              results.push({
                noteId: note.id,
                noteTitle: note.title,
                subject: note.subject,
                createdAt: note.createdAt,
                excerpt,
                matchIndices: matchIndex !== -1 ? [matchIndex] : [],
              });
            }
          });

          set({ searchResults: results });
        },

        addSubject: (subject) => {
          const id = Date.now().toString();
          set((state) => ({
            subjects: [...state.subjects, { ...subject, id, noteCount: 0 }],
          }));
        },

        updateSubject: (id, updates) => {
          set((state) => ({
            subjects: state.subjects.map((s) =>
              s.id === id ? { ...s, ...updates } : s
            ),
          }));
        },

        deleteSubject: (id) => {
          set((state) => ({
            subjects: state.subjects.filter((s) => s.id !== id),
          }));
        },

        getFilteredNotes: () => {
          const { notes, filterSubject, filterDateRange, sortBy } = get();
          let filtered = [...notes];

          // Helper function to get timestamp from createdAt (handles Date, string, and number)
          const getTimestamp = (dateValue: Date | number | string): number => {
            if (typeof dateValue === 'number') {
              return dateValue;
            }
            if (typeof dateValue === 'string') {
              return new Date(dateValue).getTime();
            }
            if (dateValue instanceof Date) {
              return dateValue.getTime();
            }
            return new Date(dateValue as unknown as string).getTime();
          };

          // Helper function to convert value to Date for comparison
          const toDate = (dateValue: Date | number | string): Date => {
            if (typeof dateValue === 'number' || typeof dateValue === 'string') {
              return new Date(dateValue);
            }
            if (dateValue instanceof Date) {
              return dateValue;
            }
            return new Date(dateValue as unknown as string);
          };

          if (filterSubject) {
            filtered = filtered.filter((n) => n.subject === filterSubject);
          }

          if (filterDateRange.start || filterDateRange.end) {
            filtered = filtered.filter((n) => {
              const date = toDate(n.createdAt);
              if (filterDateRange.start && date < filterDateRange.start) return false;
              if (filterDateRange.end && date > filterDateRange.end) return false;
              return true;
            });
          }

          filtered.sort((a, b) => {
            const timestampA = getTimestamp(a.createdAt);
            const timestampB = getTimestamp(b.createdAt);
            
            switch (sortBy) {
              case 'latest':
                return timestampB - timestampA;
              case 'oldest':
                return timestampA - timestampB;
              case 'duration':
                return b.duration - a.duration;
              case 'wordCount':
                return b.wordCount - a.wordCount;
              default:
                return 0;
            }
          });

          return filtered;
        },

        getTotalWordCount: () => {
          return get().notes.reduce((sum, note) => sum + note.wordCount, 0);
        },

      getTotalDuration: () => {
        return get().notes.reduce((sum, note) => sum + note.duration, 0);
      },
    }),
    {
      name: 'smartnotes-storage',
      partialize: (state) => ({ subjects: state.subjects, notes: state.notes }),
    }
  )
);
