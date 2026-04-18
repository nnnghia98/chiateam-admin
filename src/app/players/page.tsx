'use client';

import { useState, useEffect } from 'react';
import { Player } from '@/types/player';
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
import { Plus, Pencil, Trash2, X, Hash, User, AtSign } from 'lucide-react';
import { PlayerCardSkeleton, Skeleton } from '@/components/skeleton';

export default function PlayersPage() {
  const { canEdit } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    username: '',
  });

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getPlayers();
      setPlayers(data.sort((a, b) => a.number - b.number));
    } catch (error) {
      console.error('Failed to load players:', error);
      alert('Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createPlayer({
        name: formData.name,
        number: parseInt(formData.number),
        username: formData.username || undefined,
      });
      setFormData({ name: '', number: '', username: '' });
      setIsCreating(false);
      loadPlayers();
    } catch (error) {
      console.error('Failed to create player:', error);
      alert('Failed to create player');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    try {
      await apiClient.updatePlayer(editingPlayer.number, {
        name: formData.name,
        username: formData.username || null,
      });
      setEditingPlayer(null);
      setFormData({ name: '', number: '', username: '' });
      loadPlayers();
    } catch (error) {
      console.error('Failed to update player:', error);
      alert('Failed to update player');
    }
  };

  const handleDelete = async (number: number) => {
    if (!confirm('Are you sure you want to delete this player?')) return;
    try {
      await apiClient.deletePlayer(number);
      loadPlayers();
    } catch (error) {
      console.error('Failed to delete player:', error);
      alert('Failed to delete player');
    }
  };

  const startEdit = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      number: player.number.toString(),
      username: player.username || '',
    });
    setIsCreating(false);
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditingPlayer(null);
    setFormData({ name: '', number: '', username: '' });
  };

  const cancelForm = () => {
    setIsCreating(false);
    setEditingPlayer(null);
    setFormData({ name: '', number: '', username: '' });
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
            <PlayerCardSkeleton key={i} />
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
            Players
          </h1>
          <p className="text-[#6a6a6a] dark:text-[#a3a3a3] mt-1 text-sm">
            {canEdit
              ? 'View and manage registered players'
              : 'View registered players (read-only)'}
          </p>
        </div>
        {canEdit && !isCreating && !editingPlayer && (
          <Button
            onClick={startCreate}
            className="rounded-airbnb bg-[#222222] dark:bg-[#ff385c] hover:bg-[#333] dark:hover:bg-[#e00b41] text-white w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Player
          </Button>
        )}
      </div>

      {/* Create / Edit form */}
      {canEdit && (isCreating || editingPlayer) && (
        <Card className="dark:bg-[#1c1c1e] dark:border-[#2e2e2e] shadow-airbnb-card">
          <CardHeader>
            <CardTitle className="dark:text-[#f5f5f5]">
              {isCreating ? 'Create New Player' : 'Edit Player'}
            </CardTitle>
            <CardDescription className="dark:text-[#a3a3a3]">
              {isCreating
                ? 'Add a new player to the system'
                : `Editing player #${editingPlayer?.number}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={isCreating ? handleCreate : handleUpdate}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="dark:text-[#f5f5f5]"
                  >
                    Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="rounded-airbnb dark:bg-[#111111] dark:border-[#2e2e2e] dark:text-[#f5f5f5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="number"
                    className="dark:text-[#f5f5f5]"
                  >
                    Number *
                  </Label>
                  <Input
                    id="number"
                    type="number"
                    value={formData.number}
                    onChange={e =>
                      setFormData({ ...formData, number: e.target.value })
                    }
                    required
                    disabled={!!editingPlayer}
                    className="rounded-airbnb dark:bg-[#111111] dark:border-[#2e2e2e] dark:text-[#f5f5f5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="username"
                    className="dark:text-[#f5f5f5]"
                  >
                    Username
                  </Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={e =>
                      setFormData({ ...formData, username: e.target.value })
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
                  onClick={cancelForm}
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
          All Players ({players.length})
        </p>
        {players.length === 0 ? (
          <div className="bg-white dark:bg-[#1c1c1e] rounded-card shadow-airbnb-card p-8 text-center text-[#6a6a6a] dark:text-[#a3a3a3] text-sm">
            No players yet
          </div>
        ) : (
          players.map(player => (
            <div
              key={player.id}
              className="bg-white dark:bg-[#1c1c1e] rounded-card shadow-airbnb-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 bg-[#f2f2f2] dark:bg-[#2a2a2a] px-2 py-0.5 rounded-badge text-xs font-semibold text-[#222222] dark:text-[#f5f5f5]">
                      <Hash className="w-3 h-3" />
                      {player.number}
                    </span>
                    <span className="font-semibold text-[#222222] dark:text-[#f5f5f5] text-sm truncate">
                      {player.name}
                    </span>
                  </div>
                  {player.username && (
                    <p className="text-xs text-[#6a6a6a] dark:text-[#a3a3a3] flex items-center gap-1">
                      <AtSign className="w-3 h-3" />
                      {player.username}
                    </p>
                  )}
                  <p className="text-xs text-[#c1c1c1] dark:text-[#5a5a5a] mt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      ID {player.user_id} ·{' '}
                      <span suppressHydrationWarning>
                        {new Date(player.created_at).toLocaleDateString()}
                      </span>
                    </span>
                  </p>
                </div>
                {canEdit && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(player)}
                      className="rounded-airbnb dark:border-[#2e2e2e] dark:text-[#f5f5f5] dark:hover:bg-[#2a2a2a] w-8 h-8 p-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(player.number)}
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
            All Players ({players.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="dark:border-[#2e2e2e]">
                <TableHead className="dark:text-[#a3a3a3]">Number</TableHead>
                <TableHead className="dark:text-[#a3a3a3]">Name</TableHead>
                <TableHead className="dark:text-[#a3a3a3]">Username</TableHead>
                <TableHead className="dark:text-[#a3a3a3]">User ID</TableHead>
                <TableHead className="dark:text-[#a3a3a3]">Created</TableHead>
                {canEdit && (
                  <TableHead className="text-right dark:text-[#a3a3a3]">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map(player => (
                <TableRow
                  key={player.id}
                  className="dark:border-[#2e2e2e]"
                >
                  <TableCell className="font-medium text-[#222222] dark:text-[#f5f5f5]">
                    #{player.number}
                  </TableCell>
                  <TableCell className="text-[#222222] dark:text-[#f5f5f5]">
                    {player.name}
                  </TableCell>
                  <TableCell className="text-[#6a6a6a] dark:text-[#a3a3a3]">
                    {player.username || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-[#6a6a6a] dark:text-[#a3a3a3]">
                    {player.user_id}
                  </TableCell>
                  <TableCell
                    className="text-sm text-[#6a6a6a] dark:text-[#a3a3a3]"
                    suppressHydrationWarning
                  >
                    {new Date(player.created_at).toLocaleDateString()}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(player)}
                          className="rounded-airbnb dark:border-[#2e2e2e] dark:text-[#f5f5f5] dark:hover:bg-[#2a2a2a]"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(player.number)}
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
