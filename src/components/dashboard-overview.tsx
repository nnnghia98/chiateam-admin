'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Flame,
  Gauge,
  Medal,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Skeleton } from '@/components/skeleton';
import { useI18n } from '@/contexts/i18n-context';
import type { LeaderboardEntry } from '@/types/leaderboard';
import type { Match } from '@/types/match';
import type { Player } from '@/types/player';

interface Stats {
  totalPlayers: number;
  totalMatches: number;
  recentMatches: Match[];
  topScorers: LeaderboardEntry[];
  leaderboard: LeaderboardEntry[];
}

const rankStyles = [
  'bg-design-primary text-white',
  'bg-[#222222] text-white dark:bg-[#f5f5f5] dark:text-[#111111]',
  'bg-design-muted text-design-text',
];

function formatShortDate(value: string | undefined, locale: string) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatScore(match?: Match) {
  if (!match || match.home_score === null || match.away_score === null) {
    return '--';
  }

  return `${match.home_score} : ${match.away_score}`;
}

function getOutcome(match: Match, t: ReturnType<typeof useI18n>['t']) {
  if (match.home_score === null || match.away_score === null) {
    return {
      label: t('dashboard.pending'),
      tone: 'bg-design-muted text-design-secondary',
    };
  }

  if (match.home_score > match.away_score) {
    return { label: t('dashboard.win'), tone: 'bg-design-muted text-design-text' };
  }

  if (match.home_score < match.away_score) {
    return { label: t('dashboard.loss'), tone: 'bg-design-active text-design-error' };
  }

  return { label: t('dashboard.draw'), tone: 'bg-design-muted text-design-secondary' };
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-[280px] rounded-airbnb" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-airbnb" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Skeleton className="h-[390px] rounded-airbnb" />
        <Skeleton className="h-[390px] rounded-airbnb" />
      </div>
    </div>
  );
}

