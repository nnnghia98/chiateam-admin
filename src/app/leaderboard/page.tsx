'use client';

import { useState, useEffect } from 'react';
import { LeaderboardEntry } from '@/types/leaderboard';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, X, Trophy } from 'lucide-react';
import {
  LeaderboardCardSkeleton,
  PodiumSkeleton,
  Skeleton,
} from '@/components/skeleton';

const RANK_EMOJI = ['🥇', '🥈', '🥉'];

function PodiumCard({
  entry,
  rank,
  height,
}: {
  entry: LeaderboardEntry;
  rank: number;
  height: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-2xl">{RANK_EMOJI[rank]}</div>
      <div
        className={`bg-white dark:bg-[#1c1c1e] rounded-card shadow-airbnb-card flex flex-col items-center justify-center p-3 w-24 sm:w-28 ${height}`}
        style={{
          borderTop: `3px solid ${rank === 0 ? '#fbbf24' : rank === 1 ? '#94a3b8' : '#f97316'}`,
        }}
      >
        <p className="font-bold text-[#222222] dark:text-[#f5f5f5] text-xs text-center leading-tight truncate w-full text-center">
          {entry.player?.name || `#${entry.player?.number}`}
        </p>
        <p className="text-[#ff385c] font-bold text-sm mt-1">
          {(entry.stats.winrate * 100).toFixed(0)}%
        </p>
        <p className="text-[10px] text-[#6a6a6a] dark:text-[#a3a3a3]">
          {entry.stats.goal}G · {entry.stats.assist}A
        </p>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { canEdit } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<LeaderboardEntry | null>(
    null
  );
  const [formData, setFormData] = useState({
    goal: '',
    assist: '',
    total_match: '',
    total_win: '',
    total_lose: '',
    total_draw: '',
  });

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getLeaderboard();
      setLeaderboard(data.sort((a, b) => b.stats.winrate - a.stats.winrate));
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      alert('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    try {
      await apiClient.updateLeaderboardEntry(editingEntry.player?.number, {
        goal: formData.goal ? parseInt(formData.goal) : undefined,
        assist: formData.assist ? parseInt(formData.assist) : undefined,
        total_match: formData.total_match
          ? parseInt(formData.total_match)
          : undefined,
        total_win: formData.total_win
          ? parseInt(formData.total_win)
          : undefined,
        total_lose: formData.total_lose
          ? parseInt(formData.total_lose)
          : undefined,
        total_draw: formData.total_draw
          ? parseInt(formData.total_draw)
          : undefined,
      });
      cancelEdit();
      loadLeaderboard();
    } catch (error) {
      console.error('Failed to update leaderboard entry:', error);
      alert('Failed to update leaderboard entry');
    }
  };

  const startEdit = (entry: LeaderboardEntry) => {
    setEditingEntry(entry);
    setFormData({
      goal: entry.stats.goal.toString(),
      assist: entry.stats.assist.toString(),
      total_match: entry.stats.total_match.toString(),
      total_win: entry.stats.total_win.toString(),
      total_lose: entry.stats.total_lose.toString(),
      total_draw: entry.stats.total_draw.toString(),
    });
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setFormData({
      goal: '',
      assist: '',
      total_match: '',
      total_win: '',
      total_lose: '',
      total_draw: '',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <PodiumSkeleton />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <LeaderboardCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#222222] dark:text-[#f5f5f5] tracking-tight">
          Leaderboard
        </h1>
        <p className="text-[#6a6a6a] dark:text-[#a3a3a3] mt-1 text-sm">
          {canEdit
            ? 'View and modify player statistics'
            : 'View player statistics (read-only)'}
        </p>
      </div>

      {/* Podium (always visible) */}
      {top3.length >= 2 && (
        <Card className="dark:bg-[#1c1c1e] dark:border-[#2e2e2e] shadow-airbnb-card">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-end justify-center gap-3 sm:gap-6">
              {/* 2nd place (left) */}
              {top3[1] && (
                <PodiumCard entry={top3[1]} rank={1} height="h-24 sm:h-28" />
              )}
              {/* 1st place (center, tallest) */}
              {top3[0] && (
                <PodiumCard entry={top3[0]} rank={0} height="h-32 sm:h-36" />
              )}
              {/* 3rd place (right) */}
              {top3[2] && (
                <PodiumCard entry={top3[2]} rank={2} height="h-20 sm:h-24" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit form */}
      {editingEntry && canEdit && (
        <Card className="dark:bg-[#1c1c1e] dark:border-[#2e2e2e] shadow-airbnb-card">
          <CardHeader>
            <CardTitle className="dark:text-[#f5f5f5]">
              Edit Player Stats
            </CardTitle>
            <CardDescription className="dark:text-[#a3a3a3]">
              Editing stats for player #{editingEntry.player.number}
              {editingEntry.player && ` — ${editingEntry.player.name}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { id: 'goal', label: 'Goals' },
                  { id: 'assist', label: 'Assists' },
                  { id: 'total_match', label: 'Matches' },
                  { id: 'total_win', label: 'Wins' },
                  { id: 'total_lose', label: 'Losses' },
                  { id: 'total_draw', label: 'Draws' },
                ].map(field => (
                  <div key={field.id} className="space-y-2">
                    <Label
                      htmlFor={field.id}
                      className="dark:text-[#f5f5f5]"
                    >
                      {field.label}
                    </Label>
                    <Input
                      id={field.id}
                      type="number"
                      value={formData[field.id as keyof typeof formData]}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          [field.id]: e.target.value,
                        })
                      }
                      className="rounded-airbnb dark:bg-[#111111] dark:border-[#2e2e2e] dark:text-[#f5f5f5]"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="rounded-airbnb bg-[#222222] dark:bg-[#ff385c] hover:bg-[#333] dark:hover:bg-[#e00b41] text-white"
                >
                  Update
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEdit}
                  className="rounded-airbnb dark:border-[#2e2e2e] dark:text-[#f5f5f5] dark:hover:bg-[#2a2a2a]"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Mobile: Card list (< md) ────────────────────── */}
      <div className="md:hidden space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#6a6a6a] dark:text-[#a3a3a3]">
          Full Rankings ({leaderboard.length} players)
        </p>
        {leaderboard.map((entry, index) => (
          <div
            key={entry.player.number}
            className="bg-white dark:bg-[#1c1c1e] rounded-card shadow-airbnb-card p-4"
          >
            <div className="flex items-center gap-3">
              {/* Rank badge */}
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#f2f2f2] dark:bg-[#2a2a2a] flex items-center justify-center">
                {index < 3 ? (
                  <span className="text-lg">{RANK_EMOJI[index]}</span>
                ) : (
                  <span className="text-xs font-bold text-[#6a6a6a] dark:text-[#a3a3a3]">
                    #{index + 1}
                  </span>
                )}
              </div>

              {/* Player info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#222222] dark:text-[#f5f5f5] text-sm truncate">
                    {entry.player?.name || `#${entry.player?.number}`}
                  </span>
                  <span className="font-bold text-[#ff385c] text-sm flex-shrink-0">
                    {(entry.stats.winrate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-[#6a6a6a] dark:text-[#a3a3a3]">
                  <span>{entry.stats.goal}G</span>
                  <span>{entry.stats.assist}A</span>
                  <span>{entry.stats.total_match} matches</span>
                  <span>
                    <span className="text-green-600 dark:text-green-400">
                      {entry.stats.total_win}W
                    </span>
                    /
                    <span className="text-red-600 dark:text-red-400">
                      {entry.stats.total_lose}L
                    </span>
                    /
                    <span>{entry.stats.total_draw}D</span>
                  </span>
                </div>
              </div>

              {/* Edit */}
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEdit(entry)}
                  className="rounded-airbnb dark:border-[#2e2e2e] dark:text-[#f5f5f5] dark:hover:bg-[#2a2a2a] w-8 h-8 p-0 flex-shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop: Data table (≥ md) ──────────────────── */}
      <Card className="hidden md:block dark:bg-[#1c1c1e] dark:border-[#2e2e2e] shadow-airbnb-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#222222] dark:text-[#f5f5f5]">
            <Trophy className="w-5 h-5" style={{ color: '#ff385c' }} />
            Leaderboard ({leaderboard.length} players)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="dark:border-[#2e2e2e]">
                <TableHead className="dark:text-[#a3a3a3]">Rank</TableHead>
                <TableHead className="dark:text-[#a3a3a3]">Player #</TableHead>
                <TableHead className="dark:text-[#a3a3a3]">Name</TableHead>
                <TableHead className="text-center dark:text-[#a3a3a3]">
                  Win Rate
                </TableHead>
                <TableHead className="text-center dark:text-[#a3a3a3]">
                  Goals
                </TableHead>
                <TableHead className="text-center dark:text-[#a3a3a3]">
                  Assists
                </TableHead>
                <TableHead className="text-center dark:text-[#a3a3a3]">
                  Matches
                </TableHead>
                <TableHead className="text-center dark:text-[#a3a3a3]">
                  W/L/D
                </TableHead>
                {canEdit && (
                  <TableHead className="text-right dark:text-[#a3a3a3]">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((entry, index) => (
                <TableRow
                  key={entry.player.number}
                  className="dark:border-[#2e2e2e]"
                >
                  <TableCell className="font-bold text-[#222222] dark:text-[#f5f5f5]">
                    {index < 3 ? (
                      RANK_EMOJI[index]
                    ) : (
                      <span className="text-[#6a6a6a] dark:text-[#a3a3a3]">
                        #{index + 1}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-[#222222] dark:text-[#f5f5f5]">
                    #{entry.player.number}
                  </TableCell>
                  <TableCell className="text-[#222222] dark:text-[#f5f5f5]">
                    {entry.player?.name || '—'}
                  </TableCell>
                  <TableCell className="text-center font-semibold text-[#ff385c]">
                    {(entry.stats.winrate * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-center text-[#222222] dark:text-[#f5f5f5]">
                    {entry.stats.goal}
                  </TableCell>
                  <TableCell className="text-center text-[#222222] dark:text-[#f5f5f5]">
                    {entry.stats.assist}
                  </TableCell>
                  <TableCell className="text-center text-[#222222] dark:text-[#f5f5f5]">
                    {entry.stats.total_match}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    <span className="text-green-600 dark:text-green-400">
                      {entry.stats.total_win}
                    </span>
                    /
                    <span className="text-red-600 dark:text-red-400">
                      {entry.stats.total_lose}
                    </span>
                    /
                    <span className="text-[#6a6a6a] dark:text-[#a3a3a3]">
                      {entry.stats.total_draw}
                    </span>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(entry)}
                        className="rounded-airbnb dark:border-[#2e2e2e] dark:text-[#f5f5f5] dark:hover:bg-[#2a2a2a]"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
