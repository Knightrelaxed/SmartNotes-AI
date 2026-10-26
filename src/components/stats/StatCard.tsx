import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  delay?: number;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  delay = 0,
}: StatCardProps) {
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
