import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Clock,
  ArrowRight,
  X,
  History,
  Sparkles,
  Filter,
} from 'lucide-react';
import { useNotesStore } from '@/store/notesStore';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { HighlightedText } from '@/utils/highlight';
import { formatDate } from '@/utils/formatters';
import { ViewNoteDialog } from '@/components/notes/ViewNoteDialog';
import type { Note, SearchResult } from '@/types';

const RECENT_SEARCHES_KEY = 'smartnotes-recent-searches';

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
  } catch {
    return [];
  }
}

function addRecentSearch(query: string) {
  const searches = getRecentSearches();
  const updated = [query, ...searches.filter((s) => s !== query)].slice(0, 10);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

export function SearchPage() {
  const { notes } = useNotesStore();

  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [viewingNote, setViewNote] = useState<Note | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    setRecentSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      const searchResults: SearchResult[] = [];
      const lowerQuery = query.toLowerCase();

      notes.forEach((note) => {
        const titleMatches = note.title.toLowerCase().includes(lowerQuery);
        const contentMatches = note.content.toLowerCase().includes(lowerQuery);
        const summaryMatches = note.summary?.toLowerCase().includes(lowerQuery);

        if (titleMatches || contentMatches || summaryMatches) {
          let excerpt = '';
          const content = note.content.toLowerCase();
          const matchIndex = content.indexOf(lowerQuery);

          if (matchIndex !== -1) {
            const start = Math.max(0, matchIndex - 60);
            const end = Math.min(note.content.length, matchIndex + lowerQuery.length + 100);
            excerpt =
              (start > 0 ? '...' : '') +
              note.content.slice(start, end) +
              (end < note.content.length ? '...' : '');
          } else {
            excerpt = note.content.slice(0, 160) + '...';
          }

          searchResults.push({
            noteId: note.id,
            noteTitle: note.title,
            subject: note.subject,
            createdAt: note.createdAt,
            excerpt,
            matchIndices: matchIndex !== -1 ? [matchIndex] : [],
          });
        }
      });

      setResults(searchResults);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, notes]);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.trim()) {
      addRecentSearch(searchQuery);
      setRecentSearches(getRecentSearches());
    }
  };

  const handleRecentSearchClick = (search: string) => {
    handleSearch(search);
  };

  const clearRecentSearches = () => {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    setRecentSearches([]);
  };

  const openNote = (result: SearchResult) => {
    const note = notes.find((n) => n.id === result.noteId);
    if (note) {
      setViewNote(note);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Cari Catatan
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Temukan kata kunci dalam semua catatan kuliah Anda secara instan
        </p>
      </div>

      {/* Search Input Card */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              ref={inputRef}
              placeholder="Masukkan kata kunci atau materi kuliah..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-12 pr-12 py-6 text-lg rounded-xl border-2 border-transparent focus:border-[#6C63FF] focus:ring-0"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>

          {/* Recent Searches Chips */}
          {!query && recentSearches.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <History className="w-4 h-4" />
                  <span>Pencarian Terakhir</span>
                </div>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-red-500 hover:underline"
                >
                  Hapus Semua
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, i) => (
                  <button
                    key={i}
                    onClick={() => handleRecentSearchClick(search)}
                    className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#6C63FF]/10 hover:text-[#6C63FF] transition-colors"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      <AnimatePresence mode="wait">
        {query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isSearching ? 'Mencari...' : `${results.length} hasil ditemukan`}
              </h2>
              {results.length > 0 && (
                <span className="text-sm text-gray-500">
                  untuk "{query}"
                </span>
              )}
            </div>

            {results.length > 0 ? (
              <div className="space-y-3">
                {results.map((result, index) => (
                  <motion.div
                    key={result.noteId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => openNote(result)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#6C63FF]/10 text-[#6C63FF]">
                                {result.subject}
                              </span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(result.createdAt, 'd MMM yyyy')}
                              </span>
                            </div>

                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-[#6C63FF] transition-colors">
                              <HighlightedText text={result.noteTitle} query={query} />
                            </h3>

                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              <HighlightedText text={result.excerpt} query={query} />
                            </p>
                          </div>

                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#6C63FF] group-hover:translate-x-1 transition-all flex-shrink-0 ml-4" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              !isSearching && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Tidak ada hasil
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Coba kata kunci lain atau periksa ejaan Anda
                  </p>
                </div>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Search Features Preview */}
      {!query && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Card className="border-0 shadow-md bg-gradient-to-br from-[#6C63FF]/5 to-[#6C63FF]/10">
            <CardContent className="p-4">
              <Sparkles className="w-8 h-8 text-[#6C63FF] mb-3" />
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                Pencarian Cerdas
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cari dalam judul dan konten semua catatan Anda secara instan
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-[#FF6584]/5 to-[#FF6584]/10">
            <CardContent className="p-4">
              <Filter className="w-8 h-8 text-[#FF6584] mb-3" />
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                Filter Otomatis
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Pencocokan langsung pada mata kuliah dan transkripsi suara
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-[#4CAF50]/5 to-[#4CAF50]/10">
            <CardContent className="p-4">
              <History className="w-8 h-8 text-[#4CAF50] mb-3" />
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                Riwayat Pencarian
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Akses cepat pencarian sebelumnya dengan satu klik
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Shared View Note Dialog */}
      <ViewNoteDialog
        note={viewingNote}
        open={!!viewingNote}
        onClose={() => setViewNote(null)}
      />
    </div>
  );
}
