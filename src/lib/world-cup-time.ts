import type { WorldCupMatch, WorldCupMatchStatus } from '@/types/world-cup';

export type WorldCupEffectiveStatus = WorldCupMatchStatus | 'CLOSED';

const VIETNAM_UTC_OFFSET_HOURS = 7;
const PREDICTION_LOCK_MINUTES = 10;

function parseDateParts(date: string) {
  const value = date.trim();
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, year, month, day] = iso;
    return {
      year: Number(year),
      month: Number(month),
      day: Number(day),
    };
  }

  const vietnam = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (vietnam) {
    const [, day, month, year] = vietnam;
    return {
      year: Number(year),
      month: Number(month),
      day: Number(day),
    };
  }

  return null;
}

function parseTimeParts(time: string) {
  const value = time.trim();
  const parsed = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!parsed) return null;

  const [, hour, minute] = parsed;
  return {
    hour: Number(hour),
    minute: Number(minute),
  };
}

function vietnamTimeToTimestamp(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  const timestamp = Date.UTC(
    year,
    month - 1,
    day,
    hour - VIETNAM_UTC_OFFSET_HOURS,
    minute
  );

  return Number.isNaN(timestamp) ? null : timestamp;
}

export function worldCupMatchStartTime(match: WorldCupMatch) {
  const date = parseDateParts(String(match.date ?? ''));
  const time = parseTimeParts(String(match.time ?? ''));
  if (date && time) {
    return vietnamTimeToTimestamp(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute
    );
  }
  return null;
}

export function getWorldCupEffectiveStatus(
  match: WorldCupMatch,
  now = Date.now()
): WorldCupEffectiveStatus {
  if (match.status === 'SETTLED' || match.result !== null && match.result !== undefined) {
    return 'SETTLED';
  }

  if (match.status === 'CLOSED') return match.status;

  const start = worldCupMatchStartTime(match);
  if (start) {
    if (now >= start) return 'CLOSED';
    if (now >= start - PREDICTION_LOCK_MINUTES * 60 * 1000) return 'LOCKED';
  }

  if (match.status === 'LOCKED') return match.status;

  return 'OPEN';
}

export function isWorldCupPredictionClosed(match: WorldCupMatch, now = Date.now()) {
  return getWorldCupEffectiveStatus(match, now) !== 'OPEN';
}
