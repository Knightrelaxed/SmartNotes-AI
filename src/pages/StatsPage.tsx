import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  FileText, 
  BookOpen, 
  TrendingUp,
  Calendar,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { useNotesStore } from '@/store/notesStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Colors for charts
const COLORS = ['#6C63FF', '#FF6584', '#4CAF50', '#FFC107', '#9C27B0', '#00BCD4', '#FF9800'];

// Format duration to hours
function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  return hours.toFixed(1);
}

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color,
  delay 
}: { 
  title: string; 
  value: string; 
  subtitle: string;
  icon: React.ElementType;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="border-0 shadow-md overflow-hidden bg-white dark:bg-gray-900">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon className="w-6 h-6" style={{ color }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Activity Calendar Component
function ActivityCalendar({ notes }: { notes: { createdAt: Date | string; duration: number }[] }) {
  // Generate last 28 days
  const days = useMemo(() => {
    const today = new Date();
    const result = [];
    for (let i = 27; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const dayNotes = notes.filter(n => isSameDay(new Date(n.createdAt), date));
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
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="w-3 h-3 rounded bg-[#6C63FF]/30" />
              <div className="w-3 h-3 rounded bg-[#6C63FF]/50" />
              <div className="w-3 h-3 rounded bg-[#6C63FF]/70" />
              <div className="w-3 h-3 rounded bg-[#6C63FF]" />
            </div>
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsPage() {
  const { notes, subjects } = useNotesStore();

  // Calculate statistics
  const stats = useMemo(() => {
    const totalDuration = notes.reduce((sum, n) => sum + n.duration, 0);
    const totalNotes = notes.length;
    const totalCourses = new Set(notes.map(n => n.subject)).size;
    const totalWords = notes.reduce((sum, n) => sum + n.wordCount, 0);

    // Weekly data (last 7 days)
    const weeklyData = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayNotes = notes.filter(n => isSameDay(new Date(n.createdAt), date));
      const duration = dayNotes.reduce((sum, n) => sum + n.duration, 0);
      weeklyData.push({
        day: format(date, 'EEE', { locale: id }),
        duration: Math.round(duration / 60), // in minutes
      });
    }

    // Subject distribution
    const subjectData = subjects.map(subject => {
      const subjectNotes = notes.filter(n => n.subject === subject.name);
      const duration = subjectNotes.reduce((sum, n) => sum + n.duration, 0);
      return {
        name: subject.name,
        value: Math.round(duration / 60),
        color: subject.color,
      };
    }).filter(s => s.value > 0);

    // Hourly distribution
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: notes.filter(n => new Date(n.createdAt).getHours() === i).length,
    }));

    // Word count trend (last 10 notes)
    const wordCountTrend = notes
      .slice(0, 10)
      .reverse()
      .map(n => ({
        date: format(new Date(n.createdAt), 'd MMM', { locale: id }),
        words: n.wordCount,
      }));

    // Insights
    const mostProductiveDay = weeklyData.reduce((max, d) => d.duration > max.duration ? d : max, weeklyData[0]);
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
      hourlyData,
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
        <p className="text-gray-500 dark:text-gray-400">
          Analisis aktivitas belajar Anda
        </p>
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

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity */}
        <Card className="border-0 shadow-md bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-[#6C63FF]" />
              Aktivitas Mingguan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: 'none', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value: number) => [`${value} menit`, 'Durasi']}
                />
                <Bar dataKey="duration" fill="#6C63FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subject Distribution */}
        <Card className="border-0 shadow-md bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="w-5 h-5 text-[#FF6584]" />
              Distribusi Mata Kuliah
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.subjectData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.subjectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: 'none', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value: number) => [`${value} menit`, 'Durasi']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Word Count Trend */}
        <Card className="border-0 shadow-md bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-[#4CAF50]" />
              Tren Jumlah Kata
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.wordCountTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: 'none', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value: number) => [`${value} kata`, 'Jumlah']}
                />
                <Line 
                  type="monotone" 
                  dataKey="words" 
                  stroke="#4CAF50" 
                  strokeWidth={2}
                  dot={{ fill: '#4CAF50', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Calendar */}
        <ActivityCalendar notes={notes} />
      </div>

      {/* Insights */}
      <Card className="border-0 shadow-md bg-white dark:bg-gray-900 bg-gradient-to-br from-[#6C63FF]/5 to-[#FF6584]/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-[#6C63FF]" />
            Insight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Hari Paling Produktif</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {stats.mostProductiveDay?.day || '-'}
              </p>
              <p className="text-xs text-gray-400">
                {stats.mostProductiveDay?.duration || 0} menit rata-rata
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Durasi Rata-rata</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round(stats.avgSession / 60)} menit
              </p>
              <p className="text-xs text-gray-400">
                Per sesi rekaman
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Top 3 Mata Kuliah</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {stats.topSubjects.map((subj, i) => (
                  <span 
                    key={i}
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: `${subj.color}20`,
                      color: subj.color 
                    }}
                  >
                    {subj.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
