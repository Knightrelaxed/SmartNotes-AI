import { useState } from 'react';
import { Mic, Pause, Play, Square, Sparkles, Radio, Plus, Bookmark } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AudioVisualizer } from './AudioVisualizer';
import { formatDuration } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import type { RecordingState, Subject } from '@/types';

interface RecordControlsProps {
  state: RecordingState;
  duration: number;
  currentSubject: string;
  subjects: Subject[];
  onSelectSubject: (subject: string) => void;
  onAddSubject?: (name: string, color?: string) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onAddBookmark?: () => void;
  engine?: 'gemini-live' | 'web-speech';
  isLiveConnected?: boolean;
}

export function RecordControls({
  state,
  duration,
  currentSubject,
  subjects,
  onSelectSubject,
  onAddSubject,
  onStart,
  onPause,
  onResume,
  onStop,
  onAddBookmark,
  engine = 'gemini-live',
  isLiveConnected = false,
}: RecordControlsProps) {
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  const handleCreateSubject = () => {
    if (!newSubjectName.trim()) return;
    onAddSubject?.(newSubjectName.trim());
    setNewSubjectName('');
    setIsAddingSubject(false);
  };
  return (
    <div className="space-y-2.5 sm:space-y-3">
      {/* Status & Subject Header Card */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-900 dark:to-gray-800/80">
        <CardContent className="p-3 sm:py-3 sm:px-4 md:px-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 shrink-0 shadow-sm',
                  state === 'recording'
                    ? 'bg-red-500 animate-recording-pulse'
                    : state === 'paused'
                    ? 'bg-yellow-500'
                    : 'bg-[#6C63FF]'
                )}
              >
                {state === 'recording' ? (
                  <div className="w-3 h-3 bg-white rounded-xs" />
                ) : state === 'paused' ? (
                  <Pause className="w-4 h-4 text-white" />
                ) : (
                  <Mic className="w-4 h-4 text-white" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-tight">
                    {state === 'recording'
                      ? 'Sedang Merekam...'
                      : state === 'paused'
                      ? 'Dijeda'
                      : state === 'processing'
                      ? 'Memproses...'
                      : 'Siap Merekam'}
                  </h2>
                  {state === 'recording' && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {currentSubject ? `Mata Kuliah: ${currentSubject}` : 'Tanpa mata kuliah'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* STT Engine Badge */}
              {engine === 'gemini-live' ? (
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                    isLiveConnected
                      ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                      : state === 'recording'
                      ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                      : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                  )}
                  title={
                    isLiveConnected
                      ? 'Terhubung ke Gemini 3.5 Transcribe Live WebSocket'
                      : state === 'recording'
                      ? 'Menghubungkan ke Gemini Live...'
                      : 'Gemini 3.5 Transcribe Live Standby'
                  }
                >
                  <Sparkles className="w-3 h-3 text-[#6C63FF]" />
                  <span>Gemini 3.5 Live</span>
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      isLiveConnected
                        ? 'bg-emerald-500 animate-pulse'
                        : state === 'recording'
                        ? 'bg-amber-500 animate-ping'
                        : 'bg-gray-400'
                    )}
                  />
                </div>
              ) : (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                  title="Web Speech API bawaan browser"
                >
                  <Radio className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span>Web Speech API</span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <Select
                  value={currentSubject}
                  onValueChange={onSelectSubject}
                  disabled={state !== 'idle' || subjects.length === 0}
                >
                  <SelectTrigger className="h-8 text-xs w-[150px] sm:w-[170px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectValue placeholder={subjects.length === 0 ? "Belum ada mata kuliah" : "Pilih mata kuliah"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.length > 0 ? (
                      subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.name} className="text-xs">
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full inline-block shrink-0"
                              style={{ backgroundColor: subject.color }}
                            />
                            {subject.name}
                          </span>
                        </SelectItem>
                      ))
                    ) : null}
                  </SelectContent>
                </Select>

                {onAddSubject && state === 'idle' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingSubject(true)}
                    className="h-8 px-2.5 text-xs text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:text-[#6C63FF]"
                    title="Tambah Mata Kuliah Baru"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Mata Kuliah
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal Quick Add Mata Kuliah */}
      <Dialog open={isAddingSubject} onOpenChange={setIsAddingSubject}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Tambah Mata Kuliah Baru</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Nama Mata Kuliah
            </label>
            <Input
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="Contoh: Algoritma & Pemrograman"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSubject();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddingSubject(false)}>Batal</Button>
            <Button onClick={handleCreateSubject} className="bg-[#6C63FF] hover:bg-[#5b52e0] text-white">
              Simpan & Pilih
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Bar (Timer & Controls) */}
      <Card className="border-0 shadow-sm sticky bottom-20 md:bottom-6 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
        <CardContent className="p-2.5 sm:py-3 sm:px-4 md:px-5">
          <div className="flex items-center justify-between gap-3">
            {/* Visualizer / Subtle Audio State */}
            <div className="w-28 sm:w-44 flex items-center justify-start">
              {state === 'recording' ? (
                <AudioVisualizer />
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    state === 'idle' ? "bg-emerald-500/80" : "bg-amber-500"
                  )} />
                  <span className="hidden sm:inline font-medium">
                    {state === 'idle' ? 'Mikrofon Siap' : 'Dijeda'}
                  </span>
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="text-xl sm:text-2xl font-mono font-bold tracking-wider text-gray-900 dark:text-white">
              {formatDuration(duration)}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {state === 'idle' ? (
                <Button
                  onClick={onStart}
                  size="default"
                  className="h-9 sm:h-10 bg-gradient-to-r from-[#6C63FF] to-[#5548E8] hover:opacity-95 text-white px-5 sm:px-6 text-xs sm:text-sm font-semibold shadow-md shadow-[#6C63FF]/25 rounded-lg sm:rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Mic className="w-4 h-4 mr-2 animate-pulse" />
                  Mulai Merekam
                </Button>
              ) : state === 'recording' ? (
                <>
                  {onAddBookmark && (
                    <Button
                      onClick={onAddBookmark}
                      variant="outline"
                      size="sm"
                      className="h-9 border-amber-400 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 px-2.5 sm:px-3 text-xs flex items-center gap-1.5"
                      title="Tandai poin penting / ujian pada transkrip saat ini"
                    >
                      <Bookmark className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span className="hidden sm:inline font-medium">Penting</span>
                    </Button>
                  )}
                  <Button
                    onClick={onPause}
                    variant="outline"
                    size="sm"
                    className="h-9 border-yellow-500 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/20 px-3 text-xs font-medium"
                  >
                    <Pause className="w-4 h-4 mr-1.5" />
                    Jeda
                  </Button>
                  <Button
                    onClick={onStop}
                    size="sm"
                    className="h-9 bg-red-500 hover:bg-red-600 text-white px-3.5 text-xs font-semibold shadow-sm"
                  >
                    <Square className="w-4 h-4 mr-1.5 fill-white" />
                    Berhenti
                  </Button>
                </>
              ) : state === 'paused' ? (
                <>
                  <Button
                    onClick={onResume}
                    variant="outline"
                    size="sm"
                    className="h-9 border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/10 px-3 text-xs font-medium"
                  >
                    <Play className="w-4 h-4 mr-1.5" />
                    Lanjutkan
                  </Button>
                  <Button
                    onClick={onStop}
                    size="sm"
                    className="h-9 bg-red-500 hover:bg-red-600 text-white px-3.5 text-xs font-semibold shadow-sm"
                  >
                    <Square className="w-4 h-4 mr-1.5 fill-white" />
                    Berhenti
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
