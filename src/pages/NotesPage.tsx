import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderOpen, Trash2 } from 'lucide-react';
import { useNotesStore } from '@/store/notesStore';
import { useUIStore } from '@/store/uiStore';
import { useFirebase } from '@/hooks/useFirebase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { NoteCard } from '@/components/notes/NoteCard';
import { NoteFilterBar } from '@/components/notes/NoteFilterBar';
import { ViewNoteDialog } from '@/components/notes/ViewNoteDialog';
import type { Note } from '@/types';

export function NotesPage() {
  const {
    notes,
    subjects,
    updateNote,
    deleteNote,
    filterSubject,
    setFilterSubject,
    sortBy,
    setSortBy,
    getFilteredNotes,
  } = useNotesStore();

  const { addToast, setCurrentPage } = useUIStore();
  const { updateNoteInCloud, deleteNoteFromCloud, isConfigured: isFirebaseReady } = useFirebase();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewingNote, setViewNote] = useState<Note | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredNotes = getFilteredNotes().filter(
    (note) =>
      searchQuery === '' ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.summary && note.summary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSaveSummary = async (id: string, newSummary: string) => {
    updateNote(id, { summary: newSummary });
    if (isFirebaseReady) {
      try {
        await updateNoteInCloud(id, { summary: newSummary });
      } catch (err) {
        console.error('Failed to update summary in cloud:', err);
      }
    }
    addToast({ type: 'success', message: 'Ringkasan berhasil diperbarui' });

    if (viewingNote && viewingNote.id === id) {
      setViewNote({ ...viewingNote, summary: newSummary });
    }
  };

  const handleDelete = async (id: string) => {
    deleteNote(id);
    if (isFirebaseReady) {
      try {
        await deleteNoteFromCloud(id);
      } catch (err) {
        console.error('Failed to delete from cloud:', err);
      }
    }
    setDeleteConfirmId(null);
    addToast({ type: 'success', message: 'Catatan berhasil dihapus' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Catatan Saya</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {notes.length} catatan tersimpan
          </p>
        </div>
        <Button
          onClick={() => setCurrentPage('record')}
          className="bg-gradient-to-r from-[#6C63FF] to-[#5548E8] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Rekaman Baru
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <NoteFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        subjects={subjects}
        filterSubject={filterSubject}
        onSubjectChange={setFilterSubject}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Notes Grid */}
      {filteredNotes.length > 0 ? (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence>
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onView={(n) => {
                  setViewNote(n);
                  setDialogMode('view');
                }}
                onEdit={(n) => {
                  setViewNote(n);
                  setDialogMode('edit');
                }}
                onDelete={(id) => {
                  setDeleteConfirmId(id);
                }}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <FolderOpen className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Belum ada catatan
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
            {searchQuery
              ? 'Tidak ada catatan yang cocok dengan pencarian Anda'
              : 'Mulai rekam kuliah pertama Anda untuk melihat catatan di sini'}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => setCurrentPage('record')}
              className="bg-gradient-to-r from-[#6C63FF] to-[#5548E8] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Rekaman Baru
            </Button>
          )}
        </div>
      )}

      {/* Note View & Edit Modal */}
      <ViewNoteDialog
        note={viewingNote}
        open={!!viewingNote}
        onClose={() => setViewNote(null)}
        defaultMode={dialogMode}
        onSaveSummary={handleSaveSummary}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Catatan?</DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Catatan akan dihapus secara permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
