'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  Flame,
  Gauge,
  MapPin,
  Medal,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Skeleton } from '@/components/skeleton';
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
  'bg-[#ff385c] text-white',
  'bg-[#222222] text-white dark:bg-[#f5f5f5] dark:text-[#111111]',
  'bg-[#2d6a4f] text-white',
];

const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
});

const fullDateFormatter = new Intl.DateTimeFormat('en', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

function formatDate(value?: string) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return fullDateFormatter.format(date);
}

function formatShortDate(value?: string) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return dateFormatter.format(date);
}

function formatScore(match?: Match) {
  if (!match || match.home_score === null || match.away_score === null) {
    return '--';
  }

  return `${match.home_score} : ${match.away_score}`;
}

function getOutcome(match: Match) {
  if (match.home_score === null || match.away_score === null) {
    return { label: 'Pending', tone: 'bg-[#f2f2f2] text-[#6a6a6a] dark:bg-[#2a2a2a] dark:text-[#a3a3a3]' };
  }

  if (match.home_score > match.away_score) {
    return { label: 'Win', tone: 'bg-[#e7f4ec] text-[#1b6b43] dark:bg-[#153523] dark:text-[#9de0b9]' };
  }

  if (match.home_score < match.away_score) {
    return { label: 'Loss', tone: 'bg-[#fff0f2] text-[#c13515] dark:bg-[#3a1020] dark:text-[#ffb1bd]' };
  }

  return { label: 'Draw', tone: 'bg-[#fff6df] text-[#8a5a00] dark:bg-[#362a12] dark:text-[#ffd77a]' };
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Skeleton className="h-[280px] rounded-airbnb" />
        <Skeleton className="h-[280px] rounded-airbnb" />
      </div>
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
  const [stats, setStats] = useState<Stats>({
    totalPlayers: 0,
    totalMatches: 0,
    recentMatches: [],
    topScorers: [],
    leaderboard: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const [players, matches, leaderboard] = await Promise.all([
        apiClient.getPlayers() as Promise<Player[]>,
        apiClient.getMatches() as Promise<Match[]>,
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
      setError('Dashboard data could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const featuredMatch = stats.recentMatches[0];
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
        value: stats.totalPlayers,
        detail: 'registered players',
        icon: Users,
        accent: 'bg-[#fff0f2] text-[#ff385c] dark:bg-[#3a1020]',
      },
      {
        title: 'Matches',
        value: stats.totalMatches,
        detail: 'recorded fixtures',
        icon: CalendarDays,
        accent: 'bg-[#e9f5ee] text-[#2d6a4f] dark:bg-[#143224]',
      },
      {
        title: 'Goals per match',
        value: averageGoals,
        detail: `${totalGoals} goals, ${totalAssists} assists`,
        icon: Gauge,
        accent: 'bg-[#fff6df] text-[#a96b00] dark:bg-[#3a2c10]',
      },
      {
        title: 'Best win rate',
        value: bestWinRate
          ? `${(bestWinRate.stats.winrate * 100).toFixed(0)}%`
          : '0%',
        detail: bestWinRate?.player.name ?? 'No qualified player',
        icon: ShieldCheck,
        accent: 'bg-[#edf0ff] text-[#3544a5] dark:bg-[#191f45]',
      },
    ];
  }, [stats]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="relative overflow-hidden rounded-airbnb border border-[#e7e7e7] bg-[#fcfbf8] p-5 shadow-airbnb-card dark:border-[#2e2e2e] dark:bg-[#151515] sm:p-6">
          <div className="absolute inset-x-6 top-24 hidden h-px bg-[#d7ded7] dark:bg-[#28362d] sm:block" />
          <div className="absolute bottom-0 right-0 h-40 w-40 translate-x-12 translate-y-12 rounded-full border border-[#d7ded7] dark:border-[#28362d]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-airbnb border border-[#e7e7e7] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:border-[#2e2e2e] dark:bg-[#1c1c1e] dark:text-[#a3a3a3]">
                <Activity className="h-3.5 w-3.5 text-[#ff385c]" />
                Team control room
              </div>
              <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-[#222222] dark:text-[#f5f5f5] sm:text-5xl">
                Chiateam match intelligence
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#6a6a6a] dark:text-[#a3a3a3]">
                A live read on squad depth, scoring output, recent fixtures,
                and the players setting the tempo.
              </p>
            </div>

            <div className="grid min-w-[260px] grid-cols-[1fr_auto_1fr] items-center rounded-airbnb border border-[#222222] bg-[#222222] p-4 text-white shadow-airbnb-card dark:border-[#333333] dark:bg-[#f5f5f5] dark:text-[#111111]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">
                  Latest
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {formatDate(featuredMatch?.match_date)}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs opacity-70">
                  <MapPin className="h-3 w-3" />
                  {featuredMatch?.san || 'No location'}
                </p>
              </div>
              <div className="mx-4 h-16 w-px bg-white/20 dark:bg-black/20" />
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-60">
                  Score
                </p>
                <p className="mt-1 text-4xl font-black tracking-tight">
                  {formatScore(featuredMatch)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="rounded-airbnb border border-[#e7e7e7] bg-white p-5 shadow-airbnb-card dark:border-[#2e2e2e] dark:bg-[#1c1c1e]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                Current finisher
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#222222] dark:text-[#f5f5f5]">
                {topScorer?.player.name ?? 'No scorer yet'}
              </h2>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-airbnb bg-[#ff385c] text-white">
              <Flame className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-airbnb bg-[#f7f7f7] p-4 dark:bg-[#2a2a2a]">
              <p className="text-xs text-[#6a6a6a] dark:text-[#a3a3a3]">
                Goals
              </p>
              <p className="mt-1 text-3xl font-black text-[#222222] dark:text-[#f5f5f5]">
                {topScorer?.stats.goal ?? 0}
              </p>
            </div>
            <div className="rounded-airbnb bg-[#f7f7f7] p-4 dark:bg-[#2a2a2a]">
              <p className="text-xs text-[#6a6a6a] dark:text-[#a3a3a3]">
                Assists
              </p>
              <p className="mt-1 text-3xl font-black text-[#222222] dark:text-[#f5f5f5]">
                {topScorer?.stats.assist ?? 0}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-airbnb border border-[#e7e7e7] p-4 dark:border-[#2e2e2e]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6a6a6a] dark:text-[#a3a3a3]">
                Win rate
              </span>
              <span className="font-bold text-[#222222] dark:text-[#f5f5f5]">
                {topScorer
                  ? `${(topScorer.stats.winrate * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f2f2f2] dark:bg-[#2a2a2a]">
              <div
                className="h-full rounded-full bg-[#ff385c]"
                style={{
                  width: `${Math.min((topScorer?.stats.winrate ?? 0) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </aside>
      </section>

      {error && (
        <div className="rounded-airbnb border border-[#ffd1d8] bg-[#fff0f2] px-4 py-3 text-sm font-medium text-[#c13515] dark:border-[#5a1a27] dark:bg-[#2b1118] dark:text-[#ffb1bd]">
          {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardMetrics.map(metric => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.title}
              className="group rounded-airbnb border border-[#e7e7e7] bg-white p-4 shadow-airbnb-card transition-transform duration-200 hover:-translate-y-0.5 dark:border-[#2e2e2e] dark:bg-[#1c1c1e]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                    {metric.title}
                  </p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-[#222222] dark:text-[#f5f5f5]">
                    {metric.value}
                  </p>
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-airbnb ${metric.accent}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 truncate text-sm text-[#6a6a6a] dark:text-[#a3a3a3]">
                {metric.detail}
              </p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-airbnb border border-[#e7e7e7] bg-white shadow-airbnb-card dark:border-[#2e2e2e] dark:bg-[#1c1c1e]">
          <div className="flex items-center justify-between border-b border-[#f2f2f2] px-5 py-4 dark:border-[#2e2e2e]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                Fixture log
              </p>
              <h2 className="mt-1 text-lg font-bold text-[#222222] dark:text-[#f5f5f5]">
                Recent matches
              </h2>
            </div>
            <Target className="h-5 w-5 text-[#ff385c]" />
          </div>

          <div className="divide-y divide-[#f2f2f2] dark:divide-[#2e2e2e]">
            {stats.recentMatches.length > 0 ? (
              stats.recentMatches.map(match => {
                const outcome = getOutcome(match);

                return (
                  <div
                    key={match.id}
                    className="grid gap-3 px-5 py-4 sm:grid-cols-[84px_1fr_auto] sm:items-center"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#222222] dark:text-[#f5f5f5]">
                        {formatShortDate(match.match_date)}
                      </p>
                      <p className="mt-1 text-xs text-[#6a6a6a] dark:text-[#a3a3a3]">
                        Match #{match.id}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#222222] dark:text-[#f5f5f5]">
                        {match.san || 'Unknown location'}
                      </p>
                      <p className="mt-1 truncate text-xs text-[#6a6a6a] dark:text-[#a3a3a3]">
                        {match.notes || 'No match note recorded'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span
                        className={`rounded-badge px-2.5 py-1 text-xs font-bold ${outcome.tone}`}
                      >
                        {outcome.label}
                      </span>
                      <span className="min-w-20 text-right text-xl font-black text-[#222222] dark:text-[#f5f5f5]">
                        {formatScore(match)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-5 py-10 text-center text-sm text-[#6a6a6a] dark:text-[#a3a3a3]">
                No matches yet
              </div>
            )}
          </div>
        </div>

        <div className="rounded-airbnb border border-[#e7e7e7] bg-white shadow-airbnb-card dark:border-[#2e2e2e] dark:bg-[#1c1c1e]">
          <div className="flex items-center justify-between border-b border-[#f2f2f2] px-5 py-4 dark:border-[#2e2e2e]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                Leaderboard pulse
              </p>
              <h2 className="mt-1 text-lg font-bold text-[#222222] dark:text-[#f5f5f5]">
                Top scorers
              </h2>
            </div>
            <Trophy className="h-5 w-5 text-[#ff385c]" />
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
                    className="rounded-airbnb border border-[#f2f2f2] p-3 dark:border-[#2e2e2e]"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-airbnb text-sm font-black ${
                          rankStyles[index] ??
                          'bg-[#f2f2f2] text-[#6a6a6a] dark:bg-[#2a2a2a] dark:text-[#a3a3a3]'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#222222] dark:text-[#f5f5f5]">
                          {entry.player.name || `#${entry.player.number}`}
                        </p>
                        <p className="mt-0.5 text-xs text-[#6a6a6a] dark:text-[#a3a3a3]">
                          {entry.stats.assist} assists ·{' '}
                          {(entry.stats.winrate * 100).toFixed(1)}% win rate
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-[#222222] dark:text-[#f5f5f5]">
                          {entry.stats.goal}
                        </p>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                          goals
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f2f2f2] dark:bg-[#2a2a2a]">
                      <div
                        className="h-full rounded-full bg-[#ff385c]"
                        style={{ width: `${Math.min(goalShare, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-sm text-[#6a6a6a] dark:text-[#a3a3a3]">
                No data yet
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="rounded-airbnb border border-[#e7e7e7] bg-[#2d6a4f] p-5 text-white shadow-airbnb-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
                Team rhythm
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {stats.recentMatches.length} recent signals
              </h2>
            </div>
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {stats.recentMatches.slice(0, 6).map(match => {
              const outcome = getOutcome(match).label;

              return (
                <div
                  key={match.id}
                  className="rounded-airbnb bg-white/12 px-3 py-2 text-center"
                >
                  <p className="text-xs font-semibold text-white/65">
                    {formatShortDate(match.match_date)}
                  </p>
                  <p className="mt-1 text-sm font-black">{outcome}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-airbnb border border-[#e7e7e7] bg-white p-5 shadow-airbnb-card dark:border-[#2e2e2e] dark:bg-[#1c1c1e]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                Squad efficiency
              </p>
              <h2 className="mt-1 text-lg font-bold text-[#222222] dark:text-[#f5f5f5]">
                Reliable contributors
              </h2>
            </div>
            <Medal className="h-5 w-5 text-[#ff385c]" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {stats.leaderboard.slice(0, 3).map(entry => (
              <div
                key={entry.player.number}
                className="rounded-airbnb bg-[#f7f7f7] p-4 dark:bg-[#2a2a2a]"
              >
                <p className="truncate text-sm font-bold text-[#222222] dark:text-[#f5f5f5]">
                  {entry.player.name}
                </p>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-2xl font-black text-[#222222] dark:text-[#f5f5f5]">
                      {entry.stats.total_match}
                    </p>
                    <p className="text-xs text-[#6a6a6a] dark:text-[#a3a3a3]">
                      matches
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-[#222222] dark:text-[#f5f5f5]">
                      {(entry.stats.winrate * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-[#6a6a6a] dark:text-[#a3a3a3]">
                      win rate
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
