import { Settings, Search, Sun, Moon } from 'lucide-react';
import { SidebarToggle } from './Sidebar';
import { useUIStore } from '@/store/uiStore';
import { useRecordStore } from '@/store/recordStore';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import AdminUserMenu from './AdminUserMenu';

const PAGE_INFO: Record<string, { title: string; subtitle: string }> = {
  record: { title: 'Rekam Audio', subtitle: 'Transkripsi langsung & ringkasan' },
  notes: { title: 'Catatan Saya', subtitle: 'Daftar materi tersimpan' },
  search: { title: 'Pencarian Cerdas', subtitle: 'Cari catatan, topik & kata kunci' },
  stats: { title: 'Statistik Belajar', subtitle: 'Grafik & tren aktivitas' },
  settings: { title: 'Pengaturan', subtitle: 'Audio, model AI & antarmuka' },
};

export function TopBar() {
  const { sidebarOpen, isMobile, setCurrentPage, currentPage } = useUIStore();
  const { state } = useRecordStore();
  const { effectiveTheme, toggleTheme } = useTheme();

  const getRecordingStatus = () => {
    switch (state) {
      case 'recording':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider">Merekam Audio</span>
          </div>
        );
      case 'paused':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-xs font-semibold uppercase tracking-wider">Rekaman Dijeda</span>
          </div>
        );
      default:
        return (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-700 dark:text-indigo-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">Gemini 3.5 Live AI</span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="text-gray-500 dark:text-gray-400">Siap Merekam</span>
          </div>
        );
    }
  };

  const page = PAGE_INFO[currentPage] || { title: 'SmartNotes AI', subtitle: 'Catatan Perkuliahan' };

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl',
        'border-b border-gray-200 dark:border-gray-800',
        'flex items-center justify-between px-4 z-20',
        'transition-all duration-300',
        !isMobile ? (sidebarOpen ? 'left-[260px]' : 'left-[80px]') : 'left-0'
      )}
    >
      {/* Left: Sidebar Toggle + Dynamic Page Title */}
      <div className="flex items-center gap-3">
        <SidebarToggle />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
            {page.title}
          </span>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:inline leading-tight">
            {page.subtitle}
          </span>
        </div>
      </div>

      {/* Center: Live Recording or AI Connection Status */}
      <div className="flex items-center justify-center">
        {getRecordingStatus()}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Search Button */}
        <button
          onClick={() => setCurrentPage('search')}
          aria-label="Cari Catatan (Ctrl+K)"
          className={cn(
            'p-2 rounded-lg transition-colors',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'text-gray-600 dark:text-gray-300'
          )}
          title="Cari (Ctrl+K)"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={effectiveTheme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
          className={cn(
            'p-2 rounded-lg transition-colors',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'text-gray-600 dark:text-gray-300'
          )}
          title={effectiveTheme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
        >
          {effectiveTheme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* Settings */}
        <button
          onClick={() => setCurrentPage('settings')}
          aria-label="Buka Pengaturan (Ctrl+,)"
          className={cn(
            'p-2 rounded-lg transition-colors',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'text-gray-600 dark:text-gray-300'
          )}
          title="Pengaturan (Ctrl+,)"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* User Avatar via AdminUserMenu */}
        <AdminUserMenu isTopBar side="bottom" align="end" className="w-[unset]" />
      </div>
    </header>
  );
}
