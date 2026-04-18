'use client';

import { useState, useEffect } from 'react';
import { Match } from '@/types/match';
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
import { Plus, Pencil, Trash2, X, MapPin, DollarSign } from 'lucide-react';
import { MatchCardSkeleton, Skeleton } from '@/components/skeleton';

export default function MatchesPage() {
  const { canEdit } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    match_date: '',
    san: '',
    tiensan: '',
    home_score: '',
    away_score: '',
    notes: '',
  });

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getMatches();
      setMatches(
        data.sort(
          (a, b) =>
            new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
        )
      );
    } catch (error) {
      console.error('Failed to load matches:', error);
      alert('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createMatch({
        match_date: formData.match_date,
        san: formData.san || undefined,
        tiensan: formData.tiensan ? parseInt(formData.tiensan) : undefined,
        home_score: formData.home_score
          ? parseInt(formData.home_score)
          : undefined,
        away_score: formData.away_score
          ? parseInt(formData.away_score)
          : undefined,
        notes: formData.notes || undefined,
      });
      resetForm();
      loadMatches();
    } catch (error) {
      console.error('Failed to create match:', error);
      alert('Failed to create match');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;
    try {
      await apiClient.updateMatch(editingMatch.match_date, {
        san: formData.san || null,
        tiensan: formData.tiensan ? parseInt(formData.tiensan) : null,
        home_score: formData.home_score ? parseInt(formData.home_score) : null,
        away_score: formData.away_score ? parseInt(formData.away_score) : null,
        notes: formData.notes || null,
      });
      resetForm();
      loadMatches();
    } catch (error) {
      console.error('Failed to update match:', error);
      alert('Failed to update match');
    }
  };

  const handleDelete = async (date: string) => {
    if (!confirm('Are you sure you want to delete this match?')) return;
    try {
      await apiClient.deleteMatch(date);
      loadMatches();
    } catch (error) {
      console.error('Failed to delete match:', error);
      alert('Failed to delete match');
    }
  };

  const startEdit = (match: Match) => {
    setEditingMatch(match);
    setFormData({
      match_date: match.match_date,
      san: match.san || '',
      tiensan: match.tiensan?.toString() || '',
      home_score: match.home_score?.toString() || '',
      away_score: match.away_score?.toString() || '',
      notes: match.notes || '',
    });
    setIsCreating(false);
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditingMatch(null);
    setFormData({
      match_date: new Date().toISOString().split('T')[0],
      san: '',
      tiensan: '',
      home_score: '',
      away_score: '',
      notes: '',
    });
  };

  const resetForm = () => {
    setIsCreating(false);
    setEditingMatch(null);
    setFormData({
      match_date: '',
      san: '',
      tiensan: '',
      home_score: '',
      away_score: '',
      notes: '',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-56 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <MatchCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#222222] dark:text-[#f5f5f5] tracking-tight">
            Matches
          </h1>
          <p className="text-[#6a6a6a] dark:text-[#a3a3a3] mt-1 text-sm">
            {canEdit
              ? 'View and manage match records'
              : 'View match records (read-only)'}
          </p>
        </div>
        {canEdit && !isCreating && !editingMatch && (
          <Button
            onClick={startCreate}
            className="rounded-airbnb bg-[#222222] dark:bg-[#ff385c] hover:bg-[#333] dark:hover:bg-[#e00b41] text-white w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Match
          </Button>
        )}
      </div>

      {/* Create / Edit form */}
      {canEdit && (isCreating || editingMatch) && (
        <Card className="dark:bg-[#1c1c1e] dark:border-[#2e2e2e] shadow-airbnb-card">
          <CardHeader>
            <CardTitle className="dark:text-[#f5f5f5]">
              {isCreating ? 'Create New Match' : 'Edit Match'}
            </CardTitle>
            <CardDescription className="dark:text-[#a3a3a3]">
              {isCreating
                ? 'Add a new match record'
                : `Editing match on ${editingMatch?.match_date}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={isCreating ? handleCreate : handleUpdate}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-[#f5f5f5]" htmlFor="match_date">
                    Match Date *
                  </Label>
                  <Input
                    id="match_date"
                    type="date"
                    value={formData.match_date}
                    onChange={e =>
                      setFormData({ ...formData, match_date: e.target.value })
                    }
                    required
                    disabled={!!editingMatch}
                    className="rounded-airbnb dark:bg-[#111111] dark:border-[#2e2e2e] dark:text-[#f5f5f5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-[#f5f5f5]" htmlFor="san">
                    Field/Location
                  </Label>
                  <Input
                    id="san"
                    value={formData.san}
                    onChange={e =>
                      setFormData({ ...formData, san: e.target.value })
                    }
                    className="rounded-airbnb dark:bg-[#111111] dark:border-[#2e2e2e] dark:text-[#f5f5f5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-[#f5f5f5]" htmlFor="tiensan">
                    Field Fee (₫)
                  </Label>
                  <Input
                    id="tiensan"
                    type="number"
                    value={formData.tiensan}
                    onChange={e =>
                      setFormData({ ...formData, tiensan: e.target.value })
                    }
                    className="rounded-airbnb dark:bg-[#111111] dark:border-[#2e2e2e] dark:text-[#f5f5f5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-[#f5f5f5]" htmlFor="home_score">
                    Home Score
                  </Label>
                  <Input
                    id="home_score"
                    type="number"
                    value={formData.home_score}
                    onChange={e =>
                      setFormData({ ...formData, home_score: e.target.value })
                    }
                    className="rounded-airbnb dark:bg-[#111111] dark:border-[#2e2e2e] dark:text-[#f5f5f5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-[#f5f5f5]" htmlFor="away_score">
                    Away Score
                  </Label>
                  <Input
                    id="away_score"
                    type="number"
                    value={formData.away_score}
                    onChange={e =>
                      setFormData({ ...formData, away_score: e.target.value })
                    }
                    className="rounded-airbnb dark:bg-[#111111] dark:border-[#2e2e2e] dark:text-[#f5f5f5]"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <Label className="dark:text-[#f5f5f5]" htmlFor="notes">
                    Notes
                  </Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={e =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="rounded-airbnb dark:bg-[#111111] dark:border-[#2e2e2e] dark:text-[#f5f5f5]"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="rounded-airbnb bg-[#222222] dark:bg-[#ff385c] hover:bg-[#333] dark:hover:bg-[#e00b41] text-white"
                >
                  {isCreating ? 'Create' : 'Update'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
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
          All Matches ({matches.length})
        </p>
        {matches.length === 0 ? (
          <div className="bg-white dark:bg-[#1c1c1e] rounded-card shadow-airbnb-card p-8 text-center text-[#6a6a6a] dark:text-[#a3a3a3] text-sm">
            No matches yet
          </div>
        ) : (
          matches.map(match => (
            <div
              key={match.id}
              className="bg-white dark:bg-[#1c1c1e] rounded-card shadow-airbnb-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Date + Score */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="font-semibold text-[#222222] dark:text-[#f5f5f5] text-sm"
                      suppressHydrationWarning
                    >
                      📅{' '}
                      {new Date(match.match_date).toLocaleDateString('vi-VN')}
                    </span>
                    {match.home_score !== null &&
                    match.away_score !== null ? (
                      <span className="font-bold text-[#ff385c] text-sm">
                        {match.home_score} – {match.away_score}
                      </span>
                    ) : (
                      <span className="text-xs text-[#c1c1c1] dark:text-[#5a5a5a]">
                        No score
                      </span>
                    )}
                  </div>
                  {/* Location */}
                  {match.san && (
                    <p className="text-xs text-[#6a6a6a] dark:text-[#a3a3a3] flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {match.san}
                    </p>
                  )}
                  {/* Fee */}
                  {match.tiensan && (
                    <p className="text-xs text-[#6a6a6a] dark:text-[#a3a3a3] flex items-center gap-1">
                      <DollarSign className="w-3 h-3 flex-shrink-0" />
                      {match.tiensan.toLocaleString()}₫
                    </p>
                  )}
                  {/* Notes */}
                  {match.notes && (
                    <p className="text-xs text-[#c1c1c1] dark:text-[#5a5a5a] truncate">
                      {match.notes}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(match)}
                      className="rounded-airbnb dark:border-[#2e2e2e] dark:text-[#f5f5f5] dark:hover:bg-[#2a2a2a] w-8 h-8 p-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(match.match_date)}
                      className="rounded-airbnb w-8 h-8 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Desktop: Data table (≥ md) ──────────────────── */}
      <Card className="hidden md:block dark:bg-[#1c1c1e] dark:border-[#2e2e2e] shadow-airbnb-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-[#222222] dark:text-[#f5f5f5]">
            All Matches ({matches.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="dark:border-[#2e2e2e]">
                <TableHead className="dark:text-[#a3a3a3]">Date</TableHead>
                <TableHead className="dark:text-[#a3a3a3]">Location</TableHead>
                <TableHead className="dark:text-[#a3a3a3]">Score</TableHead>
                <TableHead className="dark:text-[#a3a3a3]">Field Fee</TableHead>
                <TableHead className="dark:text-[#a3a3a3]">Notes</TableHead>
                {canEdit && (
                  <TableHead className="text-right dark:text-[#a3a3a3]">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map(match => (
                <TableRow
                  key={match.id}
                  className="dark:border-[#2e2e2e]"
                >
                  <TableCell
                    className="font-medium text-[#222222] dark:text-[#f5f5f5]"
                    suppressHydrationWarning
                  >
                    {new Date(match.match_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-[#6a6a6a] dark:text-[#a3a3a3]">
                    {match.san || '—'}
                  </TableCell>
                  <TableCell className="font-medium text-[#222222] dark:text-[#f5f5f5]">
                    {match.home_score !== null && match.away_score !== null
                      ? `${match.home_score} – ${match.away_score}`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-[#6a6a6a] dark:text-[#a3a3a3]">
                    {match.tiensan
                      ? `${match.tiensan.toLocaleString()}₫`
                      : '—'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-[#6a6a6a] dark:text-[#a3a3a3]">
                    {match.notes || '—'}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(match)}
                          className="rounded-airbnb dark:border-[#2e2e2e] dark:text-[#f5f5f5] dark:hover:bg-[#2a2a2a]"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(match.match_date)}
                          className="rounded-airbnb"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
