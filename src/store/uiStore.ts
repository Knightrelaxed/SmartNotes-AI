import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Page } from '@/types';

interface UIState {
  // Navigation
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  
  // Sidebar (desktop)
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Mobile
  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;
  
  // Modals
  showShortcutsModal: boolean;
  setShowShortcutsModal: (show: boolean) => void;
  
  // Toast notifications
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (message: string) => void;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      currentPage: 'record',
      sidebarOpen: true,
      isMobile: false,
      showShortcutsModal: false,
      toasts: [],
      isLoading: false,
      loadingMessage: '',

      setCurrentPage: (page) => set({ currentPage: page }),
      
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      setIsMobile: (isMobile) => {
        set({ isMobile });
        // Auto-close sidebar on mobile
        if (isMobile) {
          set({ sidebarOpen: false });
        }
      },
      
      setShowShortcutsModal: (show) => set({ showShortcutsModal: show }),
      
      addToast: (toast) => {
        const id = Date.now().toString();
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id }],
        }));
        
        // Auto-remove toast after duration
        const duration = toast.duration || 3000;
        setTimeout(() => {
          get().removeToast(id);
        }, duration);
      },
      
      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },
      
      setIsLoading: (loading) => set({ isLoading: loading }),
      setLoadingMessage: (message) => set({ loadingMessage: message }),
    }),
    {
      name: 'smartnotes-ui',
      partialize: (state) => ({ 
        sidebarOpen: state.sidebarOpen,
        currentPage: state.currentPage,
      }),
    }
  )
);
