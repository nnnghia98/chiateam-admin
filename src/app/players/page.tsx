'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Hash,
  User,
  AtSign,
  Upload,
  Crop,
  RotateCcw,
} from 'lucide-react';
import { PlayerCardSkeleton, Skeleton } from '@/components/skeleton';

type AvatarCropState = {
  zoom: number;
  x: number;
  y: number;
};

const DEFAULT_AVATAR_CROP: AvatarCropState = {
  zoom: 1,
  x: 0,
  y: 0,
};
const AVATAR_OUTPUT_SIZE = 512;
const AVATAR_CROP_PREVIEW_SIZE = 224;
const MAX_AVATAR_UPLOAD_BYTES = 8 * 1024 * 1024;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load image'));
    image.src = src;
  });
}

function avatarBackgroundStyle(src: string): React.CSSProperties {
  return {
    backgroundImage: `url(${JSON.stringify(src)})`,
  };
}

async function cropAvatarImage(source: string, crop: AvatarCropState) {
  const image = await loadImage(source);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare avatar crop');

  const coverScale =
    Math.max(
      AVATAR_OUTPUT_SIZE / image.naturalWidth,
      AVATAR_OUTPUT_SIZE / image.naturalHeight
    ) * crop.zoom;
  const width = image.naturalWidth * coverScale;
  const height = image.naturalHeight * coverScale;
  const offsetScale = AVATAR_OUTPUT_SIZE / AVATAR_CROP_PREVIEW_SIZE;
  const x = (AVATAR_OUTPUT_SIZE - width) / 2 + crop.x * offsetScale;
  const y = (AVATAR_OUTPUT_SIZE - height) / 2 + crop.y * offsetScale;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
  context.drawImage(image, x, y, width, height);

  return canvas.toDataURL('image/jpeg', 0.86);
}

