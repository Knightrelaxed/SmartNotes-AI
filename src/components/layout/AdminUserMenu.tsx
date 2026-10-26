import React, { useState, useEffect } from 'react';
import { KeyRound, User, LogIn, LogOut } from 'lucide-react';
import { auth, signInWithGoogle, logOut, onUserAuthStateChanged } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface AdminUserMenuProps {
  className?: string;
  collapsed?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  isTopBar?: boolean;
}

const AdminUserMenu: React.FC<AdminUserMenuProps> = ({ className, collapsed = false, side = 'top', align = 'center', isTopBar = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Monitor auth state
  useEffect(() => {
    if (auth) {
      const unsubscribe = onUserAuthStateChanged((currentUser) => {
        setUser(currentUser);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      setIsOpen(false);
    } catch (error) {
      console.error('Google Sign In failed:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      setIsOpen(false);
    } catch (error) {
      console.error('Sign Out failed:', error);
    }
  };

  if (loading) {
    if (isTopBar) {
      return <div className="ml-2 w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />;
    }
    return (
      <div className="relative w-full">
        <div className="flex items-center w-full p-3 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="ml-3 space-y-2">
            <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="w-28 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative w-full', className)}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          {user ? (
            <button
              className={cn(
                'transition-all duration-300',
                isTopBar
                  ? 'ml-2 w-9 h-9 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#FF6584] flex items-center justify-center text-white font-medium text-sm'
                  : cn('flex items-center w-full rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent', collapsed ? 'justify-center p-2' : 'p-3')
              )}
            >
              {isTopBar ? (
                user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-5 h-5" />
                )
              ) : (
                <>
                  <div className="w-10 h-10 flex items-center justify-center shrink-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-[#6C63FF]/30"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                        <User size={16} className="text-indigo-600 dark:text-indigo-400" />
                      </div>
                    )}
                  </div>
                  {!collapsed && (
                    <div className="text-left ml-3 overflow-hidden">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                        {user.displayName || 'Admin'}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                        {user.email}
                      </p>
                    </div>
                  )}
                </>
              )}
            </button>
          ) : (
            <button
              className={cn(
                'transition-all duration-300',
                isTopBar
                  ? 'ml-2 w-9 h-9 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#FF6584] flex items-center justify-center text-white font-medium text-sm'
                  : cn('flex items-center w-full rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent', collapsed ? 'justify-center p-2' : 'p-3')
              )}
            >
              {isTopBar ? (
                <User className="w-5 h-5" />
              ) : (
                <>
                  <div className="w-10 h-10 flex items-center justify-center shrink-0">
                    <KeyRound size={18} className="text-slate-500 dark:text-slate-400" />
                  </div>
                  {!collapsed && <span className="ml-3">Admin Login</span>}
                </>
              )}
            </button>
          )}
        </DropdownMenuTrigger>
      
        <DropdownMenuContent 
          side={side}
          align={align}
          sideOffset={8}
          className={cn(
            'w-72',
            'bg-white dark:bg-slate-800',
            'rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700',
            'p-2 z-50'
          )}
        >
          {user ? (
            <>
              {/* Profile Info in Pop-up */}
              <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-700 mb-2 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden shrink-0 bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} />
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    {user.displayName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              
              {/* Log Out Button */}
              <button 
                onClick={handleSignOut}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5',
                  'text-rose-600 dark:text-rose-400',
                  'hover:bg-rose-50 dark:hover:bg-rose-900/20',
                  'rounded-lg text-sm font-medium transition-colors'
                )}
              >
                <LogOut size={16} />
                Log Out
              </button>
            </>
          ) : (
            /* Log In Button */
            <button 
              onClick={handleGoogleSignIn}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5',
                'text-indigo-600 dark:text-indigo-400',
                'hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
                'rounded-lg text-sm font-medium transition-colors'
              )}
            >
              <LogIn size={16} />
              Log In with Google
            </button>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default AdminUserMenu;
