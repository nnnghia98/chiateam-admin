import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiAuthToken, getSessionFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

const API_URL = process.env.API_INTERNAL_URL;
const PLAYER_LIST_FIELDS = [
  'bench',
  'teamA',
  'teamB',
  'team3A',
  'team3B',
  'team3C',
] as const;
const BOT_STORAGE_STATIC_FIELDS = [
  'tiensan',
  'tiennuoc',
  'teamThua',
  'activeVote',
] as const;
const BOT_STORAGE_FIELDS = new Set<string>([
  ...PLAYER_LIST_FIELDS,
  ...BOT_STORAGE_STATIC_FIELDS,
]);

type ProxyRouteContext = {
  params: Promise<{ path: string[] }>;
};
type NormalizedPlayerEntry = {
  key: string;
  name: string;
  metadata: string;
};

function buildApiUrl(request: NextRequest, path: string[]) {
  const normalizedPath = [...path];
  const baseUrl = API_URL?.replace(/\/+$/, '') || '';

  // Avoid duplicate "/api/api/..." when API_INTERNAL_URL already ends with "/api".
  const basePathSegments = baseUrl
    .replace(/^https?:\/\/[^/]+/i, '')
    .split('/')
    .filter(Boolean);
  const baseLastSegment = basePathSegments[basePathSegments.length - 1];

  if (
    baseLastSegment &&
    normalizedPath[0] &&
    baseLastSegment.toLowerCase() === normalizedPath[0].toLowerCase()
  ) {
    normalizedPath.shift();
  }

  const joinedPath = normalizedPath.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const pathSuffix = joinedPath ? `/${joinedPath}` : '';
  return `${baseUrl}${pathSuffix}${searchParams ? `?${searchParams}` : ''}`;
}

