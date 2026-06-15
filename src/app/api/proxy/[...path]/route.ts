import { NextRequest, NextResponse } from 'next/server';
import worldCupData from '@/data/world-cup-2026.json';
import { getInternalApiAuthToken, getSessionFromRequest } from '@/lib/auth';
import { worldCupMatchStartTime } from '@/lib/world-cup-time';

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

type RawWorldCupScheduleMatch = {
  num?: number;
  date: string;
  time: string;
};

const VIETNAM_OFFSET_HOURS = 7;

function parseScheduleKickoff(date: string, time: string) {
  const dateParts = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeParts = time.match(/^(\d{1,2}):(\d{2})\s+UTC([+-]\d{1,2})$/);

  if (!dateParts || !timeParts) return null;

  const [, year, month, day] = dateParts;
  const [, hour, minute, offset] = timeParts;
  const timestamp = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour) - Number(offset) + VIETNAM_OFFSET_HOURS,
    Number(minute)
  );

  return Number.isNaN(timestamp) ? null : timestamp;
}

const worldCupScheduleStartById = new Map(
  (worldCupData.matches as RawWorldCupScheduleMatch[]).flatMap((match, index) => {
    const timestamp = parseScheduleKickoff(match.date, match.time);
    const matchId = String(match.num ?? index + 1);
    return timestamp === null ? [] : [[matchId, timestamp] as const];
  })
);

