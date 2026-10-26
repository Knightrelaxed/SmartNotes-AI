import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { format, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ActivityCalendarProps {
  notes: { createdAt: Date | string; duration: number }[];
}

export function ActivityCalendar({ notes }: ActivityCalendarProps) {
  // Generate 4 full weeks (28 days) aligned from Monday to Sunday
  const days = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
    const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + daysToSunday);

    const result = [];
    for (let i = 27; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(endDate.getDate() - i);
      const isFuture = date > today;
      const dayNotes = isFuture ? [] : notes.filter((n) => isSameDay(new Date(n.createdAt), date));
      const totalDuration = dayNotes.reduce((sum, n) => sum + n.duration, 0);

      result.push({
        date,
        duration: totalDuration,
        count: dayNotes.length,
        isFuture,
      });
    }
    return result;
  }, [notes]);

  const getIntensity = (duration: number, isFuture: boolean) => {
    if (isFuture) return 'bg-gray-50/50 dark:bg-gray-800/20 border border-dashed border-gray-200 dark:border-gray-800 cursor-default';
    if (duration === 0) return 'bg-gray-100 dark:bg-gray-800/80';
    if (duration < 1800) return 'bg-[#6C63FF]/30';
    if (duration < 3600) return 'bg-[#6C63FF]/50';
    if (duration < 7200) return 'bg-[#6C63FF]/70';
    return 'bg-[#6C63FF] shadow-sm shadow-[#6C63FF]/30';
  };

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <Card className="border-0 shadow-md bg-white dark:bg-gray-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="w-5 h-5 text-[#6C63FF]" />
          Aktivitas 4 Minggu Terakhir
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Day labels: Monday to Sunday */}
          <div className="flex gap-1">
            <div className="w-10" />
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
              <div key={day} className="flex-1 text-center text-xs text-gray-400 font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="space-y-1.5">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex gap-1 items-center">
                <div className="w-10 text-[10px] text-gray-400 font-mono">
                  {format(week[0].date, 'd MMM', { locale: id })}
                </div>
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={cn(
                      'flex-1 aspect-square rounded-md transition-all hover:scale-110 cursor-pointer flex items-center justify-center text-[9px] font-medium',
                      getIntensity(day.duration, day.isFuture)
                    )}
                    title={
                      day.isFuture
                        ? `${format(day.date, 'EEEE, d MMMM yyyy', { locale: id })}`
                        : `${format(day.date, 'EEEE, d MMMM yyyy', { locale: id })}: ${day.count} catatan (${Math.round(day.duration / 60)} menit)`
                    }
                  >
                    {!day.isFuture && day.count > 0 && (
                      <span className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                        {day.count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 pt-2 text-xs text-gray-500">
            <span>Kurang</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="w-3 h-3 rounded bg-[#6C63FF]/30" />
              <div className="w-3 h-3 rounded bg-[#6C63FF]/50" />
              <div className="w-3 h-3 rounded bg-[#6C63FF]/70" />
              <div className="w-3 h-3 rounded bg-[#6C63FF]" />
            </div>
            <span>Lebih</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
