import { format } from 'date-fns';
import { id } from 'date-fns/locale';

/**
 * Format duration in seconds to standard clock format HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format duration in seconds to human-readable string (e.g. "1j 30m" or "45m")
 */
export function formatDurationHuman(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}j ${mins}m`;
  }
  return `${mins}m`;
}

/**
 * Format duration to decimal hours (e.g. "2.5")
 */
export function formatHours(seconds: number): string {
  const hours = (seconds || 0) / 3600;
  return hours.toFixed(1);
}

/**
 * Format Date to localized Indonesian date string
 */
export function formatDate(date: Date | string, formatStr: string = 'EEEE, d MMMM yyyy'): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, formatStr, { locale: id });
  } catch {
    return String(date);
  }
}
