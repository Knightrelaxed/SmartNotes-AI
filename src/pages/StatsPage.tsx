import { useMemo } from 'react';
import { Clock, FileText, BookOpen, TrendingUp } from 'lucide-react';
import { useNotesStore } from '@/store/notesStore';
import { format, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatHours } from '@/utils/formatters';
import { StatCard } from '@/components/stats/StatCard';
import { ActivityCalendar } from '@/components/stats/ActivityCalendar';
import { StudyCharts } from '@/components/stats/StudyCharts';

export function StatsPage() {
  const { notes, subjects } = useNotesStore();

  // Calculate statistics
  const stats = useMemo(() => {
    const totalDuration = notes.reduce((sum, n) => sum + n.duration, 0);
    const totalNotes = notes.length;
    const totalCourses = new Set(notes.map((n) => n.subject)).size;
    const totalWords = notes.reduce((sum, n) => sum + n.wordCount, 0);

    // Weekly data (last 7 days)
    const weeklyData = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayNotes = notes.filter((n) => isSameDay(new Date(n.createdAt), date));
      const duration = dayNotes.reduce((sum, n) => sum + n.duration, 0);
      weeklyData.push({
        day: format(date, 'EEE', { locale: id }),
        duration: Math.round(duration / 60), // in minutes
      });
    }

    // Subject distribution
    const subjectData = subjects
      .map((subject) => {
        const subjectNotes = notes.filter((n) => n.subject === subject.name);
        const duration = subjectNotes.reduce((sum, n) => sum + n.duration, 0);
        return {
          name: subject.name,
          value: Math.round(duration / 60),
          color: subject.color,
        };
      })
      .filter((s) => s.value > 0);

    // Word count trend (last 10 notes)
    const wordCountTrend = notes
      .slice(0, 10)
      .reverse()
      .map((n) => ({
        date: format(new Date(n.createdAt), 'd MMM', { locale: id }),
        words: n.wordCount,
      }));

    // Insights
    const mostProductiveDay = weeklyData.reduce(
      (max, d) => (d.duration > max.duration ? d : max),
      weeklyData[0]
    );
    const avgSession = totalNotes > 0 ? totalDuration / totalNotes : 0;
    const topSubjects = subjectData
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    return {
      totalDuration,
      totalNotes,
      totalCourses,
      totalWords,
      weeklyData,
      subjectData,
      wordCountTrend,
      mostProductiveDay,
      avgSession,
      topSubjects,
    };
  }, [notes, subjects]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Statistik</h1>
        <p className="text-gray-500 dark:text-gray-400">Analisis aktivitas belajar Anda</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Waktu"
          value={`${formatHours(stats.totalDuration)}j`}
          subtitle="Jam kuliah terekam"
          icon={Clock}
          color="#6C63FF"
          delay={0}
        />
        <StatCard
          title="Total Catatan"
          value={stats.totalNotes.toString()}
          subtitle="Catatan tersimpan"
          icon={FileText}
          color="#FF6584"
          delay={0.1}
        />
        <StatCard
          title="Mata Kuliah"
          value={stats.totalCourses.toString()}
          subtitle="Mata kuliah berbeda"
          icon={BookOpen}
          color="#4CAF50"
          delay={0.2}
        />
        <StatCard
          title="Total Kata"
          value={stats.totalWords.toLocaleString()}
          subtitle="Kata terekam"
          icon={TrendingUp}
          color="#FFC107"
          delay={0.3}
        />
      </div>

      {/* Charts & Activity Calendar */}
      <StudyCharts
        weeklyData={stats.weeklyData}
        subjectData={stats.subjectData}
        wordCountTrend={stats.wordCountTrend}
        insights={{
          mostProductiveDay: stats.mostProductiveDay,
          avgSession: stats.avgSession,
          topSubjects: stats.topSubjects,
        }}
        calendarSlot={<ActivityCalendar notes={notes} />}
      />
    </div>
  );
}
