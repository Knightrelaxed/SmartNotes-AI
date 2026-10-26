import React from 'react';
import { BarChart3, BookOpen, TrendingUp, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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

const COLORS = ['#6C63FF', '#FF6584', '#4CAF50', '#FFC107', '#9C27B0', '#00BCD4', '#FF9800'];

interface StudyChartsProps {
  weeklyData: { day: string; duration: number }[];
  subjectData: { name: string; value: number; color: string }[];
  wordCountTrend: { date: string; words: number }[];
  insights: {
    mostProductiveDay?: { day: string; duration: number };
    avgSession: number;
    topSubjects: { name: string; value: number; color: string }[];
  };
  calendarSlot?: React.ReactNode;
}

export function StudyCharts({
  weeklyData,
  subjectData,
  wordCountTrend,
  insights,
  calendarSlot,
}: StudyChartsProps) {
  return (
    <div className="space-y-6">
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
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: any) => [`${value} menit`, 'Durasi']}
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
                  data={subjectData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {subjectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: any) => [`${value} menit`, 'Durasi']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className={calendarSlot ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : ''}>
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
              <LineChart data={wordCountTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: any) => [`${value} kata`, 'Jumlah']}
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

        {calendarSlot}
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
                {insights.mostProductiveDay?.day || '-'}
              </p>
              <p className="text-xs text-gray-400">
                {insights.mostProductiveDay?.duration || 0} menit rata-rata
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Durasi Rata-rata</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round(insights.avgSession / 60)} menit
              </p>
              <p className="text-xs text-gray-400">Per sesi rekaman</p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Top Mata Kuliah</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {insights.topSubjects.length > 0 ? (
                  insights.topSubjects.map((subj, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${subj.color}20`,
                        color: subj.color,
                      }}
                    >
                      {subj.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">Belum ada data</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