function buildApiUrl(request: NextRequest, path: string[], excludedSearchParams: string[] = []) {
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
  const searchParams = new URLSearchParams(request.nextUrl.searchParams);
  excludedSearchParams.forEach(param => searchParams.delete(param));
  const search = searchParams.toString();
  const pathSuffix = joinedPath ? `/${joinedPath}` : '';
  return `${baseUrl}${pathSuffix}${search ? `?${search}` : ''}`;
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

function getWorldCupMemberPredictionKey(path: string[]) {
  const normalized = path.map(segment => segment.toLowerCase());
  const worldCupIndex = normalized.lastIndexOf('world-cup-predictions');
  if (
    worldCupIndex < 0 ||
    normalized[worldCupIndex + 1] !== 'member' ||
    !path[worldCupIndex + 2]
  ) {
    return '';
  }

  return path[worldCupIndex + 2];
}

function isWorldCupOverviewPath(path: string[]) {
  const normalized = path.map(segment => segment.toLowerCase());
  const worldCupIndex = normalized.lastIndexOf('world-cup-predictions');
  return worldCupIndex >= 0 && worldCupIndex === normalized.length - 1;
}

function isWorldCupMemberKeyPath(path: string[]) {
  const normalized = path.map(segment => segment.toLowerCase());
  const worldCupIndex = normalized.lastIndexOf('world-cup-predictions');
  return worldCupIndex >= 0 && normalized[worldCupIndex + 1] === 'member-keys';
}

function getMemberOverviewKey(request: NextRequest) {
  return request.nextUrl.searchParams.get('memberKey')?.trim() || '';
}

function hasPredictionValue(entry: Record<string, unknown>) {
  return (
    entry.value === 0 ||
    entry.value === 1 ||
    entry.value === 2 ||
    entry.value === '0' ||
    entry.value === '1' ||
    entry.value === '2' ||
    entry.prediction === 0 ||
    entry.prediction === 1 ||
    entry.prediction === 2 ||
    entry.prediction === '0' ||
    entry.prediction === '1' ||
    entry.prediction === '2'
  );
}

function shouldRevealWorldCupPredictions(match: Record<string, unknown>) {
  const matchId = String(match.id ?? match.matchNumber ?? '');
  const start =
    worldCupScheduleStartById.get(matchId) ?? worldCupMatchStartTime(match as any);
  return start !== null && Date.now() >= start;
}

function buildWorldCupMemberValidationUrl(request: NextRequest, path: string[], key: string) {
  const worldCupIndex = path
    .map(segment => segment.toLowerCase())
    .lastIndexOf('world-cup-predictions');
  const validationPath = [
    ...path.slice(0, worldCupIndex + 1),
    'member',
    encodeURIComponent(key),
  ];
  return buildApiUrl(request, validationPath, ['memberKey']);
}

function censorWorldCupOverview(data: unknown) {
  if (!isRecord(data)) return data;

  const rawMatches = data.matches;
  const matches = Array.isArray(rawMatches)
    ? rawMatches
    : isRecord(rawMatches)
      ? Object.values(rawMatches)
      : [];
  const censoredMatchIds = new Set(
    matches
      .filter(match => isRecord(match) && !shouldRevealWorldCupPredictions(match))
      .map(match => String((match as { id?: unknown; matchNumber?: unknown }).id ?? (match as { matchNumber?: unknown }).matchNumber ?? ''))
      .filter(Boolean)
  );
  const predictions = isRecord(data.predictions)
    ? data.predictions
    : isRecord(data.entries)
      ? data.entries
      : null;

  if (!predictions || censoredMatchIds.size === 0) return data;

  const censoredPredictions = Object.fromEntries(
    Object.entries(predictions).map(([outerId, inner]) => {
      if (!isRecord(inner)) return [outerId, inner];

      const outerIsMatch = censoredMatchIds.has(outerId);
      return [
        outerId,
        Object.fromEntries(
          Object.entries(inner).map(([innerId, entry]) => {
            const shouldCensor = outerIsMatch || censoredMatchIds.has(innerId);
            if (!shouldCensor || !isRecord(entry) || !hasPredictionValue(entry)) {
              return [innerId, entry];
            }
            return [
              innerId,
              {
                ...entry,
                prediction: '***',
                value: '***',
                censored: true,
              },
            ];
          })
        ),
      ];
    })
  );

  return {
    ...data,
    ...(isRecord(data.predictions) ? { predictions: censoredPredictions } : {}),
    ...(isRecord(data.entries) ? { entries: censoredPredictions } : {}),
  };
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
  const publicMemberPredictionKey = allowPublicMemberPrediction && method === 'PUT'
    ? getWorldCupMemberPredictionKey(path)
    : '';
  const memberOverviewKey = method === 'GET' && isWorldCupOverviewPath(path)
    ? getMemberOverviewKey(request)
    : '';
  const allowPublicWorldCupOverview = Boolean(memberOverviewKey);
  const allowPublicWorldCupMemberKeys = isWorldCupMemberKeyPath(path);
  const shouldSendTrustedAdminHeaders =
    (!allowPublicMemberPrediction || method === 'PUT') &&
    (!allowPublicWorldCupMemberKeys || Boolean(session));

  if (
    !session &&
    !allowPublicMemberPrediction &&
    !allowPublicWorldCupOverview &&
    !allowPublicWorldCupMemberKeys
  ) {
    return unauthorized();
  }

  if (allowPublicWorldCupOverview) {
    try {
      const validationResponse = await fetch(
        buildWorldCupMemberValidationUrl(request, path, memberOverviewKey),
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        }
      );

      if (!validationResponse.ok) {
        return unauthorized();
      }
    } catch (error) {
      console.error('World Cup member key validation failed:', error);
      return NextResponse.json(
        { error: 'Failed to reach API service' },
        { status: 502 }
      );
    }
  }

  if (publicMemberPredictionKey) {
    try {
      const validationResponse = await fetch(
        buildWorldCupMemberValidationUrl(request, path, publicMemberPredictionKey),
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        }
      );

      if (!validationResponse.ok) {
        return unauthorized();
      }
    } catch (error) {
      console.error('World Cup member key validation failed:', error);
      return NextResponse.json(
        { error: 'Failed to reach API service' },
        { status: 502 }
      );
    }
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
    !allowPublicWorldCupOverview &&
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
              allowViewerMutation || session?.role === 'admin' || publicMemberPredictionKey
                ? 'admin'
                : 'viewer',
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
      const data = allowPublicWorldCupOverview
        ? censorWorldCupOverview(await response.json())
        : await response.json();
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
