import { useState } from 'react';
import {
  Mic,
  Languages,
  Brain,
  Palette,
  Database,
  RefreshCw,
  Keyboard,
  Moon,
  Sun,
  Monitor,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { useNotesStore } from '@/store/notesStore';
import { useUIStore } from '@/store/uiStore';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { SettingsSection, SettingItem, RadioOption } from '@/components/settings/SettingsSection';
import { SubjectManager } from '@/components/settings/SubjectManager';
import { ShortcutsDialog } from '@/components/settings/ShortcutsDialog';
import { cn } from '@/lib/utils';
import { formatDate, formatDurationHuman } from '@/utils/formatters';

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
    resetSettings,
  } = useSettingsStore();

  const { notes, subjects, addSubject, updateSubject, deleteSubject } = useNotesStore();
  const { addToast } = useUIStore();
  const { setTheme } = useTheme();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const handleAddSubject = (name: string, color: string) => {
    if (subjects.find((s) => s.name.toLowerCase() === name.toLowerCase())) {
      addToast({ type: 'warning', message: 'Mata kuliah sudah ada!' });
      return;
    }
    addSubject({ name, color });
    addToast({ type: 'success', message: `Mata kuliah "${name}" ditambahkan!` });
  };

  const handleUpdateSubject = (id: string, name: string, color: string) => {
    updateSubject(id, { name, color });
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

    addToast({ type: 'success', message: 'Data cadangan berhasil diekspor' });
  };

  const handleExportAllTxt = () => {
    if (notes.length === 0) {
      addToast({ type: 'warning', message: 'Tidak ada catatan untuk diekspor' });
      return;
    }

    const txtContents = notes.map((note) => {
      let plainSummary = '';
      if (note.summary) {
        const doc = new DOMParser().parseFromString(note.summary, 'text/html');
        plainSummary = doc.body.textContent || '';
      }

      return `=========================================
Judul       : ${note.title}
Mata Kuliah : ${note.subject}
Tanggal     : ${formatDate(note.createdAt)}
Durasi      : ${formatDurationHuman(note.duration)}
Kata        : ${note.wordCount}
-----------------------------------------
RINGKASAN AI:
${plainSummary || '(Tidak ada ringkasan)'}

-----------------------------------------
TRANSKRIPSI:
${note.content}
=========================================`;
    }).join('\n\n\n');

    const blob = new Blob([txtContents], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartnotes-all-notes-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    addToast({ type: 'success', message: 'Semua catatan berhasil diekspor ke format TXT' });
  };

  const handleReset = () => {
    resetSettings();
    setShowResetConfirm(false);
    addToast({ type: 'success', message: 'Pengaturan berhasil dikembalikan ke default' });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pengaturan</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Sesuaikan konfigurasi audio, model kecerdasan buatan, dan preferensi antarmuka
        </p>
      </div>

      {/* Audio Settings */}
      <SettingsSection
        title="Pengaturan Audio"
        description="Konfigurasi mikrofon dan kualitas sinyal audio"
        icon={Mic}
        delay={0}
      >
        <SettingItem
          label="Peredam Kebisingan"
          description="Kurangi noise latar belakang saat merekam kuliah"
        >
          <Switch
            checked={audio.noiseReduction}
            onCheckedChange={(v) => updateAudio({ noiseReduction: v })}
          />
        </SettingItem>

        <SettingItem
          label="Auto Gain Control"
          description="Menstabilkan volume mikrofon secara otomatis"
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
              <SelectItem value="low">Rendah (Hemat kuota)</SelectItem>
              <SelectItem value="medium">Sedang (Standar)</SelectItem>
              <SelectItem value="high">Tinggi (Terbaik)</SelectItem>
            </SelectContent>
          </Select>
        </SettingItem>
      </SettingsSection>

      {/* Transcription Settings */}
      <SettingsSection
        title="Pengaturan Transkripsi"
        description="Pilihan bahasa dan penyimpanan draf otomatis"
        icon={Languages}
        delay={0.1}
      >
        <SettingItem
          label="Bahasa Transkripsi"
          description="Bahasa utama yang dideteksi oleh Speech Recognition"
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
          description="Simpan draf transkripsi otomatis saat sedang merekam"
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
            </SelectContent>
          </Select>
        </SettingItem>
      </SettingsSection>

      {/* AI Settings */}
      <SettingsSection
        title="Pengaturan AI"
        description="Pilih engine kecerdasan buatan dan fitur pemrosesan pasca rekaman"
        icon={Brain}
        delay={0.2}
      >
        <div className="space-y-3">
          <p className="font-medium text-gray-900 dark:text-white">Engine AI</p>
          <RadioOption
            label="Auto (Gemini + Fallback OpenRouter)"
            description="Smart routing dengan failover otomatis ke model cadangan (Direkomendasikan)"
            selected={ai.engine === 'auto'}
            onClick={() => updateAI({ engine: 'auto' })}
          />
          <RadioOption
            label="Google Gemini"
            description="Model Gemini 2.0 Flash langsung dari Google AI Studio. Cepat dan akurat."
            selected={ai.engine === 'gemini'}
            onClick={() => updateAI({ engine: 'gemini' })}
          />
          <RadioOption
            label="OpenRouter"
            description="Gunakan model open-source (Llama 3.3, Qwen) via OpenRouter"
            selected={ai.engine === 'openrouter'}
            onClick={() => updateAI({ engine: 'openrouter' })}
          />
        </div>

        {/* Feature toggles */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="font-medium text-gray-900 dark:text-white mb-4">Fitur Pemrosesan Otomatis</p>
          <div className="space-y-4">
            <SettingItem label="Buat ringkasan otomatis">
              <Switch
                checked={ai.autoSummarize}
                onCheckedChange={(v) => updateAI({ autoSummarize: v })}
              />
            </SettingItem>
            <SettingItem label="Ekstrak kata kunci penting">
              <Switch
                checked={ai.autoExtractKeywords}
                onCheckedChange={(v) => updateAI({ autoExtractKeywords: v })}
              />
            </SettingItem>
            <SettingItem label="Susun outline materi">
              <Switch
                checked={ai.autoCreateOutline}
                onCheckedChange={(v) => updateAI({ autoCreateOutline: v })}
              />
            </SettingItem>
            <SettingItem label="Hasilkan kartu belajar (flashcards)">
              <Switch
                checked={ai.generateFlashcards}
                onCheckedChange={(v) => updateAI({ generateFlashcards: v })}
              />
            </SettingItem>
          </div>
        </div>

        {/* Custom API Keys */}
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
                Kunci Anda disimpan aman secara lokal di browser.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  OpenRouter API Key (Cadangan)
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
        description="Tema dan preferensi antarmuka pengguna"
        icon={Palette}
        delay={0.3}
      >
        <div className="space-y-3">
          <p className="font-medium text-gray-900 dark:text-white">Pilihan Tema</p>
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
              <Moon className="w-6 h-6 text-[#6C63FF]" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Gelap</span>
            </button>
          </div>
        </div>
      </SettingsSection>

      {/* Subject Management */}
      <SubjectManager
        subjects={subjects}
        onAddSubject={handleAddSubject}
        onUpdateSubject={handleUpdateSubject}
        onDeleteSubject={handleDeleteSubject}
      />

      {/* Data Management & About */}
      <SettingsSection
        title="Data & Cadangan"
        description="Cadangkan catatan atau atur ulang aplikasi"
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
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Button>

          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={handleExportData}
          >
            <span className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Ekspor Cadangan Lengkap (JSON)
            </span>
            <span className="text-xs text-gray-400">Termasuk semua catatan & pengaturan</span>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={handleExportAllTxt}
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Ekspor Semua Catatan (TXT)
            </span>
            <span className="text-xs text-gray-400">{notes.length} catatan</span>
          </Button>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button
              variant="outline"
              className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/50"
              onClick={() => setShowResetConfirm(true)}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Kembalikan ke Pengaturan Awal
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Semua Pengaturan?</DialogTitle>
            <DialogDescription>
              Tindakan ini akan mengembalikan semua pengaturan audio, AI, dan antarmuka ke nilai bawaan. Catatan yang sudah tersimpan tidak akan terhapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              Reset Pengaturan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shortcuts Modal */}
      <ShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
    </div>
  );
}