export default function PlayersPage() {
  const { canEdit, role } = useAuth();
  const canUpdateAvatar = role === 'admin' || role === 'viewer';
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    username: '',
    avatar: '',
  });
  const [avatarSource, setAvatarSource] = useState<string | null>(null);
  const [avatarCrop, setAvatarCrop] =
    useState<AvatarCropState>(DEFAULT_AVATAR_CROP);
  const [processingAvatar, setProcessingAvatar] = useState(false);
  const canShowPlayerForm =
    canEdit || Boolean(canUpdateAvatar && editingPlayer);

  const resetAvatarEditor = () => {
    setAvatarSource(null);
    setAvatarCrop(DEFAULT_AVATAR_CROP);
    setProcessingAvatar(false);
  };

  const resolveAvatarForSubmit = async () => {
    if (avatarSource) {
      return cropAvatarImage(avatarSource, avatarCrop);
    }

    return formData.avatar || null;
  };

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
      setProcessingAvatar(true);
      const avatar = await resolveAvatarForSubmit();
      await apiClient.createPlayer({
        name: formData.name,
        number: parseInt(formData.number),
        username: formData.username || undefined,
        avatar: avatar || undefined,
      });
      setFormData({ name: '', number: '', username: '', avatar: '' });
      resetAvatarEditor();
      setIsCreating(false);
      loadPlayers();
    } catch (error) {
      console.error('Failed to create player:', error);
      alert('Failed to create player');
    } finally {
      setProcessingAvatar(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    try {
      setProcessingAvatar(true);
      const avatar = await resolveAvatarForSubmit();
      const payload = canEdit
        ? {
            name: formData.name,
            username: formData.username || null,
            avatar,
          }
        : { avatar };

      await apiClient.updatePlayer(editingPlayer.number, payload);
      setEditingPlayer(null);
      setFormData({ name: '', number: '', username: '', avatar: '' });
      resetAvatarEditor();
      loadPlayers();
    } catch (error) {
      console.error('Failed to update player:', error);
      alert('Failed to update player');
    } finally {
      setProcessingAvatar(false);
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
    resetAvatarEditor();
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      number: player.number.toString(),
      username: player.username || '',
      avatar: player.avatar || '',
    });
    setIsCreating(false);
  };

  const startCreate = () => {
    resetAvatarEditor();
    setIsCreating(true);
    setEditingPlayer(null);
    setFormData({ name: '', number: '', username: '', avatar: '' });
  };

  const cancelForm = () => {
    resetAvatarEditor();
    setIsCreating(false);
    setEditingPlayer(null);
    setFormData({ name: '', number: '', username: '', avatar: '' });
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
      alert('Please upload an image smaller than 8MB.');
      return;
    }

    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      setAvatarSource(imageDataUrl);
      setAvatarCrop(DEFAULT_AVATAR_CROP);
    } catch (error) {
      console.error('Failed to read avatar image:', error);
      alert('Could not read avatar image');
    }
  };

  const applyAvatarCrop = async () => {
    if (!avatarSource) return;

    try {
      setProcessingAvatar(true);
      const avatar = await cropAvatarImage(avatarSource, avatarCrop);
      setFormData(prev => ({ ...prev, avatar }));
      resetAvatarEditor();
    } catch (error) {
      console.error('Failed to crop avatar image:', error);
      alert('Could not crop avatar image');
    } finally {
      setProcessingAvatar(false);
    }
  };

  const avatarInitials = (player: Pick<Player, 'name' | 'number'>) =>
    player.name
      .trim()
      .split(/\s+/)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || String(player.number);

  const renderAvatar = (
    player: Pick<Player, 'name' | 'number'> & { avatar?: string | null },
    sizeClass = 'h-10 w-10'
  ) => (
    <div
      role="img"
      aria-label={`${player.name} avatar`}
      style={
        player.avatar
          ? avatarBackgroundStyle(player.avatar)
          : undefined
      }
      className={`${sizeClass} flex-shrink-0 overflow-hidden rounded-full border border-design-border-soft bg-design-muted bg-cover bg-center text-design-secondary`}
    >
      {!player.avatar && (
        <div className="flex h-full w-full items-center justify-center text-xs font-black">
          {avatarInitials(player)}
        </div>
      )}
    </div>
  );

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
          <h1 className="text-2xl font-bold tracking-tight text-design-text sm:text-3xl">
            Players
          </h1>
          <p className="mt-1 text-sm text-design-secondary">
            {canEdit
              ? 'View and manage registered players'
              : canUpdateAvatar
                ? 'View players and update avatars'
                : 'View registered players (read-only)'}
          </p>
        </div>
        {canEdit && !isCreating && !editingPlayer && (
          <Button
            onClick={startCreate}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Player
          </Button>
        )}
      </div>

      {/* Create / Edit form */}
      {canShowPlayerForm && (isCreating || editingPlayer) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isCreating
                ? 'Create New Player'
                : canEdit
                  ? 'Edit Player'
                  : 'Update Avatar'}
            </CardTitle>
            <CardDescription>
              {isCreating
                ? 'Add a new player to the system'
                : canEdit
                  ? `Editing player #${editingPlayer?.number}`
                  : `Updating avatar for #${editingPlayer?.number}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={isCreating ? handleCreate : handleUpdate}
              className="space-y-4"
            >
              {canEdit && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={e =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number">
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">
                      Username
                    </Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={e =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
                <div className="space-y-2">
                  <Label>Preview</Label>
                  {renderAvatar(
                    {
                      name: formData.name || editingPlayer?.name || 'Player',
                      number: Number(
                        formData.number || editingPlayer?.number || 0
                      ),
                      avatar: formData.avatar.trim() || null,
                    },
                    'h-16 w-16'
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatar">
                    Avatar URL
                  </Label>
                  <Input
                    id="avatar"
                    type="url"
                    value={formData.avatar}
                    placeholder="https://example.com/avatar.jpg"
                    onChange={e =>
                      setFormData({ ...formData, avatar: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                >
                  {isCreating ? 'Create' : 'Update'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelForm}
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
        <p className="design-section-label">
          All Players ({players.length})
        </p>
        {players.length === 0 ? (
          <div className="design-surface p-8 text-center text-sm text-design-secondary">
            No players yet
          </div>
        ) : (
          players.map(player => (
            <div
              key={player.id}
              className="design-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {renderAvatar(player)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 rounded-badge bg-design-muted px-2 py-0.5 text-xs font-semibold text-design-text">
                        <Hash className="w-3 h-3" />
                        {player.number}
                      </span>
                      <span className="truncate text-sm font-semibold text-design-text">
                        {player.name}
                      </span>
                    </div>
                    {player.username && (
                      <p className="flex items-center gap-1 text-xs text-design-secondary">
                        <AtSign className="w-3 h-3" />
                        {player.username}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-design-secondary">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        ID {player.user_id} ·{' '}
                        <span suppressHydrationWarning>
                          {new Date(player.created_at).toLocaleDateString()}
                        </span>
                      </span>
                    </p>
                  </div>
                </div>
                {(canEdit || canUpdateAvatar) && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={
                        canEdit
                          ? `Edit ${player.name}`
                          : `Update avatar for ${player.name}`
                      }
                      onClick={() => startEdit(player)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {canEdit && (
                      <Button
                        variant="destructive"
                        size="sm"
                        aria-label={`Delete ${player.name}`}
                        onClick={() => handleDelete(player.number)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Desktop: Data table (≥ md) ──────────────────── */}
      <Card className="hidden md:block">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            All Players ({players.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Avatar</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Created</TableHead>
                {(canEdit || canUpdateAvatar) && (
                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map(player => (
                <TableRow
                  key={player.id}
                  className=""
                >
                  <TableCell>
                    {renderAvatar(player)}
                  </TableCell>
                  <TableCell className="font-medium">
                    #{player.number}
                  </TableCell>
                  <TableCell>
                    {player.name}
                  </TableCell>
                  <TableCell className="text-design-secondary">
                    {player.username || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-design-secondary">
                    {player.user_id}
                  </TableCell>
                  <TableCell
                    className="text-sm text-design-secondary"
                    suppressHydrationWarning
                  >
                    {new Date(player.created_at).toLocaleDateString()}
                  </TableCell>
                  {(canEdit || canUpdateAvatar) && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={
                            canEdit
                              ? `Edit ${player.name}`
                              : `Update avatar for ${player.name}`
                          }
                          onClick={() => startEdit(player)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {canEdit && (
                          <Button
                            variant="destructive"
                            size="sm"
                            aria-label={`Delete ${player.name}`}
                            onClick={() => handleDelete(player.number)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
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
