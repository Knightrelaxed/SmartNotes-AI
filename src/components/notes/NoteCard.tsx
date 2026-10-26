import { motion } from 'framer-motion';
import { MoreVertical, Edit2, Trash2, Calendar, Clock, Type, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDuration, formatDate } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import type { Note } from '@/types';

interface NoteCardProps {
  note: Note;
  onView: (note: Note) => void;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
}

export function NoteCard({ note, onView, onEdit, onDelete }: NoteCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="group relative"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#6C63FF]/0 via-[#6C63FF]/0 to-[#5548E8]/0 group-hover:from-[#6C63FF]/5 group-hover:via-[#6C63FF]/5 group-hover:to-[#5548E8]/5 rounded-2xl transition-all duration-500 pointer-events-none -m-1" />
      <Card
        className="relative h-full border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgb(108,99,255,0.1)] transition-all duration-500 bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl overflow-hidden cursor-pointer rounded-2xl group-hover:-translate-y-1"
        onClick={() => onView(note)}
      >
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {note.subject ? (
                <div className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium',
                  'bg-[#6C63FF]/10 text-[#6C63FF]'
                )}>
                  {note.subject}
                </div>
              ) : null}
              {!note.summary && note.content && (
                <div className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Transkrip
                </div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Menu Opsi Catatan"
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(note); }} onSelect={() => { onEdit(note); }}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} onSelect={() => { onDelete(note.id); }} className="text-red-500">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Hapus
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-[#6C63FF] transition-colors">
            {note.title}
          </h3>

          {/* Preview */}
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 leading-relaxed">
            {note.summary ? (
              note.summary.replace(/<[^>]+>/g, ' ').slice(0, 150) + (note.summary.length > 150 ? '...' : '')
            ) : note.content ? (
              note.content.slice(0, 150) + (note.content.length > 150 ? '...' : '')
            ) : (
              <span className="italic text-gray-400">Transkripsi kosong</span>
            )}
          </p>

          {/* Keywords */}
          {note.keywords && note.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {note.keywords.slice(0, 3).map((keyword, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400"
                >
                  #{keyword}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(note.createdAt, 'd MMM yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(note.duration)}
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Type className="w-3.5 h-3.5" />
              {note.wordCount.toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
