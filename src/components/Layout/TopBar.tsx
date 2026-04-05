import { Settings, Search, Sun, Moon } from 'lucide-react';
import { SidebarToggle } from './Sidebar';
import { useUIStore } from '@/store/uiStore';
import { useRecordStore } from '@/store/recordStore';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import AdminUserMenu from './AdminUserMenu';

export function TopBar() {
  const { sidebarOpen, isMobile, setCurrentPage } = useUIStore();
  const { state } = useRecordStore();
  const { effectiveTheme, toggleTheme } = useTheme();

  const getRecordingStatus = () => {
    switch (state) {
      case 'recording':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-500">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-sm font-medium">Merekam...</span>
          </div>
        );
      case 'paused':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 text-yellow-600">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
            <span className="text-sm font-medium">Dijeda</span>
          </div>
        );
      default:
        return null;
    }
  };

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
      <div className="flex items-center gap-4">
        <SidebarToggle />
        
        {/* Page Title / Status */}
        <div className="hidden sm:flex items-center gap-4">
          {getRecordingStatus()}
        </div>
      </div>

      {/* Center - Date & Time */}
      <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span className="font-medium">
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}
        </span>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <span>{format(new Date(), 'HH:mm')} WIB</span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Search Button */}
        <button
          onClick={() => setCurrentPage('search')}
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
