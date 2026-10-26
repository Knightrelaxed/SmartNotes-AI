import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Type,
  FileDown,
  FileText,
  FileCode,
  Printer,
  ChevronDown,
  Sparkles,
  Layers,
  Edit2,
  Save,
  Check,
  Copy,
  Maximize2,
  Minimize2,
  Send,
  MessageSquare,
  Eraser,
  X,
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAI } from '@/hooks/useAI';
import { useNotesStore } from '@/store/notesStore';
import { useUIStore } from '@/store/uiStore';
import { formatDuration, formatDate } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import type { Note } from '@/types';

interface ViewNoteDialogProps {
  note: Note | null;
  open: boolean;
  onClose: () => void;
  defaultMode?: 'view' | 'edit';
  onSaveSummary?: (id: string, newSummary: string) => void;
}

export function ViewNoteDialog({
  note,
  open,
  onClose,
  defaultMode = 'view',
  onSaveSummary,
}: ViewNoteDialogProps) {
  const { askQuestion, processNote } = useAI();
  const { updateNote } = useNotesStore();
  const { addToast } = useUIStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollContainerRef.current) {
      const el = chatScrollContainerRef.current;
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [chatMessages, isChatLoading]);

  useEffect(() => {
    if (open) {
      setIsEditing(defaultMode === 'edit');
      if (defaultMode === 'edit') {
        setEditBuffer(note?.summary || '');
      }
    }
  }, [open, defaultMode, note]);

  const handleEditClick = () => {
    setIsEditing(true);
    setEditBuffer(note?.summary || '');
  };

  const handleSave = () => {
    if (note && onSaveSummary) onSaveSummary(note.id, editBuffer);
    setIsEditing(false);
  };

  const handleExportMarkdown = () => {
    if (!note) return;

    let plainSummary = '';
    if (note.summary) {
      const doc = new DOMParser().parseFromString(note.summary, 'text/html');
      plainSummary = doc.body.textContent || '';
    }

    const mdContent = `# ${note.title}

> **Mata Kuliah:** ${note.subject || 'Umum'}  
> **Tanggal:** ${formatDate(note.createdAt)}  
> **Durasi Rekaman:** ${formatDuration(note.duration)} | **Total Kata:** ${note.wordCount.toLocaleString()}  
> **Kata Kunci:** ${(note.keywords || []).map((k) => '`#' + k + '`').join(' ')}

---

## 📌 Ringkasan Perkuliahan (AI)
${plainSummary || '*(Belum ada ringkasan)*'}

---

## 📝 Transkrip Kuliah Lengkap
${note.content || '*(Transkrip kosong)*'}
`;

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', message: 'Catatan diekspor ke format Markdown (.md) untuk Notion/Obsidian' });
  };

  const handleExportText = () => {
    if (!note) return;

    let plainSummary = '';
    if (note.summary) {
      const doc = new DOMParser().parseFromString(note.summary, 'text/html');
      plainSummary = doc.body.textContent || '';
    }

    const txtContent = `=========================================
SMARTNOTES AI - EXPORT CATATAN
=========================================
Judul       : ${note.title}
Mata Kuliah : ${note.subject}
Tanggal     : ${formatDate(note.createdAt)}
Durasi      : ${formatDuration(note.duration)}
Kata        : ${note.wordCount}
Kata Kunci  : ${(note.keywords || []).map((k) => '#' + k).join(' ')}
-----------------------------------------
RINGKASAN AI:
${plainSummary || '(Tidak ada ringkasan)'}

-----------------------------------------
TRANSKRIPSI LENGKAP:
${note.content}
=========================================`;

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', message: 'Catatan diekspor ke format Teks (.txt)' });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = (text: string, type: 'summary' | 'transcript') => {
    if (!text) return;
    let textToCopy = text;
    if (type === 'summary') {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      textToCopy = doc.body.textContent || '';
    }
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        if (type === 'summary') {
          setCopiedSummary(true);
          setTimeout(() => setCopiedSummary(false), 2000);
        } else {
          setCopiedTranscript(true);
          setTimeout(() => setCopiedTranscript(false), 2000);
        }
      })
      .catch((err) => console.error('Failed to copy:', err));
  };

  const handleReprocessAI = async () => {
    if (!note || !note.content.trim()) return;
    setIsReprocessing(true);
    addToast({ type: 'info', message: 'Memproses ringkasan dan kata kunci AI...' });
    try {
      const res = await processNote(note.content, {
        generateSummary: true,
        extractKeywords: true,
        createOutline: true,
        generateFlashcards: false,
        language: 'id',
      });
      if (res && !res.error && res.summary) {
        const isGenericTitle = note.title.startsWith('Catatan -');
        const finalTitle = (isGenericTitle && res.title) ? res.title : note.title;
        updateNote(note.id, {
          title: finalTitle,
          summary: res.summary,
          keywords: res.keywords || [],
          outline: res.outline || [],
        });
        addToast({ type: 'success', message: 'Ringkasan AI berhasil diperbarui!' });
      } else {
        addToast({ type: 'error', message: res?.error || 'Gagal memproses AI.' });
      }
    } catch {
      addToast({ type: 'error', message: 'Gagal memproses ulang dengan AI.' });
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleAskAI = async (promptOverride?: string) => {
    const textToAsk = typeof promptOverride === 'string' ? promptOverride : chatInput;
    if (!textToAsk.trim() || !note) return;

    setChatMessages((prev) => [...prev, { role: 'user', text: textToAsk }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const context = `Mata Kuliah: ${note.subject}\nJudul: ${note.title}\nRingkasan: ${note.summary || ''}\nKonten: ${note.content}`;
      const response = await askQuestion(context, textToAsk);
      setChatMessages((prev) => [...prev, { role: 'ai', text: response }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: 'ai', text: 'Maaf, terjadi kesalahan saat menghubungi AI.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (!note) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) onClose();
        setIsEditing(false);
        setIsFullScreen(false);
        setIsEditorExpanded(false);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          'overflow-hidden flex flex-col transition-all duration-300',
          isFullScreen
            ? '!fixed !top-0 !left-0 !translate-x-0 !translate-y-0 !w-[100vw] !h-[100dvh] !max-w-none !max-h-none !rounded-none !border-0 p-6 md:p-8 !m-0 [&>button]:hidden'
            : 'max-w-3xl h-[90vh] max-h-[90vh]'
        )}
      >
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#6C63FF]/10 text-[#6C63FF]">
                {note.subject}
              </span>
              <span className="text-sm text-gray-500">
                {formatDate(note.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReprocessAI}
                disabled={isReprocessing}
                className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-[#6C63FF] rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
                title="Proses Ulang Ringkasan AI"
              >
                <Sparkles size={14} className={isReprocessing ? 'animate-spin text-[#6C63FF]' : 'text-[#6C63FF]'} />
                <span className="hidden sm:inline">{isReprocessing ? 'Memproses...' : 'Proses Ulang AI'}</span>
              </button>
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-[#6C63FF] rounded-lg transition-colors"
                title={isFullScreen ? 'Keluar Full Screen' : 'Full Screen'}
              >
                {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              {!isEditing && (
                <button
                  onClick={handleEditClick}
                  className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-[#6C63FF] rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                  title="Edit Ringkasan AI"
                >
                  <Edit2 size={16} /> <span className="hidden sm:inline">Edit Catatan</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-500 rounded-lg transition-colors md:hidden ml-1"
                title="Tutup"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <DialogTitle className="text-xl">{note.title}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="ringkasan" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start border-b border-gray-100 dark:border-gray-800 rounded-none bg-transparent h-12 p-0 mb-4 px-2 shrink-0">
            <TabsTrigger
              value="ringkasan"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#6C63FF] data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#6C63FF] h-12 px-6 bg-transparent font-medium"
            >
              Ringkasan AI
            </TabsTrigger>
            <TabsTrigger
              value="transkrip"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#6C63FF] data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#6C63FF] h-12 px-6 bg-transparent font-medium"
            >
              Transkrip Kuliah
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#6C63FF] data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#6C63FF] h-12 px-6 bg-transparent font-medium"
            >
              Tanya AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ringkasan" className="flex-1 flex flex-col min-h-0 m-0 data-[state=inactive]:hidden">
            <div className="flex-1 flex flex-col overflow-y-auto py-2 pr-3 space-y-6 scrollbar-thin">
              {!note.summary && !isEditing && (
                <div className="flex flex-col items-center justify-center py-12 text-center p-6 bg-gray-50/70 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <div className="w-12 h-12 rounded-2xl bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Ringkasan AI Belum Tersedia
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-5">
                    Catatan ini belum memiliki ringkasan dan kata kunci otomatis. Tekan tombol di bawah untuk memproses dengan AI.
                  </p>
                  <Button
                    onClick={handleReprocessAI}
                    disabled={isReprocessing}
                    className="bg-[#6C63FF] hover:bg-[#5b52e0] text-white shadow-md shadow-[#6C63FF]/20"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isReprocessing ? 'Sedang Memproses AI...' : 'Proses Ringkasan AI Sekarang'}
                  </Button>
                </div>
              )}

              {isEditing ? (
                <div
                  className={cn(
                    'animate-fade-in flex flex-col gap-3',
                    isEditorExpanded ? 'flex-1' : isFullScreen ? 'flex-1' : ''
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-[#6C63FF] flex items-center gap-2">
                      <Edit2 size={16} /> Edit Ringkasan AI
                    </h4>
                    {isEditorExpanded && (
                      <button
                        onClick={() => setIsEditorExpanded(false)}
                        className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-[#6C63FF] rounded-lg transition-colors"
                        title="Perkecil Editor"
                      >
                        <Minimize2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="bg-white text-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col transition-all duration-300">
                    <ReactQuill
                      theme="snow"
                      value={editBuffer}
                      onChange={setEditBuffer}
                      className={cn(
                        'bg-white text-gray-900 [&_.ql-editor]:text-gray-900 [&_.ql-toolbar]:bg-gray-50 [&_.ql-toolbar]:border-x-0 [&_.ql-toolbar]:border-t-0 [&_.ql-container]:border-x-0 [&_.ql-container]:border-b-0 flex-1 flex flex-col [&>.ql-container]:flex-1',
                        isFullScreen || isEditorExpanded
                          ? '[&>.ql-editor]:h-full min-h-[300px]'
                          : '[&>.ql-editor]:min-h-[220px]'
                      )}
                      modules={{
                        toolbar: [
                          [{ header: [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{ list: 'ordered' }, { list: 'bullet' }],
                          ['link', 'clean'],
                        ],
                      }}
                      placeholder="Ketik ringkasan akademis di sini..."
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    {!isEditorExpanded ? (
                      <button
                        onClick={() => setIsEditorExpanded(true)}
                        className="text-gray-500 hover:text-[#6C63FF] flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Maximize2 size={14} /> Zen Mode
                      </button>
                    ) : (
                      <div />
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setIsEditorExpanded(false);
                        }}
                        className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => {
                          handleSave();
                          setIsEditorExpanded(false);
                        }}
                        className="px-4 py-2 bg-[#6C63FF] text-white hover:bg-[#5548E8] rounded-lg text-sm font-bold shadow-md flex items-center gap-2 transition-colors"
                      >
                        <Save size={16} /> Simpan
                      </button>
                    </div>
                  </div>
                </div>
              ) : note.summary ? (
                <div className="p-5 rounded-2xl bg-[#6C63FF]/5 border border-[#6C63FF]/10 backdrop-blur-sm shadow-inner transition-all w-full relative group">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-[#6C63FF] flex items-center gap-2 text-lg">
                      <Sparkles className="w-5 h-5" />
                      Ringkasan AI
                    </h4>
                    <button
                      onClick={() => handleCopyText(note.summary || '', 'summary')}
                      className="p-1.5 md:p-2 text-gray-500 hover:text-[#6C63FF] hover:bg-[#6C63FF]/10 rounded-lg transition-colors flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      title="Salin Ringkasan"
                    >
                      {copiedSummary ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      {copiedSummary && (
                        <span className="text-xs text-green-500 font-medium hidden md:block">Tersalin</span>
                      )}
                    </button>
                  </div>
                  <div
                    className="text-gray-700 dark:text-gray-300 text-[15px] leading-relaxed whitespace-pre-wrap break-words max-h-64 overflow-y-auto pr-1 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-5 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_a]:text-[#6C63FF] [&_a]:underline [&_p]:mb-3 last:[&_p]:mb-0"
                    dangerouslySetInnerHTML={{ __html: note.summary }}
                  />
                </div>
              ) : null}

              {!(isEditing && isEditorExpanded) && note.keywords && note.keywords.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#6C63FF]" /> Kata Kunci
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {note.keywords.map((keyword, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-full bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:to-purple-900/40 border border-indigo-100 dark:border-indigo-800 text-sm text-[#5548E8] dark:text-indigo-300 font-medium"
                      >
                        #{keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </TabsContent>

          <TabsContent value="transkrip" className="flex-1 flex flex-col min-h-0 m-0 data-[state=inactive]:hidden">
            <div className="flex-1 flex flex-col overflow-y-auto py-2 pr-3 space-y-4 scrollbar-thin">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Type className="w-3.5 h-3.5 text-[#6C63FF]" /> {note.wordCount} kata
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#6C63FF]" /> {formatDuration(note.duration)}
                  </span>
                </div>
                <button
                  onClick={() => handleCopyText(note.content, 'transcript')}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-[#6C63FF]/10 hover:text-[#6C63FF] rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {copiedTranscript ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedTranscript ? 'Tersalin' : 'Salin Transkrip'}
                </button>
              </div>
              <div className="bg-gray-50/70 dark:bg-gray-800/40 p-5 rounded-2xl border border-gray-100 dark:border-gray-800/60 text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap select-text font-normal">
                {note.content || 'Transkripsi kosong.'}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 m-0 data-[state=inactive]:hidden px-2 pb-2">
            <div className="flex-1 flex flex-col min-h-0 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md rounded-3xl border border-white/50 dark:border-gray-800/50 shadow-inner overflow-hidden relative">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-400/10 blur-[80px] pointer-events-none" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/10 blur-[80px] pointer-events-none" />

              <div ref={chatScrollContainerRef} className="flex-1 overflow-y-auto px-5 pt-5 scrollbar-thin z-10 relative min-h-0">
                <div className="flex flex-col space-y-5 pb-4">
                  <AnimatePresence>
                    {chatMessages.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center justify-center text-center py-6 md:py-12 px-2 md:px-4"
                      >
                        <div className="relative mb-4 md:mb-6 group">
                          <div className="absolute inset-0 bg-[#6C63FF]/20 dark:bg-[#6C63FF]/10 rounded-full blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                          <motion.div
                            animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                            className="relative w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-indigo-50 to-white dark:from-gray-800 dark:to-gray-900 flex items-center justify-center shadow-xl shadow-indigo-500/10 border border-white/80 dark:border-gray-700 z-10"
                          >
                            <MessageSquare className="w-7 h-7 md:w-9 md:h-9 text-[#6C63FF]" strokeWidth={1.5} />
                          </motion.div>
                        </div>

                        <h4 className="text-[17px] md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 mb-1.5 md:mb-2 leading-tight">
                          Bagaimana AI bisa membantu?
                        </h4>
                        <p className="text-[12px] md:text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-5 md:mb-8 leading-relaxed px-4 md:px-0">
                          Tanyakan konsep yang sulit, minta soal latihan, atau ringkasan spesifik dari catatan <strong>{note.subject}</strong> ini.
                        </p>

                        <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 max-w-sm md:max-w-md">
                          {[
                            'Jelaskan poin utamanya',
                            'Buatkan 3 pertanyaan pilihan ganda',
                            'Apa kesimpulan dari catatan ini?',
                          ].map((prompt, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setChatInput(prompt);
                                setTimeout(() => handleAskAI(prompt), 50);
                              }}
                              className="px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[11px] md:text-[13px] text-gray-600 dark:text-gray-300 hover:border-[#6C63FF]/50 hover:bg-indigo-50/50 dark:hover:bg-[#6C63FF]/10 hover:text-[#6C63FF] transition-all shadow-sm hover:shadow active:scale-95 text-left"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence initial={false}>
                    {chatMessages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={cn('flex w-full', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                      >
                        <div
                          className={cn(
                            'max-w-[85%] rounded-3xl px-4 py-3 md:px-5 md:py-3.5 text-[13px] md:text-sm whitespace-pre-wrap leading-relaxed shadow-sm',
                            msg.role === 'user'
                              ? 'bg-gradient-to-br from-[#6C63FF] to-[#5548E8] text-white rounded-br-sm ml-auto'
                              : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/60 dark:border-gray-700/50 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                          )}
                        >
                          {msg.text}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {isChatLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="flex justify-start items-end"
                    >
                      <div className="relative overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-indigo-100/60 dark:border-indigo-800/40 rounded-full rounded-bl-sm px-4 py-2.5 shadow-sm flex items-center gap-2.5 max-w-fit">
                        <Sparkles className="w-3.5 h-3.5 text-[#6C63FF]" />
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Berpikir...</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="shrink-0 p-2 md:p-3 z-10 relative">
                <div className="flex items-center gap-2">
                  <AnimatePresence>
                    {chatMessages.length > 0 && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        type="button"
                        onClick={() => setChatMessages([])}
                        title="Hapus semua chat"
                        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-red-100/60 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20 text-red-400 hover:text-red-600 transition-all z-20"
                      >
                        <Eraser className="w-4 h-4" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                  <form onSubmit={(e) => { e.preventDefault(); handleAskAI(); }} className="flex-1 flex items-center relative group">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={isChatLoading}
                      placeholder="Tanya apapun tentang catatan ini..."
                      className="flex-1 pr-14 pl-5 h-12 md:h-14 rounded-full border border-white/60 dark:border-gray-700/50 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md focus-visible:ring-1 focus-visible:ring-[#6C63FF] shadow-sm text-[13px] md:text-sm placeholder:text-gray-400 relative z-10"
                    />
                    <Button
                      type="submit"
                      disabled={!chatInput.trim() || isChatLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 bg-gradient-to-br from-[#6C63FF] to-[#5548E8] shrink-0 p-0 z-20"
                    >
                      <Send className="w-4 h-4 text-white ml-0.5" />
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t border-gray-100 dark:border-gray-800 pt-3 md:pt-4 flex flex-row items-center justify-between gap-2 overflow-hidden shrink-0 pb-1">
          <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500 overflow-hidden whitespace-nowrap overflow-ellipsis mr-auto">
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
              {formatDuration(note.duration)}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <Type className="w-3.5 h-3.5 md:w-4 md:h-4" />
              {note.wordCount.toLocaleString()} kata
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onClose} className="hidden md:flex h-8 md:h-10 text-xs md:text-sm">
              Tutup
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="bg-gradient-to-r from-[#6C63FF] to-[#5548E8] hover:opacity-95 text-white h-8 md:h-10 text-xs md:text-sm px-3 md:px-4 flex items-center gap-1.5 shadow-sm">
                  <FileDown className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span>Ekspor Catatan</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={handleExportMarkdown} className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2 text-[#6C63FF]" />
                  <span>Markdown (.md) - Notion</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportText} className="cursor-pointer">
                  <FileCode className="w-4 h-4 mr-2 text-blue-500" />
                  <span>Plain Text (.txt)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrint} className="cursor-pointer">
                  <Printer className="w-4 h-4 mr-2 text-emerald-500" />
                  <span>Cetak / Simpan PDF</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
