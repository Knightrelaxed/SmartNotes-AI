import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  FolderOpen, 
  Search, 
  BarChart3, 
  Settings, 
  Menu,
  X,
  GraduationCap
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useNotesStore } from '@/store/notesStore';
import { useRecordStore } from '@/store/recordStore';
import type { Page } from '@/types';
import { cn } from '@/lib/utils';
import AdminUserMenu from './AdminUserMenu';

interface SidebarItem {
  id: Page;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
}

const sidebarItems: SidebarItem[] = [
  { id: 'record', label: 'Rekam', icon: Mic },
  { id: 'notes', label: 'Catatan', icon: FolderOpen },
  { id: 'search', label: 'Cari', icon: Search },
  { id: 'stats', label: 'Statistik', icon: BarChart3 },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
];

export function Sidebar() {
  const { currentPage, setCurrentPage, sidebarOpen, toggleSidebar, isMobile } = useUIStore();
  const { notes } = useNotesStore();
  const { state } = useRecordStore();

  const handleItemClick = (pageId: Page) => {
    setCurrentPage(pageId);
    if (isMobile) {
      toggleSidebar();
    }
  };

  const getBadge = (itemId: Page) => {
    if (itemId === 'record' && state === 'recording') {
      return (
        <span className="flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
        </span>
      );
    }
    if (itemId === 'notes') {
      return notes.length > 0 ? notes.length : undefined;
    }
    return undefined;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#1a1a2e] overflow-hidden whitespace-nowrap">
      {/* Logo */}
      <div className="flex items-center p-4 border-b border-gray-100 dark:border-gray-800 shrink-0 h-[73px]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#FF6584] flex-shrink-0 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div className={cn(
            "flex flex-col overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            (!isMobile && !sidebarOpen) ? "w-0 opacity-0" : "w-[150px] opacity-100"
          )}>
            <span className="font-bold text-gray-900 dark:text-white text-lg leading-tight tracking-tight">SmartNotes</span>
            <span className="text-xs text-gray-500 dark:text-white/60">AI Transcription</span>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={toggleSidebar}
            className="p-2 ml-auto rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-white/80" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto scrollbar-none">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const badge = getBadge(item.id);

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={cn(
                'flex items-center rounded-xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group relative w-full mb-1 border outline-none overflow-hidden',
                (!isMobile && !sidebarOpen) ? 'px-0 justify-center border-transparent' : 'px-3',
                isActive
                  ? 'bg-gradient-to-r from-[#6C63FF] to-[#5548E8] text-white border-transparent'
                  : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <div className={cn(
                'flex-shrink-0 flex items-center justify-center transition-all duration-300',
                isActive ? 'text-white' : 'text-gray-500 dark:text-white/70 group-hover:text-gray-900 dark:group-hover:text-white',
                (!isMobile && !sidebarOpen) ? 'w-12 h-12' : 'w-10 h-10 mr-3'
              )}>
                <Icon className="w-5 h-5" />
              </div>
              
              <div className={cn(
                "flex items-center transition-all duration-300 flex-1 overflow-hidden",
                (!isMobile && !sidebarOpen) ? "w-0 opacity-0" : "w-auto opacity-100"
              )}>
                <span className="font-medium flex-1 text-left whitespace-nowrap">{item.label}</span>
                {badge && (
                  <span className={cn(
                    'flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium ml-2',
                    typeof badge === 'number' 
                      ? 'bg-gray-200 text-gray-700 dark:bg-white/20 dark:text-white' 
                      : ''
                  )}>
                    {badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer - Admin Login */}
      <div className="p-3 md:p-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
        <AdminUserMenu collapsed={!isMobile && !sidebarOpen} />
      </div>
    </div>
  );

  // Mobile: Full screen overlay
  if (isMobile) {
    return (
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={toggleSidebar}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-[#1a1a2e] border-r border-gray-200 dark:border-gray-800 z-50"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop: Collapsible sidebar
  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 260 : 80 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 bottom-0 bg-white dark:bg-[#1a1a2e] border-r border-gray-200 dark:border-gray-800 z-30"
    >
      <div className={cn("h-full", sidebarOpen ? "w-[260px]" : "w-[80px]")}>
        {sidebarContent}
      </div>
    </motion.aside>
  );
}

export function SidebarToggle() {
  const { toggleSidebar, sidebarOpen } = useUIStore();

  return (
    <button
      onClick={toggleSidebar}
      className={cn(
        'p-2 rounded-lg transition-all duration-200',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/50'
      )}
      aria-label={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
    >
      <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
    </button>
  );
}
