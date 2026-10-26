import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { useUIStore } from '@/store/uiStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { sidebarOpen, isMobile, setIsMobile } = useUIStore();
  
  // Initialize theme system
  useTheme();

  // Handle responsive layout
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  // Keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-gray-950 transition-colors duration-300">
      {/* Sidebar - Desktop */}
      {!isMobile && <Sidebar />}

      {/* Top Bar */}
      <TopBar />

      {/* Mobile Sidebar Overlay */}
      {isMobile && <Sidebar />}

      {/* Main Content */}
      <main
        className={cn(
          'pt-16 transition-all duration-300',
          !isMobile && sidebarOpen ? 'md:ml-[260px]' : '',
          !isMobile && !sidebarOpen ? 'md:ml-[80px]' : '',
          isMobile ? 'pb-20' : '' // Space for mobile nav
        )}
      >
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Navigation */}
      {isMobile && <MobileNav />}
    </div>
  );
}

export { Sidebar, TopBar, MobileNav };
