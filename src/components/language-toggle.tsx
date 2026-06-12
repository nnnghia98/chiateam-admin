'use client';

import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/i18n-context';

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const nextLocale = locale === 'en' ? 'vi' : 'en';

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={t('common.language')}
      title={t('common.language')}
      onClick={() => setLocale(nextLocale)}
      className={cn('gap-2 px-3 font-bold', className)}
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs uppercase">{locale}</span>
    </Button>
  );
}