function unauthorized() {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stableStringify(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (!isRecord(value) && !Array.isArray(value)) return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(',')}]`;
  }

  return `{${Object.entries(value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(',')}}`;
}

function isBotStorageSavePath(path: string[]) {
  const normalized = path.map(segment => segment.toLowerCase());
  const last = normalized[normalized.length - 1];
  const previous = normalized[normalized.length - 2];
  return last === 'bot-storage' && (normalized.length === 1 || previous === 'api');
}

function isPlayerUpdatePath(path: string[]) {
  const normalized = path.map(segment => segment.toLowerCase());
  const playersIndex = normalized.lastIndexOf('players');
  return playersIndex >= 0 && playersIndex === normalized.length - 2;
}

function isWorldCupMemberPredictionPath(path: string[]) {
  const normalized = path.map(segment => segment.toLowerCase());
  const worldCupIndex = normalized.lastIndexOf('world-cup-predictions');
  return (
    worldCupIndex >= 0 &&
    normalized[worldCupIndex + 1] === 'member' &&
    Boolean(normalized[worldCupIndex + 2])
  );
}

function isWorldCupMemberKeyPath(path: string[]) {
  const normalized = path.map(segment => segment.toLowerCase());
  const worldCupIndex = normalized.lastIndexOf('world-cup-predictions');
  return worldCupIndex >= 0 && normalized[worldCupIndex + 1] === 'member-keys';
}

function normalizeAvatarValue(value: unknown) {
  if (value == null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizePlayerEntry(entry: unknown): NormalizedPlayerEntry | null {
  if (!Array.isArray(entry) || entry.length < 2) return null;

  const [rawKey, rawValue] = entry;
  let name: string;
  let metadata: Record<string, unknown> = {};

  if (isRecord(rawValue)) {
    const { name: rawName, ...rest } = rawValue;
    if (rawName == null) {
      name = String(rawKey);
    } else if (typeof rawName === 'string' || typeof rawName === 'number') {
      name = String(rawName);
    } else {
      return null;
    }
    metadata = rest;
  } else if (rawValue == null) {
    name = String(rawKey);
  } else if (typeof rawValue === 'string' || typeof rawValue === 'number') {
    name = String(rawValue);
  } else {
    return null;
  }

  return {
    key: String(rawKey),
    name,
    metadata: stableStringify(metadata),
  };
}

function normalizePlayerList(
  storage: Record<string, unknown>,
  field: (typeof PLAYER_LIST_FIELDS)[number]
): NormalizedPlayerEntry[] | null {
  const entries = storage[field] ?? [];
  if (!Array.isArray(entries)) return null;

  const normalized: NormalizedPlayerEntry[] = [];
  for (const entry of entries) {
    const player = normalizePlayerEntry(entry);
    if (!player) return null;
    normalized.push(player);
  }

  return normalized;
}

function botStorageOnlyRenamesPlayers(
  current: Record<string, unknown>,
  requested: Record<string, unknown>
) {
  if (Object.keys(requested).some(key => !BOT_STORAGE_FIELDS.has(key))) {
    return false;
  }

  const currentStatic = Object.fromEntries(
    BOT_STORAGE_STATIC_FIELDS.map(field => [
      field,
      field === 'teamThua'
        ? (current[field] ?? null)
        : field === 'activeVote'
          ? (current[field] ?? null)
          : (current[field] ?? 0),
    ])
  );
  const requestedStatic = Object.fromEntries(
    BOT_STORAGE_STATIC_FIELDS.map(field => [
      field,
      field === 'teamThua'
        ? (requested[field] ?? null)
        : field === 'activeVote'
          ? (requested[field] ?? null)
          : (requested[field] ?? 0),
    ])
  );

  if (stableStringify(currentStatic) !== stableStringify(requestedStatic)) {
    return false;
  }

  return PLAYER_LIST_FIELDS.every(field => {
    const currentPlayers = normalizePlayerList(current, field);
    const requestedPlayers = normalizePlayerList(requested, field);
    if (!currentPlayers || !requestedPlayers) return false;
    if (currentPlayers.length !== requestedPlayers.length) return false;

    return currentPlayers.every((player, index) => {
      const requestedPlayer = requestedPlayers[index];
      return (
        requestedPlayer &&
        requestedPlayer.name.trim().length > 0 &&
        player.key === requestedPlayer.key
      );
    });
  });
}

function withPlayerEntryName(entry: unknown, name: string) {
  if (!Array.isArray(entry) || entry.length < 2) return null;

  const [rawKey, rawValue] = entry;
  if (isRecord(rawValue)) {
    return [rawKey, { ...rawValue, name }];
  }

  return [rawKey, name];
}

function mergeBotStoragePlayerNames(
  current: Record<string, unknown>,
  requested: Record<string, unknown>
) {
  const merged = Object.fromEntries(
    BOT_STORAGE_STATIC_FIELDS.map(field => [
      field,
      field === 'teamThua'
        ? (current[field] ?? null)
        : field === 'activeVote'
          ? (current[field] ?? null)
          : (current[field] ?? 0),
    ])
  );

  for (const field of PLAYER_LIST_FIELDS) {
    const currentEntries = current[field] ?? [];
    const requestedPlayers = normalizePlayerList(requested, field);
    if (!Array.isArray(currentEntries) || !requestedPlayers) return null;

    const mergedEntries = currentEntries.map((entry, index) =>
      withPlayerEntryName(entry, requestedPlayers[index].name)
    );
    if (mergedEntries.some(entry => entry === null)) return null;

    merged[field] = mergedEntries;
  }

  return merged;
}

async function getViewerBotStorageRenameBody(
  request: NextRequest,
  path: string[],
  rawBody?: string
) {
  if (!rawBody || !isBotStorageSavePath(path)) return null;

  let requested: unknown;
  try {
    requested = JSON.parse(rawBody);
  } catch {
    return null;
  }

  if (!isRecord(requested)) return null;

  try {
    const response = await fetch(buildApiUrl(request, path), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Api-Auth': getInternalApiAuthToken(),
        'X-Admin-Role': 'viewer',
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const current: unknown = await response.json();
    if (!isRecord(current) || !botStorageOnlyRenamesPlayers(current, requested)) {
      return null;
    }

    const merged = mergeBotStoragePlayerNames(current, requested);
    return merged ? JSON.stringify(merged) : null;
  } catch (error) {
    console.error('Bot storage viewer rename validation failed:', error);
    return null;
  }
}

function getViewerPlayerAvatarBody(path: string[], rawBody?: string) {
  if (!rawBody || !isPlayerUpdatePath(path)) return null;

  let requested: unknown;
  try {
    requested = JSON.parse(rawBody);
  } catch {
    return null;
  }

  if (!isRecord(requested)) return null;

  const keys = Object.keys(requested);
  if (keys.length !== 1 || keys[0] !== 'avatar') return null;

  const avatar = normalizeAvatarValue(requested.avatar);
  return avatar === undefined ? null : JSON.stringify({ avatar });
}

async function proxyJsonRequest(
  request: NextRequest,
  path: string[],
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
) {
  const session = getSessionFromRequest(request);
  const allowPublicMemberPrediction =
    isWorldCupMemberPredictionPath(path) && (method === 'GET' || method === 'PUT');
  const allowPublicWorldCupMemberKeys = isWorldCupMemberKeyPath(path);
  const shouldSendTrustedAdminHeaders =
    !allowPublicMemberPrediction &&
    (!allowPublicWorldCupMemberKeys || Boolean(session));

  if (!session && !allowPublicMemberPrediction && !allowPublicWorldCupMemberKeys) {
    return unauthorized();
  }

  let rawBody: string | undefined;
  if (method === 'POST' || method === 'PUT') {
    rawBody = await request.text();
  }

  const viewerRenameBody =
    session?.role === 'viewer' && method === 'POST'
      ? await getViewerBotStorageRenameBody(request, path, rawBody)
      : null;
  const viewerAvatarBody =
    session?.role === 'viewer' && method === 'PUT'
      ? getViewerPlayerAvatarBody(path, rawBody)
      : null;
  const viewerEscalatedBody = viewerRenameBody ?? viewerAvatarBody;
  const allowViewerMutation = viewerEscalatedBody !== null;

  if (
    method !== 'GET' &&
    session?.role !== 'admin' &&
    !allowPublicMemberPrediction &&
    !allowPublicWorldCupMemberKeys
  ) {
    if (!allowViewerMutation) {
      return forbidden();
    }
  }

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(shouldSendTrustedAdminHeaders
        ? {
            'X-Internal-Api-Auth': getInternalApiAuthToken(),
            'X-Admin-Role':
              allowViewerMutation || session?.role === 'admin' ? 'admin' : 'viewer',
          }
        : {}),
    },
    cache: 'no-store',
  };

  if (allowViewerMutation) {
    init.body = viewerEscalatedBody;
  } else if ((method === 'POST' || method === 'PUT') && rawBody) {
    init.body = rawBody;
  }

  try {
    const response = await fetch(buildApiUrl(request, path), init);
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { 'Content-Type': contentType || 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to reach API service' },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: ProxyRouteContext) {
  const { path } = await context.params;
  return proxyJsonRequest(request, path, 'GET');
}

export async function POST(request: NextRequest, context: ProxyRouteContext) {
  const { path } = await context.params;
  return proxyJsonRequest(request, path, 'POST');
}

export async function PUT(request: NextRequest, context: ProxyRouteContext) {
  const { path } = await context.params;
  return proxyJsonRequest(request, path, 'PUT');
}

export async function DELETE(request: NextRequest, context: ProxyRouteContext) {
  const { path } = await context.params;
  return proxyJsonRequest(request, path, 'DELETE');
}
