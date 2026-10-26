import { useState, useEffect } from 'react';
import { Mic, FolderOpen, Search, BarChart3, Settings } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useNotesStore } from '@/store/notesStore';
import { useRecordStore } from '@/store/recordStore';
import type { Page } from '@/types';
import { cn } from '@/lib/utils';

interface NavItem {
  id: Page;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: 'notes', label: 'Catatan', icon: FolderOpen },
  { id: 'search', label: 'Cari', icon: Search },
  { id: 'record', label: 'Rekam', icon: Mic },
  { id: 'stats', label: 'Statistik', icon: BarChart3 },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
];

export function MobileNav() {
  const { currentPage, setCurrentPage } = useUIStore();
  const { notes } = useNotesStore();
  const { state } = useRecordStore();
  const [activeIndex, setActiveIndex] = useState(2);

  useEffect(() => {
    const index = navItems.findIndex((item) => item.id === currentPage);
    if (index !== -1) setActiveIndex(index);
  }, [currentPage]);

  const handleItemClick = (index: number, itemId: Page) => {
    setActiveIndex(index);
    setCurrentPage(itemId);
  };

  const isRecording = state === 'recording';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/80 dark:bg-[#1a1a2e]/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 pb-safe">
      <div className="relative h-[68px] flex items-center justify-around w-full px-2">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeIndex === index;
          const isRecordItem = item.id === 'record';

          if (isRecordItem) {
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(index, item.id)}
                aria-label="Tombol Rekam Utama"
                className="relative -top-5 flex flex-col items-center justify-center outline-none focus:outline-none z-20 group"
              >
                <div
                  className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform active:scale-90',
                    isRecording
                      ? 'bg-red-500 shadow-red-500/50 animate-pulse text-white ring-4 ring-red-300/40'
                      : isActive
                        ? 'bg-gradient-to-tr from-[#6C63FF] to-[#5548E8] shadow-[#6C63FF]/50 text-white ring-4 ring-white dark:ring-gray-900 scale-105'
                        : 'bg-gradient-to-tr from-[#6C63FF] to-[#5548E8] shadow-[#6C63FF]/30 text-white hover:scale-105'
                  )}
                >
                  <Icon className={cn('w-6 h-6 transition-transform', isRecording && 'animate-bounce')} />
                </div>
                <span
                  className={cn(
                    'text-[10px] font-semibold tracking-wide mt-1 transition-colors',
                    isActive || isRecording ? 'text-[#6C63FF] dark:text-[#8b84ff]' : 'text-gray-500 dark:text-gray-400'
                  )}
                >
                  {isRecording ? 'Merekam' : item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(index, item.id)}
              className="flex-1 flex flex-col items-center justify-center h-full relative z-10 gap-1 outline-none"
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={cn(
                    'w-[22px] h-[22px] transition-all duration-200',
                    isActive
                      ? 'text-[#6C63FF] scale-110'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />

                {/* Badge for notes count */}
                {item.id === 'notes' && notes.length > 0 && !isActive && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#FF6584] text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                    {notes.length}
                  </span>
                )}
              </div>

              {/* Text Label */}
              <span
                className={cn(
                  'text-[10px] font-medium tracking-wide transition-all duration-200',
                  isActive ? 'text-[#6C63FF] dark:text-[#8b84ff]' : 'text-gray-400 dark:text-gray-500'
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
