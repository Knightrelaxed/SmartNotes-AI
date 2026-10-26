import { Layout } from '@/components/layout';
import { RecordPage } from '@/pages/RecordPage';
import { NotesPage } from '@/pages/NotesPage';
import { SearchPage } from '@/pages/SearchPage';
import { StatsPage } from '@/pages/StatsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { useUIStore } from '@/store/uiStore';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Page transition wrapper
function PageTransition({ children, pageKey }: { children: React.ReactNode; pageKey: string }) {
  return (
    <motion.div
      key={pageKey}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

// Toast notifications component
function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className={cn(
              'px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[280px]',
              toast.type === 'success' && 'bg-green-500 text-white',
              toast.type === 'error' && 'bg-red-500 text-white',
              toast.type === 'warning' && 'bg-yellow-500 text-white',
              toast.type === 'info' && 'bg-[#6C63FF] text-white'
            )}
          >
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button 
              onClick={() => removeToast(toast.id)}
              className="opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Loading overlay
function LoadingOverlay() {
  const { isLoading, loadingMessage } = useUIStore();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#6C63FF] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-700 dark:text-gray-300 font-medium">
          {loadingMessage || 'Memuat...'}
        </p>
      </div>
    </div>
  );
}

function App() {
  const { currentPage } = useUIStore();

  const renderPage = () => {
    switch (currentPage) {
      case 'record':
        return <RecordPage />;
      case 'notes':
        return <NotesPage />;
      case 'search':
        return <SearchPage />;
      case 'stats':
        return <StatsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <RecordPage />;
    }
  };

  return (
    <>
      <Layout>
        <PageTransition pageKey={currentPage}>
          {renderPage()}
        </PageTransition>
      </Layout>
      
      <ToastContainer />
      <LoadingOverlay />
    </>
  );
}

export default App;
