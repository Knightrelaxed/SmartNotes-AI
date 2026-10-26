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
  // Generate last 28 days
  const days = useMemo(() => {
    const today = new Date();
    const result = [];
    for (let i = 27; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const dayNotes = notes.filter((n) => isSameDay(new Date(n.createdAt), date));
      const totalDuration = dayNotes.reduce((sum, n) => sum + n.duration, 0);

      result.push({
        date,
        duration: totalDuration,
        count: dayNotes.length,
      });
    }
    return result;
  }, [notes]);

  const getIntensity = (duration: number) => {
    if (duration === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (duration < 1800) return 'bg-[#6C63FF]/30';
    if (duration < 3600) return 'bg-[#6C63FF]/50';
    if (duration < 7200) return 'bg-[#6C63FF]/70';
    return 'bg-[#6C63FF]';
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
          Aktivitas 28 Hari Terakhir
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Day labels */}
          <div className="flex gap-1">
            <div className="w-8" />
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
              <div key={day} className="flex-1 text-center text-xs text-gray-400">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex gap-1">
                <div className="w-8 text-xs text-gray-400 flex items-center">
                  {weekIndex === 0 && format(week[0].date, 'd MMM', { locale: id })}
                </div>
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={cn(
                      'flex-1 aspect-square rounded-md transition-all hover:scale-110 cursor-pointer',
                      getIntensity(day.duration)
                    )}
                    title={`${format(day.date, 'd MMMM yyyy', { locale: id })}: ${(day.duration / 60).toFixed(0)} menit`}
                  />
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
