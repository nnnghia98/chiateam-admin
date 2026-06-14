'use client';

import { Trophy } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';

export function WorldCupSummary({
  totalMatches,
  groupStageMatches,
  knockoutMatches,
}: {
  totalMatches: number;
  groupStageMatches: number;
  knockoutMatches: number;
}) {
  const { t } = useI18n();

  return (
    <section className="overflow-hidden rounded-airbnb border border-design-border-soft bg-design-card shadow-design-card">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="border-b border-design-border-soft p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-design-primary">
            <Trophy className="h-4 w-4" />
            {t('worldCup.brand')}
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-design-border-soft bg-design-muted/45 lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
          <div className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-design-secondary">
              {t('worldCup.matchesStat')}
            </p>
            <p className="mt-2 text-2xl font-black text-design-text">
              {totalMatches}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-design-secondary">
              {t('worldCup.groupStat')}
            </p>
            <p className="mt-2 text-2xl font-black text-design-text">
              {groupStageMatches}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-design-secondary">
              {t('worldCup.knockoutStat')}
            </p>
            <p className="mt-2 text-2xl font-black text-design-text">
              {knockoutMatches}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
