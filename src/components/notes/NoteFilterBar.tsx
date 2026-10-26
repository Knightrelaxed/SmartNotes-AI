import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Subject } from '@/types';

interface NoteFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  subjects: Subject[];
  filterSubject: string | null;
  onSubjectChange: (subject: string | null) => void;
  sortBy: 'latest' | 'oldest' | 'duration' | 'wordCount';
  onSortChange: (sort: 'latest' | 'oldest' | 'duration' | 'wordCount') => void;
}

export function NoteFilterBar({
  searchQuery,
  onSearchChange,
  subjects,
  filterSubject,
  onSubjectChange,
  sortBy,
  onSortChange,
}: NoteFilterBarProps) {
  return (
    <Card className="border-0 shadow-md">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cari catatan..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select
              value={filterSubject || 'all'}
              onValueChange={(v) => onSubjectChange(v === 'all' ? null : v)}
            >
              <SelectTrigger className="w-auto min-w-[180px]">
                <SelectValue placeholder="Semua Mata Kuliah" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Mata Kuliah</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.name}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: subject.color }}
                      />
                      {subject.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v: any) => onSortChange(v)}>
              <SelectTrigger className="w-auto min-w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Terbaru</SelectItem>
                <SelectItem value="oldest">Terlama</SelectItem>
                <SelectItem value="duration">Durasi Terlama</SelectItem>
                <SelectItem value="wordCount">Kata Terbanyak</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