export function DashboardOverview() {
  const { locale, t } = useI18n();
  const [stats, setStats] = useState<Stats>({
    totalPlayers: 0,
    totalMatches: 0,
    recentMatches: [],
    topScorers: [],
    leaderboard: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [players, matches, leaderboard] = await Promise.all([
        apiClient.getPlayers() as Promise<Player[]>,
        apiClient.getMatches(),
        apiClient.getLeaderboard() as Promise<LeaderboardEntry[]>,
      ]);

      const sortedMatches = [...matches]
        .sort(
          (a, b) =>
            new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
        )
        .slice(0, 6);

      const sortedLeaderboard = [...leaderboard].sort(
        (a, b) => b.stats.goal - a.stats.goal
      );

      setStats({
        totalPlayers: players.length,
        totalMatches: matches.length,
        recentMatches: sortedMatches,
        topScorers: sortedLeaderboard.slice(0, 5),
        leaderboard: sortedLeaderboard,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
      setError(t('dashboard.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const topScorer = stats.topScorers[0];

  const dashboardMetrics = useMemo(() => {
    const totalGoals = stats.leaderboard.reduce(
      (sum, entry) => sum + entry.stats.goal,
      0
    );
    const totalAssists = stats.leaderboard.reduce(
      (sum, entry) => sum + entry.stats.assist,
      0
    );
    const bestWinRate = [...stats.leaderboard]
      .filter(entry => entry.stats.total_match > 0)
      .sort((a, b) => b.stats.winrate - a.stats.winrate)[0];
    const averageGoals = stats.totalMatches
      ? (totalGoals / stats.totalMatches).toFixed(1)
      : '0.0';

    return [
      {
        title: 'Squad',
        titleKey: 'dashboard.squad' as const,
        value: stats.totalPlayers,
        detail: t('dashboard.registeredPlayers'),
        icon: Users,
        accent: 'bg-design-active text-design-primary-strong',
      },
      {
        title: 'Matches',
        titleKey: 'dashboard.matches' as const,
        value: stats.totalMatches,
        detail: t('dashboard.recordedFixtures'),
        icon: CalendarDays,
        accent: 'bg-design-muted text-design-text',
      },
      {
        title: 'Goals per match',
        titleKey: 'dashboard.goalsPerMatch' as const,
        value: averageGoals,
        detail: t('dashboard.goalsAssists', {
          goals: totalGoals,
          assists: totalAssists,
        }),
        icon: Gauge,
        accent: 'bg-design-muted text-design-text',
      },
      {
        title: 'Best win rate',
        titleKey: 'dashboard.bestWinRate' as const,
        value: bestWinRate
          ? `${(bestWinRate.stats.winrate * 100).toFixed(0)}%`
          : '0%',
        detail: bestWinRate?.player.name ?? t('dashboard.noQualifiedPlayer'),
        icon: ShieldCheck,
        accent: 'bg-design-muted text-design-text',
      },
    ];
  }, [stats, t]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-5">
      <section>
        <aside className="design-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="design-section-label">
                {t('dashboard.currentFinisher')}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-design-text">
                {topScorer?.player.name ?? t('dashboard.noScorer')}
              </h2>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-airbnb bg-design-primary text-white">
              <Flame className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="design-muted-surface p-4">
              <p className="text-xs text-design-secondary">
                {t('dashboard.goals')}
              </p>
              <p className="mt-1 text-3xl font-black text-design-text">
                {topScorer?.stats.goal ?? 0}
              </p>
            </div>
            <div className="design-muted-surface p-4">
              <p className="text-xs text-design-secondary">
                {t('dashboard.assists')}
              </p>
              <p className="mt-1 text-3xl font-black text-design-text">
                {topScorer?.stats.assist ?? 0}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-airbnb border border-design-border-soft p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-design-secondary">
                {t('dashboard.winRate')}
              </span>
              <span className="font-bold text-design-text">
                {topScorer
                  ? `${(topScorer.stats.winrate * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-design-muted">
              <div
                className="h-full rounded-full bg-design-primary"
                style={{
                  width: `${Math.min((topScorer?.stats.winrate ?? 0) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </aside>
      </section>

      {error && (
        <div className="rounded-airbnb border border-[#ffd1d8] bg-design-active px-4 py-3 text-sm font-medium text-design-error dark:border-[#5a1a27]">
          {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardMetrics.map(metric => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.title}
              className="group design-surface p-4 transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="design-section-label">{t(metric.titleKey)}</p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-design-text">
                    {metric.value}
                  </p>
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-airbnb ${metric.accent}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 truncate text-sm text-design-secondary">
                {metric.detail}
              </p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <div className="design-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-design-border-soft px-5 py-4">
            <div>
              <p className="design-section-label">
                {t('dashboard.fixtureLog')}
              </p>
              <h2 className="mt-1 text-lg font-bold text-design-text">
                {t('dashboard.recentMatches')}
              </h2>
            </div>
            <Target className="h-5 w-5 text-design-primary" />
          </div>

          <div className="divide-y divide-design-border-soft">
            {stats.recentMatches.length > 0 ? (
              stats.recentMatches.map(match => {
                const outcome = getOutcome(match, t);

                return (
                  <div
                    key={match.id}
                    className="grid gap-3 px-5 py-4 sm:grid-cols-[84px_1fr_auto] sm:items-center"
                  >
                    <div>
                      <p className="text-sm font-bold text-design-text">
                        {formatShortDate(match.match_date, locale)}
                      </p>
                      <p className="mt-1 text-xs text-design-secondary">
                        {t('dashboard.matchNumber', { id: match.id })}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-design-text">
                        {match.san || t('dashboard.unknownLocation')}
                      </p>
                      <p className="mt-1 truncate text-xs text-design-secondary">
                        {match.notes || t('dashboard.noMatchNote')}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span
                        className={`rounded-badge px-2.5 py-1 text-xs font-bold ${outcome.tone}`}
                      >
                        {outcome.label}
                      </span>
                      <span className="min-w-20 text-right text-xl font-black text-design-text">
                        {formatScore(match)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-5 py-10 text-center text-sm text-design-secondary">
                {t('dashboard.noMatchesYet')}
              </div>
            )}
          </div>
        </div>

        <div className="design-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-design-border-soft px-5 py-4">
            <div>
              <p className="design-section-label">
                {t('dashboard.leaderboardPulse')}
              </p>
              <h2 className="mt-1 text-lg font-bold text-design-text">
                {t('dashboard.topScorers')}
              </h2>
            </div>
            <Trophy className="h-5 w-5 text-design-primary" />
          </div>

          <div className="space-y-3 p-5">
            {stats.topScorers.length > 0 ? (
              stats.topScorers.map((entry, index) => {
                const goalShare = topScorer?.stats.goal
                  ? (entry.stats.goal / topScorer.stats.goal) * 100
                  : 0;

                return (
                  <div
                    key={entry.player.number}
                    className="rounded-airbnb border border-design-border-soft p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-airbnb text-sm font-black ${
                          rankStyles[index] ??
                          'bg-design-muted text-design-secondary'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-design-text">
                          {entry.player.name || `#${entry.player.number}`}
                        </p>
                        <p className="mt-0.5 text-xs text-design-secondary">
                          {t('dashboard.topScorerMeta', {
                            assists: entry.stats.assist,
                            winRate: (entry.stats.winrate * 100).toFixed(1),
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-design-text">
                          {entry.stats.goal}
                        </p>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-design-secondary">
                          {t('dashboard.goals')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-design-muted">
                      <div
                        className="h-full rounded-full bg-design-primary"
                        style={{ width: `${Math.min(goalShare, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-sm text-design-secondary">
                {t('dashboard.noDataYet')}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="rounded-card border border-[#222222] bg-[#222222] p-5 text-white shadow-design-card dark:border-design-border-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
                {t('dashboard.teamRhythm')}
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {t('dashboard.recentSignals', {
                  count: stats.recentMatches.length,
                })}
              </h2>
            </div>
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {stats.recentMatches.slice(0, 6).map(match => {
              const outcome = getOutcome(match, t).label;

              return (
                <div
                  key={match.id}
                  className="rounded-airbnb bg-white/12 px-3 py-2 text-center"
                >
                  <p className="text-xs font-semibold text-white/65">
                    {formatShortDate(match.match_date, locale)}
                  </p>
                  <p className="mt-1 text-sm font-black">{outcome}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="design-surface p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
               <p className="design-section-label">
                {t('dashboard.squadEfficiency')}
              </p>
              <h2 className="mt-1 text-lg font-bold text-design-text">
                {t('dashboard.reliableContributors')}
              </h2>
            </div>
            <Medal className="h-5 w-5 text-design-primary" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {stats.leaderboard.slice(0, 3).map(entry => (
              <div
                key={entry.player.number}
                className="design-muted-surface p-4"
              >
                <p className="truncate text-sm font-bold text-design-text">
                  {entry.player.name}
                </p>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-2xl font-black text-design-text">
                      {entry.stats.total_match}
                    </p>
                    <p className="text-xs text-design-secondary">
                      {t('dashboard.matches')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-design-text">
                      {(entry.stats.winrate * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-design-secondary">
                      {t('dashboard.winRate')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
