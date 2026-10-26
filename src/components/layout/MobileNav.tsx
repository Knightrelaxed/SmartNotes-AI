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
  color: string;
}

const navItems: NavItem[] = [
  { id: 'record', label: 'Rekam', icon: Mic, color: '#FF6584' },
  { id: 'notes', label: 'Catatan', icon: FolderOpen, color: '#6C63FF' },
  { id: 'search', label: 'Cari', icon: Search, color: '#00C9A7' },
  { id: 'stats', label: 'Statistik', icon: BarChart3, color: '#FFB800' },
  { id: 'settings', label: 'Pengaturan', icon: Settings, color: '#8B5CF6' },
];

export function MobileNav() {
  const { currentPage, setCurrentPage } = useUIStore();
  const { notes } = useNotesStore();
  const { state } = useRecordStore();
  const [activeIndex, setActiveIndex] = useState(1);

  useEffect(() => {
    const index = navItems.findIndex(item => item.id === currentPage);
    if (index !== -1) setActiveIndex(index);
  }, [currentPage]);

  const handleItemClick = (index: number, itemId: Page) => {
    setActiveIndex(index);
    setCurrentPage(itemId);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/65 dark:bg-[#1a1a2e]/65 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 pb-safe">
      <div className="relative h-[68px] flex items-center w-full px-1">
        
        {/* Menu Items */}
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeIndex === index;
          const isRecording = item.id === 'record' && state === 'recording';

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
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300',
                    isRecording && !isActive && 'text-red-500'
                  )} 
                  strokeWidth={isActive ? 2.5 : 2}
                />
                
                {/* Recording indicator */}
                {isRecording && (
                  <span className="absolute -top-0.5 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}

                {/* Badge for notes */}
                {item.id === 'notes' && notes.length > 0 && !isActive && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#FF6584] text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                    {notes.length}
                  </span>
                )}
              </div>
              
              {/* Text Label */}
              <span 
                className={cn(
                  "text-[10px] font-medium tracking-wide transition-all duration-200",
                  isActive 
                    ? "text-[#6C63FF] dark:text-[#8b84ff]"
                    : "text-gray-400 dark:text-gray-500"
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
