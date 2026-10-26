import { useState } from 'react';
import { BookOpen, Plus, Check, X, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsSection } from './SettingsSection';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Subject } from '@/types';

interface SubjectManagerProps {
  subjects: Subject[];
  onAddSubject: (name: string, color: string) => void;
  onUpdateSubject: (id: string, name: string, color: string) => void;
  onDeleteSubject: (id: string, name: string) => void;
}

const PRESET_COLORS = [
  '#6C63FF', '#FF6584', '#4CAF50', '#FFC107', '#9C27B0',
  '#00BCD4', '#FF5722', '#3F51B5', '#E91E63', '#009688'
];

export function SubjectManager({
  subjects,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
}: SubjectManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#6C63FF');

  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('#6C63FF');

  const handleCreate = () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed) return;
    onAddSubject(trimmed, newSubjectColor);
    setNewSubjectName('');
    setNewSubjectColor('#6C63FF');
    setShowAddModal(false);
  };

  const handleSaveEdit = (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    onUpdateSubject(id, trimmed, editingColor);
    setEditingSubjectId(null);
  };

  return (
    <>
      <SettingsSection
        title="Daftar Mata Kuliah"
        description="Kelola daftar mata kuliah yang bisa dipilih saat merekam"
        icon={BookOpen}
        delay={0.35}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {subjects.length} mata kuliah terdaftar
          </p>
          <Button
            onClick={() => {
              setNewSubjectName('');
              setNewSubjectColor('#6C63FF');
              setShowAddModal(true);
            }}
            className="bg-[#6C63FF] hover:bg-[#5548E8] text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" /> Tambah Mata Kuliah
          </Button>
        </div>

        <div className="space-y-2">
          {subjects.length === 0 && (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Belum ada mata kuliah.</p>
              <p className="text-xs text-gray-400">Klik tombol di atas untuk menambahkan.</p>
            </div>
          )}
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 group"
            >
              {editingSubjectId === subject.id ? (
                <>
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: editingColor }}
                  />
                  <div className="flex gap-1.5 items-center flex-wrap flex-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditingColor(c)}
                        className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                          editingColor === c
                            ? 'border-gray-700 dark:border-white scale-110'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(subject.id);
                        if (e.key === 'Escape') setEditingSubjectId(null);
                      }}
                      autoFocus
                      className="flex-1 min-w-[120px] px-2 py-1 rounded-lg border border-[#6C63FF] bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-[#6C63FF]/50"
                    />
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleSaveEdit(subject.id)}
                      className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 hover:bg-green-200 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingSubjectId(null)}
                      className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: subject.color }}
                  />
                  <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                    {subject.name}
                  </span>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingSubjectId(subject.id);
                        setEditingName(subject.name);
                        setEditingColor(subject.color);
                      }}
                      className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-[#6C63FF] hover:bg-[#6C63FF]/10 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteSubject(subject.id, subject.name)}
                      className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* Add Subject Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Mata Kuliah</DialogTitle>
            <DialogDescription>
              Tambahkan mata kuliah baru untuk mengelompokkan catatan rekaman Anda.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                Nama Mata Kuliah
              </label>
              <input
                type="text"
                placeholder="Contoh: Kecerdasan Buatan"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-[#6C63FF]/50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                Pilih Warna Label
              </label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewSubjectColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      newSubjectColor === c
                        ? 'border-gray-800 dark:border-white scale-110 shadow-sm'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Batal
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newSubjectName.trim()}
              className="bg-[#6C63FF] hover:bg-[#5548E8] text-white"
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
