import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Mic, 
  Languages, 
  Brain, 
  Palette, 
  Database,
  ChevronRight,
  RefreshCw,
  Keyboard,
  Moon,
  Sun,
  Monitor,
  BookOpen,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  FileText
} from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { useNotesStore } from '@/store/notesStore';
import { useUIStore } from '@/store/uiStore';
import { useTheme } from '@/hooks/useTheme';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { keyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

// Settings Section Component
function SettingsSection({ 
  title, 
  description, 
  icon: Icon, 
  children,
  delay = 0
}: { 
  title: string; 
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="border-0 shadow-md bg-white dark:bg-gray-900">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6C63FF]/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-[#6C63FF]" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Setting Item Component
function SettingItem({ 
  label, 
  description, 
  children,
  className
}: { 
  label: string; 
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      <div className="flex-shrink-0">
        {children}
      </div>
    </div>
  );
}

// Radio Option Component
function RadioOption({ 
  label, 
  description, 
  selected, 
  onClick 
}: { 
  label: string; 
  description?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left',
        selected 
          ? 'border-[#6C63FF] bg-[#6C63FF]/5' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
      )}
    >
      <div className={cn(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
        selected ? 'border-[#6C63FF]' : 'border-gray-300'
      )}>
        {selected && <div className="w-2.5 h-2.5 rounded-full bg-[#6C63FF]" />}
      </div>
      <div>
        <p className={cn('font-medium', selected ? 'text-[#6C63FF]' : 'text-gray-900 dark:text-white')}>
          {label}
        </p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
    </button>
  );
}

export function SettingsPage() {
  const { 
    audio, 
    transcription, 
    ai, 
    interface: interfaceSettings,
    updateAudio,
    updateTranscription,
    updateAI,
    updateInterface,
    resetSettings
  } = useSettingsStore();
  
  const { notes } = useNotesStore();
  const { addToast } = useUIStore();
  const { setTheme } = useTheme();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  
  // Subject management state
  const { subjects, addSubject, updateSubject, deleteSubject } = useNotesStore();
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#6C63FF');
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('#6C63FF');

  const PRESET_COLORS = [
    '#6C63FF', '#FF6584', '#4CAF50', '#FFC107', '#9C27B0',
    '#00BCD4', '#FF5722', '#3F51B5', '#E91E63', '#009688'
  ];

  const handleAddSubject = () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed) return;
    if (subjects.find(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
      addToast({ type: 'warning', message: 'Mata kuliah sudah ada!' });
      return;
    }
    addSubject({ name: trimmed, color: newSubjectColor });
    setNewSubjectName('');
    setNewSubjectColor('#6C63FF');
    setShowAddSubject(false);
    addToast({ type: 'success', message: `Mata kuliah "${trimmed}" ditambahkan!` });
  };

  const handleSaveEdit = (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    updateSubject(id, { name: trimmed, color: editingColor });
    setEditingSubjectId(null);
    addToast({ type: 'success', message: 'Mata kuliah diperbarui!' });
  };

  const handleDeleteSubject = (id: string, name: string) => {
    deleteSubject(id);
    addToast({ type: 'info', message: `Mata kuliah "${name}" dihapus` });
  };

  const handleExportData = () => {
    const data = {
      notes,
      settings: { audio, transcription, ai, interface: interfaceSettings },
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartnotes-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    addToast({ type: 'success', message: 'Data berhasil diekspor' });
  };

  const handleExportAllTxt = () => {
    if (notes.length === 0) {
      addToast({ type: 'warning', message: 'Tidak ada catatan untuk diekspor' });
      return;
    }

    const txtContents = notes.map(note => {
      let plainSummary = '';
      if (note.summary) {
        const doc = new DOMParser().parseFromString(note.summary, 'text/html');
        plainSummary = doc.body.textContent || '';
      }
      
      const dateStr = new Date(note.createdAt).toLocaleDateString('id-ID');
      const hrs = Math.floor(note.duration / 3600);
      const mins = Math.floor((note.duration % 3600) / 60);
      const durationStr = hrs > 0 ? `${hrs}j ${mins}m` : `${mins}m`;

      return `=========================================
Judul       : ${note.title}
Mata Kuliah : ${note.subject}
Tanggal     : ${dateStr}
Durasi      : ${durationStr}
Kata        : ${note.wordCount}
Kata Kunci  : ${(note.keywords || []).map(k => '#' + k).join(' ')}
-----------------------------------------
RINGKASAN AI:
${plainSummary || '(Tidak ada ringkasan)'}

TRANSKRIPSI LENGKAP:
${note.content}
=========================================
`;
    }).join('\n\n');

    const blob = new Blob([txtContents], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartnotes-all-notes-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    addToast({ type: 'success', message: 'Semua catatan diekspor ke TXT' });
  };

  const handleReset = () => {
    resetSettings();
    setShowResetConfirm(false);
    addToast({ type: 'success', message: 'Pengaturan direset ke default' });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pengaturan</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Sesuaikan aplikasi sesuai preferensi Anda
        </p>
      </div>

      {/* Audio Settings */}
      <SettingsSection 
        title="Pengaturan Audio" 
        description="Konfigurasi mikrofon dan kualitas audio"
        icon={Mic}
        delay={0}
      >
        <SettingItem 
          label="Peredam Kebisingan" 
          description="Kurangi noise latar belakang saat merekam"
        >
          <Switch 
            checked={audio.noiseReduction} 
            onCheckedChange={(v) => updateAudio({ noiseReduction: v })}
          />
        </SettingItem>
        
        <SettingItem 
          label="Auto Gain Control" 
          description="Atur volume secara otomatis"
        >
          <Switch 
            checked={audio.autoGainControl} 
            onCheckedChange={(v) => updateAudio({ autoGainControl: v })}
          />
        </SettingItem>
        
        <SettingItem label="Kualitas Audio">
          <Select 
            value={audio.quality} 
            onValueChange={(v: string) => updateAudio({ quality: v as typeof audio.quality })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Rendah ( hemat )</SelectItem>
              <SelectItem value="medium">Sedang</SelectItem>
              <SelectItem value="high">Tinggi ( terbaik )</SelectItem>
            </SelectContent>
          </Select>
        </SettingItem>
      </SettingsSection>

      {/* Transcription Settings */}
      <SettingsSection 
        title="Pengaturan Transkripsi" 
        description="Bahasa dan auto-save rekaman"
        icon={Languages}
        delay={0.1}
      >
        <SettingItem 
          label="Bahasa Transkripsi"
          description="Bahasa yang digunakan saat merekam suara"
        >
          <Select 
            value={transcription.language} 
            onValueChange={(v: string) => updateTranscription({ language: v })}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id">🇮🇩 Indonesia</SelectItem>
              <SelectItem value="en">🇺🇸 English (US)</SelectItem>
            </SelectContent>
          </Select>
        </SettingItem>

        <SettingItem 
          label="Auto-save Interval" 
          description="Simpan draft catatan otomatis saat sedang merekam"
        >
          <Select 
            value={interfaceSettings.autoSaveInterval.toString()} 
            onValueChange={(v: string) => updateInterface({ autoSaveInterval: parseInt(v) })}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 menit</SelectItem>
              <SelectItem value="10">10 menit</SelectItem>
              <SelectItem value="30">30 menit</SelectItem>
              <SelectItem value="60">60 menit</SelectItem>
              <SelectItem value="120">120 menit</SelectItem>
            </SelectContent>
          </Select>
        </SettingItem>
      </SettingsSection>

      {/* AI Settings */}
      <SettingsSection 
        title="Pengaturan AI" 
        description="Pilih engine AI dan fitur post-processing"
        icon={Brain}
        delay={0.2}
      >
        <div className="space-y-3">
          <p className="font-medium text-gray-900 dark:text-white">Engine AI</p>
          <RadioOption
            label="Auto (Gemini + Fallback OpenRouter)"
            description="Smart routing dengan 3 lapisan proteksi kuota (Rekomendasi)"
            selected={ai.engine === 'auto'}
            onClick={() => updateAI({ engine: 'auto' })}
          />
          <RadioOption
            label="Gemini Only"
            description="Menggunakan 2 API key Google Gemini. Cepat dan presisi."
            selected={ai.engine === 'gemini'}
            onClick={() => updateAI({ engine: 'gemini' })}
          />
          <RadioOption
            label="OpenRouter Only"
            description="Hanya menggunakan model gratis Llama/Qwen via OpenRouter"
            selected={ai.engine === 'openrouter'}
            onClick={() => updateAI({ engine: 'openrouter' })}
          />
        </div>
        
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="font-medium text-gray-900 dark:text-white mb-4">Auto-process setelah rekaman</p>
          
          <div className="space-y-4">
            <SettingItem label="Generate ringkasan">
              <Switch 
                checked={ai.autoSummarize} 
                onCheckedChange={(v) => updateAI({ autoSummarize: v })}
              />
            </SettingItem>
            <SettingItem label="Extract kata kunci">
              <Switch 
                checked={ai.autoExtractKeywords} 
                onCheckedChange={(v) => updateAI({ autoExtractKeywords: v })}
              />
            </SettingItem>
            <SettingItem label="Buat outline">
              <Switch 
                checked={ai.autoCreateOutline} 
                onCheckedChange={(v) => updateAI({ autoCreateOutline: v })}
              />
            </SettingItem>
            <SettingItem label="Generate flashcards">
              <Switch 
                checked={ai.generateFlashcards} 
                onCheckedChange={(v) => updateAI({ generateFlashcards: v })}
              />
            </SettingItem>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
          <p className="font-medium text-gray-900 dark:text-white">API Keys Kustom</p>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Google Gemini API Key
                </label>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs text-[#6C63FF] hover:underline"
                >
                  Dapatkan Key Google AI ↗
                </a>
              </div>
              <Input
                type="password"
                placeholder="AIzaSy... (Opsional jika sudah ada default)"
                value={ai.geminiApiKey || ''}
                onChange={(e) => updateAI({ geminiApiKey: e.target.value })}
                className="bg-white dark:bg-gray-800"
              />
              <p className="text-xs text-gray-400 mt-1">
                Disimpan aman di localStorage browser Anda.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  OpenRouter API Key (Fallback / Alternatif)
                </label>
                <a 
                  href="https://openrouter.ai/keys" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs text-[#6C63FF] hover:underline"
                >
                  Dapatkan Key OpenRouter ↗
                </a>
              </div>
              <Input
                type="password"
                placeholder="sk-or-v1-... (Opsional)"
                value={ai.openrouterApiKey || ''}
                onChange={(e) => updateAI({ openrouterApiKey: e.target.value })}
                className="bg-white dark:bg-gray-800"
              />
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Interface Settings */}
      <SettingsSection 
        title="Tampilan" 
        description="Tema dan preferensi tampilan"
        icon={Palette}
        delay={0.3}
      >
        <div className="space-y-3">
          <p className="font-medium text-gray-900 dark:text-white">Tema</p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setTheme('auto')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                interfaceSettings.theme === 'auto'
                  ? 'border-[#6C63FF] bg-[#6C63FF]/5'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              )}
            >
              <Monitor className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Otomatis</span>
            </button>
            <button
              onClick={() => setTheme('light')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                interfaceSettings.theme === 'light'
                  ? 'border-[#6C63FF] bg-[#6C63FF]/5'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              )}
            >
              <Sun className="w-6 h-6 text-amber-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Terang</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                interfaceSettings.theme === 'dark'
                  ? 'border-[#6C63FF] bg-[#6C63FF]/5'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              )}
            >
              <Moon className="w-6 h-6 text-indigo-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Gelap</span>
            </button>
          </div>
        </div>
        
      </SettingsSection>

      {/* Subject Management */}
      <SettingsSection
        title="Mata Kuliah"
        description="Kelola daftar mata kuliah yang bisa dipilih saat merekam"
        icon={BookOpen}
        delay={0.35}
      >
        {/* Header row: count + add button */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">{subjects.length} mata kuliah terdaftar</p>
          <Button
            onClick={() => { setNewSubjectName(''); setNewSubjectColor('#6C63FF'); setShowAddSubject(true); }}
            className="bg-[#6C63FF] hover:bg-[#5548E8] text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" /> Tambah Mata Kuliah
          </Button>
        </div>

        {/* Subject list */}
        <div className="space-y-2">
          {subjects.length === 0 && (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Belum ada mata kuliah.</p>
              <p className="text-xs text-gray-400">Klik tombol di atas untuk menambahkan.</p>
            </div>
          )}
          {subjects.map((subject) => (
            <div key={subject.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 group">
              {editingSubjectId === subject.id ? (
                <>
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: editingColor }} />
                  <div className="flex gap-1.5 items-center flex-wrap flex-1">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditingColor(c)}
                        className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${editingColor === c ? 'border-gray-700 dark:border-white scale-110' : 'border-transparent'}`}
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
                    <button onClick={() => handleSaveEdit(subject.id)} className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 hover:bg-green-200 transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditingSubjectId(null)} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                  <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{subject.name}</span>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingSubjectId(subject.id); setEditingName(subject.name); setEditingColor(subject.color); }}
                      className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-[#6C63FF] hover:bg-[#6C63FF]/10 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSubject(subject.id, subject.name)}
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

      {/* Data & About */}
      <SettingsSection 
        title="Data & Tentang" 
        description="Kelola data dan informasi aplikasi"
        icon={Database}
        delay={0.4}
      >
        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-between"
            onClick={() => setShowShortcuts(true)}
          >
            <span className="flex items-center gap-2">
              <Keyboard className="w-4 h-4" />
              Lihat Shortcut Keyboard
            </span>
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-between"
            onClick={handleExportData}
          >
            <span className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" />
              Backup Database (.json)
            </span>
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-between"
            onClick={handleExportAllTxt}
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-500" />
              Export Semua Catatan (.txt)
            </span>
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-between text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={() => setShowResetConfirm(true)}
          >
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Reset Pengaturan
            </span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#FF6584] flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">SmartNotes AI</p>
              <p className="text-sm text-gray-500">Versi 2.0.0</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Aplikasi transkripsi kuliah real-time dengan AI post-processing. 
            100% gratis dan offline-capable.
          </p>
        </div>
      </SettingsSection>

      {/* Add Subject Dialog */}
      <Dialog open={showAddSubject} onOpenChange={(v) => { setShowAddSubject(v); if (!v) { setNewSubjectName(''); setNewSubjectColor('#6C63FF'); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#6C63FF]" />
              Tambah Mata Kuliah
            </DialogTitle>
            <DialogDescription>
              Beri nama dan pilih warna untuk mata kuliah baru.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Name input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nama Mata Kuliah
              </label>
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                placeholder="Contoh: Kalkulus, Algoritma..."
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#6C63FF]/50 focus:border-[#6C63FF] outline-none transition"
              />
            </div>

            {/* Color picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Warna Label
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewSubjectColor(c)}
                    className={`w-8 h-8 rounded-full transition-all hover:scale-110 ${newSubjectColor === c ? 'ring-2 ring-offset-2 ring-gray-600 dark:ring-white scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              {/* Preview */}
              <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: newSubjectColor }} />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {newSubjectName || 'Preview nama mata kuliah...'}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddSubject(false)}>Batal</Button>
            <Button
              onClick={handleAddSubject}
              disabled={!newSubjectName.trim()}
              className="bg-[#6C63FF] hover:bg-[#5548E8] text-white"
            >
              <Plus className="w-4 h-4 mr-1" /> Tambahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shortcuts Dialog */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-[#6C63FF]" />
              Shortcut Keyboard
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {keyboardShortcuts.map((section) => (
              <div key={section.category}>
                <p className="text-sm font-medium text-gray-500 mb-2">{section.category}</p>
                <div className="space-y-2">
                  {section.shortcuts.map((shortcut) => (
                    <div 
                      key={shortcut.key}
                      className="flex items-center justify-between py-2"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {shortcut.description}
                      </span>
                      <kbd className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Pengaturan?</DialogTitle>
            <DialogDescription>
              Semua pengaturan akan dikembalikan ke nilai default. Data catatan tidak akan terhapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
