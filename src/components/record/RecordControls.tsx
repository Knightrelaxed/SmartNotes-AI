import { Mic, Pause, Play, Square, Sparkles, Radio } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  engine?: 'gemini-live' | 'web-speech';
  isLiveConnected?: boolean;
}

export function RecordControls({
  state,
  duration,
  currentSubject,
  subjects,
  onSelectSubject,
  onStart,
  onPause,
  onResume,
  onStop,
  engine = 'gemini-live',
  isLiveConnected = false,
}: RecordControlsProps) {
  return (
    <>
      {/* Status & Subject Header Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300',
                  state === 'recording'
                    ? 'bg-red-500 animate-recording-pulse'
                    : state === 'paused'
                    ? 'bg-yellow-500'
                    : 'bg-[#6C63FF]'
                )}
              >
                {state === 'recording' ? (
                  <div className="w-4 h-4 bg-white rounded-sm" />
                ) : state === 'paused' ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Mic className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {state === 'recording'
                    ? 'Sedang Merekam...'
                    : state === 'paused'
                    ? 'Dijeda'
                    : state === 'processing'
                    ? 'Memproses...'
                    : 'Siap Merekam'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {currentSubject ? `Mata Kuliah: ${currentSubject}` : 'Tanpa mata kuliah'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* STT Engine Badge */}
              {engine === 'gemini-live' ? (
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
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
                  <Sparkles className="w-3.5 h-3.5 text-[#6C63FF]" />
                  <span>Gemini 3.5 Live</span>
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                  title="Web Speech API bawaan browser"
                >
                  <Radio className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Web Speech API</span>
                </div>
              )}

              <Select
                value={currentSubject}
                onValueChange={onSelectSubject}
                disabled={state !== 'idle' || subjects.length === 0}
              >
                <SelectTrigger className="w-[200px] bg-white dark:bg-gray-800">
                  <SelectValue placeholder={subjects.length === 0 ? "Belum ada mata kuliah" : "Pilih mata kuliah"} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.length > 0 ? (
                    subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.name}>
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: subject.color }}
                          />
                          {subject.name}
                        </span>
                      </SelectItem>
                    ))
                  ) : null}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sticky Bottom Control Panel */}
      <Card className="border-0 shadow-lg sticky bottom-4 md:bottom-6 z-10">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Visualizer */}
            <div className="hidden md:block w-48">
              {state === 'recording' ? (
                <AudioVisualizer />
              ) : (
                <div className="h-12 flex items-center justify-center text-gray-400 text-sm">
                  {state === 'idle' ? 'Siap merekam' : 'Audio dijeda'}
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="text-2xl font-mono font-semibold text-gray-900 dark:text-white">
              {formatDuration(duration)}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {state === 'idle' ? (
                <Button
                  onClick={onStart}
                  size="lg"
                  className="bg-gradient-to-r from-[#6C63FF] to-[#5548E8] hover:opacity-90 text-white px-8"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Mulai Rekam
                </Button>
              ) : state === 'recording' ? (
                <>
                  <Button
                    onClick={onPause}
                    variant="outline"
                    size="lg"
                    className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                  >
                    <Pause className="w-5 h-5 mr-2" />
                    Jeda
                  </Button>
                  <Button
                    onClick={onStop}
                    size="lg"
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Square className="w-5 h-5 mr-2" />
                    Berhenti
                  </Button>
                </>
              ) : state === 'paused' ? (
                <>
                  <Button
                    onClick={onResume}
                    variant="outline"
                    size="lg"
                    className="border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/10"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Lanjutkan
                  </Button>
                  <Button
                    onClick={onStop}
                    size="lg"
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Square className="w-5 h-5 mr-2" />
                    Berhenti
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
