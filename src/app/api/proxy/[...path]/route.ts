import { NextRequest, NextResponse } from 'next/server';
import worldCupData from '@/data/world-cup-2026.json';
import { getInternalApiAuthToken, getSessionFromRequest } from '@/lib/auth';
import {
  botStorageOnlyRenamesPlayers,
  mergeBotStoragePlayerNames,
} from '@/lib/bot-storage';
import { worldCupMatchStartTime } from '@/lib/world-cup-time';

export const runtime = 'nodejs';

const API_URL = process.env.API_INTERNAL_URL;

type ProxyRouteContext = {
  params: Promise<{ path: string[] }>;
};

type RawWorldCupScheduleMatch = {
  num?: number;
  date: string;
  time: string;
};

const VIETNAM_OFFSET_HOURS = 7;
const VIETNAM_OFFSET_MS = VIETNAM_OFFSET_HOURS * 60 * 60 * 1000;

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
  const scheduleStart = worldCupScheduleStartById.get(matchId);
  if (scheduleStart !== undefined) {
    return Date.now() + VIETNAM_OFFSET_MS >= scheduleStart;
  }

  const start = worldCupMatchStartTime(match as any);
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
  const isMemberPredictionRequest =
    isWorldCupMemberPredictionPath(path) && (method === 'GET' || method === 'PUT');
  const memberPredictionKey = isMemberPredictionRequest && method === 'PUT'
    ? getWorldCupMemberPredictionKey(path)
    : '';
  const memberOverviewKey = method === 'GET' && isWorldCupOverviewPath(path)
    ? getMemberOverviewKey(request)
    : '';
  const isMemberWorldCupOverview = Boolean(memberOverviewKey);
  const isWorldCupMemberKeysRoute = isWorldCupMemberKeyPath(path);
  const shouldSendTrustedAdminHeaders =
    (!isMemberPredictionRequest || method === 'PUT') &&
    (!isWorldCupMemberKeysRoute || session?.role === 'admin');

  if (!session) {
    return unauthorized();
  }

  if (isWorldCupMemberKeysRoute && session.role !== 'admin') {
    return forbidden();
  }

  if (isMemberWorldCupOverview) {
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

  if (memberPredictionKey) {
    try {
      const validationResponse = await fetch(
        buildWorldCupMemberValidationUrl(request, path, memberPredictionKey),
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
    !isMemberPredictionRequest &&
    !isMemberWorldCupOverview
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
              allowViewerMutation || session?.role === 'admin' || memberPredictionKey
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
      const data = isMemberWorldCupOverview
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
