import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Type, Clock, Wand2, Mic } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/utils/formatters';
import { format } from 'date-fns';
import type { TranscriptionSegment, RecordingState } from '@/types';

interface TranscriptionDisplayProps {
  state: RecordingState;
  segments: TranscriptionSegment[];
  currentText: string;
  duration: number;
  wordCount: number;
  lastAutoSave: Date | null;
  isAIProcessing: boolean;
  onCorrectText: () => void;
  onStartRecord?: () => void;
}

export function TranscriptionDisplay({
  state,
  segments,
  currentText,
  duration,
  wordCount,
  lastAutoSave,
  isAIProcessing,
  onCorrectText,
  onStartRecord,
}: TranscriptionDisplayProps) {
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const transcriptionRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  const SCROLL_THRESHOLD = 80;

  const handleTranscriptionScroll = () => {
    const el = transcriptionRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsUserScrolledUp(distanceFromBottom > SCROLL_THRESHOLD);
  };

  const scrollToBottom = (smooth = true) => {
    const el = transcriptionRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
    });
  };

  useEffect(() => {
    if (!isUserScrolledUp) {
      scrollToBottom();
    }
  }, [segments, currentText, isUserScrolledUp]);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-[#6C63FF]" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Transkripsi Langsung</h3>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <AnimatePresence>
              {lastAutoSave && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-full text-xs font-medium text-green-600 dark:text-green-400 shadow-sm"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Draft tersimpan {lastAutoSave.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </motion.div>
              )}
            </AnimatePresence>

            {state === 'idle' && (segments.length > 0 || currentText.length > 10) && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCorrectText}
                disabled={isAIProcessing}
                className="h-7 text-xs flex items-center gap-1.5"
              >
                <Wand2 className="w-3 h-3 text-[#6C63FF]" />
                {isAIProcessing ? 'Memperbaiki...' : 'Perbaiki Teks'}
              </Button>
            )}

            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDuration(duration)}
            </span>
            <span>{wordCount} kata</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 relative">
        <div
          ref={transcriptionRef}
          onScroll={handleTranscriptionScroll}
          className="h-[400px] overflow-y-auto p-6 space-y-4 scrollbar-thin relative"
        >
          {segments.length === 0 && !currentText && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              {state === 'recording' ? (
                <>
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  </div>
                  <p className="font-medium text-gray-700 dark:text-gray-300">Sedang mendengarkan ucapan...</p>
                  <p className="text-xs text-gray-400 mt-1">Bicaralah ke mikrofon atau putar audio perkuliahan</p>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-4 max-w-sm mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center mb-4 shadow-sm">
                    <Mic className="w-8 h-8" />
                  </div>
                  <h4 className="font-semibold text-base text-gray-900 dark:text-white mb-1">
                    Siap Mentranskripsi Perkuliahan
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
                    Ucapkan materi kuliah atau putar audio perkuliahan. Gemini 3.5 Live akan menyalin langsung dengan tanda baca akurat.
                  </p>
                  {onStartRecord && (
                    <Button
                      onClick={onStartRecord}
                      size="default"
                      className="bg-gradient-to-r from-[#6C63FF] to-[#5548E8] hover:opacity-90 text-white shadow-md shadow-[#6C63FF]/20 px-6 font-medium rounded-xl flex items-center gap-2 group transition-all"
                    >
                      <Mic className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Mulai Rekam Sekarang
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          <AnimatePresence>
            {segments.map((segment) => (
              <motion.div
                key={segment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs text-gray-400 font-mono mt-1">
                    {format(segment.timestamp, 'HH:mm:ss')}
                  </span>
                  <p className="flex-1 text-gray-700 dark:text-gray-300 leading-relaxed">
                    {segment.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {currentText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-3"
            >
              <span className="text-xs text-gray-400 font-mono mt-1">
                {format(new Date(), 'HH:mm:ss')}
              </span>
              <p className="flex-1 text-gray-700 dark:text-gray-300 leading-relaxed">
                {currentText}
                <span className="inline-block w-0.5 h-5 bg-[#6C63FF] ml-1 animate-pulse" />
              </p>
            </motion.div>
          )}
          <div ref={bottomSentinelRef} className="h-1" />
        </div>

        <AnimatePresence>
          {isUserScrolledUp && (state === 'recording' || state === 'paused') && (
            <motion.button
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              onClick={() => {
                scrollToBottom();
                setIsUserScrolledUp(false);
              }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#6C63FF] text-white text-xs font-semibold shadow-lg shadow-[#6C63FF]/30 hover:bg-[#5548E8] transition-all"
            >
              <span className="animate-bounce">↓</span>
              Teks Terbaru
            </motion.button>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
