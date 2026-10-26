import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  delay?: number;
}

export function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
  delay = 0,
}: SettingsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="border-0 shadow-md bg-white dark:bg-gray-900">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6C63FF]/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-[#6C63FF]" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface SettingItemProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingItem({
  label,
  description,
  children,
  className,
}: SettingItemProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      <div className="flex-shrink-0">
        {children}
      </div>
    </div>
  );
}

interface RadioOptionProps {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}

export function RadioOption({
  label,
  description,
  selected,
  onClick,
}: RadioOptionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left',
        selected
          ? 'border-[#6C63FF] bg-[#6C63FF]/5'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
      )}
    >
      <div
        className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
          selected ? 'border-[#6C63FF]' : 'border-gray-300'
        )}
      >
        {selected && <div className="w-2.5 h-2.5 rounded-full bg-[#6C63FF]" />}
      </div>
      <div>
        <p className={cn('font-medium', selected ? 'text-[#6C63FF]' : 'text-gray-900 dark:text-white')}>
          {label}
        </p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
    </button>
  );
}
