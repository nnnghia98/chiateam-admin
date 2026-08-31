import type { CreateMatchData, UpdateMatchData } from '@/types/match';

const MATCH_WRITE_FIELDS = [
  'match_date',
  'san',
  'tiensan',
  'home_score',
  'away_score',
  'notes',
] as const;

export function toMatchWritePayload(
  data: CreateMatchData | UpdateMatchData
): Record<string, unknown> {
  const source = data as Record<string, unknown>;

  return Object.fromEntries(
    MATCH_WRITE_FIELDS.flatMap(field =>
      Object.prototype.hasOwnProperty.call(source, field) &&
      source[field] !== undefined
        ? [[field, source[field]]]
        : []
    )
  );
}
