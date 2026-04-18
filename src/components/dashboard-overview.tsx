'use client';

import { useEffect, useState } from 'react';
import { Users, Calendar, Trophy, Target } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { StatCardSkeleton, Skeleton } from '@/components/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Stats {
  totalPlayers: number;
  totalMatches: number;
  recentMatches: any[];
  topScorers: any[];
}

const RANK_EMOJI = ['🥇', '🥈', '🥉'];

export function DashboardOverview() {
  const [stats, setStats] = useState<Stats>({
    totalPlayers: 0,
    totalMatches: 0,
    recentMatches: [],
    topScorers: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [players, matches, leaderboard] = await Promise.all([
        apiClient.getPlayers(),
        apiClient.getMatches(),
        apiClient.getLeaderboard(),
      ]);

      const sortedMatches = matches
        .sort(
          (a, b) =>
            new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
        )
        .slice(0, 5);

      const topScorers = leaderboard
        .sort((a, b) => b.stats.goal - a.stats.goal)
        .slice(0, 5);

      setStats({
        totalPlayers: players.length,
        totalMatches: matches.length,
        recentMatches: sortedMatches,
        topScorers,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      alert('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Players',
      value: stats.totalPlayers,
      sub: 'Registered players',
      icon: Users,
    },
    {
      title: 'Total Matches',
      value: stats.totalMatches,
      sub: 'Matches played',
      icon: Calendar,
    },
    {
      title: 'Top Scorer',
      value: stats.topScorers[0]?.stats.goal ?? 0,
      sub: stats.topScorers[0]?.player?.name ?? 'No data',
      icon: Target,
    },
    {
      title: 'Best Win Rate',
      value: stats.topScorers[0]
        ? `${(stats.topScorers[0].stats.winrate * 100).toFixed(1)}%`
        : '0%',
      sub: stats.topScorers[0]?.player?.name ?? 'No data',
      icon: Trophy,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="dark:bg-[#1c1c1e] dark:border-[#2e2e2e]">
              <CardHeader>
                <Skeleton className="h-5 w-36" />
              </CardHeader>
              <CardContent className="space-y-2">
                {[...Array(4)].map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#222222] dark:text-[#f5f5f5] tracking-tight">
          Chiateam Admin
        </h1>
        <p className="text-[#6a6a6a] dark:text-[#a3a3a3] mt-1 text-sm">
          Overview of your football team statistics
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className="dark:bg-[#1c1c1e] dark:border-[#2e2e2e] shadow-airbnb-card hover:shadow-airbnb-hover transition-shadow"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                <CardTitle className="text-xs sm:text-sm font-medium text-[#6a6a6a] dark:text-[#a3a3a3]">
                  {card.title}
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-[#f2f2f2] dark:bg-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4" style={{ color: '#ff385c' }} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-xl sm:text-2xl font-bold text-[#222222] dark:text-[#f5f5f5]">
                  {card.value}
                </div>
                <p className="text-xs text-[#6a6a6a] dark:text-[#a3a3a3] mt-0.5 truncate">
                  {card.sub}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="dark:bg-[#1c1c1e] dark:border-[#2e2e2e] shadow-airbnb-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#222222] dark:text-[#f5f5f5]">
              Recent Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentMatches.length > 0 ? (
              <div className="overflow-x-auto -mx-2">
                <Table>
                  <TableHeader>
                    <TableRow className="dark:border-[#2e2e2e]">
                      <TableHead className="text-[#6a6a6a] dark:text-[#a3a3a3] text-xs font-medium">
                        Date
                      </TableHead>
                      <TableHead className="text-[#6a6a6a] dark:text-[#a3a3a3] text-xs font-medium">
                        Location
                      </TableHead>
                      <TableHead className="text-right text-[#6a6a6a] dark:text-[#a3a3a3] text-xs font-medium">
                        Score
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentMatches.map(match => (
                      <TableRow
                        key={match.id}
                        className="dark:border-[#2e2e2e]"
                      >
                        <TableCell
                          className="font-medium text-[#222222] dark:text-[#f5f5f5] text-sm"
                          suppressHydrationWarning
                        >
                          {new Date(match.match_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-[#6a6a6a] dark:text-[#a3a3a3] text-sm">
                          {match.san || '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-[#222222] dark:text-[#f5f5f5] text-sm">
                          {match.home_score !== null &&
                          match.away_score !== null
                            ? `${match.home_score} – ${match.away_score}`
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-[#6a6a6a] dark:text-[#a3a3a3] text-sm py-6">
                No matches yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="dark:bg-[#1c1c1e] dark:border-[#2e2e2e] shadow-airbnb-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#222222] dark:text-[#f5f5f5]">
              Top Scorers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topScorers.length > 0 ? (
              <div className="overflow-x-auto -mx-2">
                <Table>
                  <TableHeader>
                    <TableRow className="dark:border-[#2e2e2e]">
                      <TableHead className="text-[#6a6a6a] dark:text-[#a3a3a3] text-xs font-medium">
                        Player
                      </TableHead>
                      <TableHead className="text-center text-[#6a6a6a] dark:text-[#a3a3a3] text-xs font-medium">
                        Goals
                      </TableHead>
                      <TableHead className="text-center text-[#6a6a6a] dark:text-[#a3a3a3] text-xs font-medium">
                        Ast
                      </TableHead>
                      <TableHead className="text-right text-[#6a6a6a] dark:text-[#a3a3a3] text-xs font-medium">
                        Win%
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.topScorers.map((entry, index) => (
                      <TableRow
                        key={entry.player.number}
                        className="dark:border-[#2e2e2e]"
                      >
                        <TableCell className="font-medium text-[#222222] dark:text-[#f5f5f5] text-sm">
                          {RANK_EMOJI[index] ?? `#${index + 1}`}{' '}
                          {entry.player?.name || `#${entry.player?.number}`}
                        </TableCell>
                        <TableCell className="text-center text-[#222222] dark:text-[#f5f5f5] text-sm">
                          {entry.stats.goal}
                        </TableCell>
                        <TableCell className="text-center text-[#222222] dark:text-[#f5f5f5] text-sm">
                          {entry.stats.assist}
                        </TableCell>
                        <TableCell className="text-right text-[#222222] dark:text-[#f5f5f5] text-sm">
                          {(entry.stats.winrate * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-[#6a6a6a] dark:text-[#a3a3a3] text-sm py-6">
                No data yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
