import { useEffect, useCallback } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

export type Theme = 'light' | 'dark' | 'auto';

export function useTheme() {
  const { interface: settings, updateInterface } = useSettingsStore();
  const theme = settings.theme;

  // Apply theme to document
  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement;
    
    if (newTheme === 'auto') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  // Set theme and apply it
  const setTheme = useCallback((newTheme: Theme) => {
    updateInterface({ theme: newTheme });
    applyTheme(newTheme);
  }, [updateInterface, applyTheme]);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const currentTheme = theme === 'auto' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [theme, setTheme]);

  // Get effective theme (resolved auto)
  const effectiveTheme = theme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  // Initialize theme on mount and listen to system changes
  useEffect(() => {
    // Apply initial theme
    applyTheme(theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'auto') {
        applyTheme('auto');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  return {
    theme,
    effectiveTheme,
    setTheme,
    toggleTheme,
    isDark: effectiveTheme === 'dark',
  };
}
