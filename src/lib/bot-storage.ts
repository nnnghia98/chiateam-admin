export const PLAYER_LIST_FIELDS = [
  'bench',
  'teamA',
  'teamB',
  'team3A',
  'team3B',
  'team3C',
] as const;

export const BOT_STORAGE_STATIC_FIELDS = [
  'tiensan',
  'tiennuoc',
  'teamThua',
  'activeVote',
  'san',
  'manifest',
] as const;

export const BOT_STORAGE_FIELDS = new Set<string>([
  ...PLAYER_LIST_FIELDS,
  ...BOT_STORAGE_STATIC_FIELDS,
]);

export type TeamKey = (typeof PLAYER_LIST_FIELDS)[number];
export type ExternalUserId = string | number;
export type ActiveVoteOption = '0' | '+1' | '+2' | '+3' | '+4';

export interface ManifestPlayer {
  identity: string;
  name: string;
}

export interface Manifest {
  relation: 'same' | 'different';
  players: [ManifestPlayer, ManifestPlayer];
}

export interface ActiveVote {
  id: string;
  question: string;
  options: ActiveVoteOption[];
  chatId?: ExternalUserId | null;
  messageId?: ExternalUserId | null;
  platform?: string | null;
  createdBy: ExternalUserId;
  createdAt: string;
  totalVoters: number;
  votes: Record<string, unknown>;
  [key: string]: unknown;
}

export interface BotPlayer {
  key: string;
  name: string;
  userId?: ExternalUserId;
  rawKey?: unknown;
  rawValue?: unknown;
}

export interface BotStorage {
  bench: BotPlayer[];
  teamA: BotPlayer[];
  teamB: BotPlayer[];
  team3A: BotPlayer[];
  team3B: BotPlayer[];
  team3C: BotPlayer[];
  san: string | null;
  manifest: Manifest | Manifest[] | null;
  activeVote: ActiveVote | null;
  tiensan: number | null;
  tiennuoc: number | null;
  teamThua: unknown;
  lastUpdated: string | null;
}

type NormalizedPlayerEntry = {
  key: string;
  name: string;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
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

function getRawPlayerName(rawKey: unknown, rawValue: unknown) {
  if (isRecord(rawValue)) {
    const rawName = rawValue.name;
    if (typeof rawName === 'string' || typeof rawName === 'number') {
      return String(rawName);
    }
  }

  if (typeof rawValue === 'string' || typeof rawValue === 'number') {
    return String(rawValue);
  }

  return String(rawKey);
}

export function rawToPlayers(entries: unknown): BotPlayer[] {
  if (!Array.isArray(entries)) return [];

  return entries.flatMap(entry => {
    if (!Array.isArray(entry) || entry.length < 2) return [];

    const [rawKey, rawValue] = entry;
    const rawUserId = isRecord(rawValue) ? rawValue.userId : undefined;
    const userId =
      typeof rawUserId === 'string' || typeof rawUserId === 'number'
        ? rawUserId
        : undefined;

    return [
      {
        key: String(rawKey),
        name: getRawPlayerName(rawKey, rawValue),
        ...(userId !== undefined ? { userId } : {}),
        rawKey,
        rawValue,
      },
    ];
  });
}

function inferredRawKey(key: string) {
  const numericKey = Number(key);
  return !Number.isNaN(numericKey) && String(numericKey) === key
    ? numericKey
    : key;
}

export function playersToRaw(players: BotPlayer[]): [unknown, unknown][] {
  return players.map(player => {
    const rawKey = player.rawKey ?? inferredRawKey(player.key);

    if (isRecord(player.rawValue)) {
      return [rawKey, { ...player.rawValue, name: player.name }];
    }

    if (
      player.rawValue !== undefined &&
      player.userId === undefined &&
      player.name === getRawPlayerName(rawKey, player.rawValue)
    ) {
      return [rawKey, player.rawValue];
    }

    if (player.userId !== undefined) {
      return [rawKey, { name: player.name, userId: player.userId }];
    }

    return [rawKey, { name: player.name }];
  });
}

function normalizeManifest(value: unknown): BotStorage['manifest'] {
  if (value == null) return null;
  return value as BotStorage['manifest'];
}

function normalizeActiveVote(value: unknown): ActiveVote | null {
  return isRecord(value) ? (value as ActiveVote) : null;
}

export function rawToStorage(raw: unknown): BotStorage {
  const value = isRecord(raw) ? raw : {};

  return {
    bench: rawToPlayers(value.bench),
    teamA: rawToPlayers(value.teamA),
    teamB: rawToPlayers(value.teamB),
    team3A: rawToPlayers(value.team3A),
    team3B: rawToPlayers(value.team3B),
    team3C: rawToPlayers(value.team3C),
    san: typeof value.san === 'string' ? value.san : null,
    manifest: normalizeManifest(value.manifest),
    activeVote: normalizeActiveVote(value.activeVote),
    tiensan: typeof value.tiensan === 'number' ? value.tiensan : null,
    tiennuoc: typeof value.tiennuoc === 'number' ? value.tiennuoc : null,
    teamThua: value.teamThua ?? null,
    lastUpdated:
      typeof value.lastUpdated === 'string' ? value.lastUpdated : null,
  };
}

export function storageToRaw(storage: BotStorage): Record<string, unknown> {
  return {
    bench: playersToRaw(storage.bench),
    teamA: playersToRaw(storage.teamA),
    teamB: playersToRaw(storage.teamB),
    team3A: playersToRaw(storage.team3A),
    team3B: playersToRaw(storage.team3B),
    team3C: playersToRaw(storage.team3C),
    san: storage.san,
    manifest: storage.manifest,
    activeVote: storage.activeVote,
    tiensan: storage.tiensan,
    tiennuoc: storage.tiennuoc,
    teamThua: storage.teamThua,
  };
}

export function getBotStorageEditedFields(
  originalStorage: BotStorage,
  editedStorage: BotStorage
): Record<string, unknown> {
  const originalFields = storageToRaw(originalStorage);
  const editedFields = storageToRaw(editedStorage);

  return Object.fromEntries(
    Object.entries(editedFields).filter(
      ([field, value]) =>
        stableStringify(value) !== stableStringify(originalFields[field])
    )
  );
}

export function mergeBotStorageEdits(
  currentStorage: unknown,
  editedFields: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...(isRecord(currentStorage) ? currentStorage : {}),
    ...editedFields,
  };
}

function choiceToIndex(value: unknown, options: readonly unknown[]) {
  if (typeof value === 'string') {
    const exactIndex = options.findIndex(option => String(option) === value);
    if (exactIndex >= 0) return exactIndex;
  }

  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;

  return Number.isInteger(numericValue) &&
    numericValue >= 0 &&
    numericValue < options.length
    ? numericValue
    : null;
}

export function getVoteSelectionIndexes(
  vote: unknown,
  options: readonly unknown[]
): number[] {
  if (!isRecord(vote)) return [];

  const rawChoices: unknown[] = [];
  if (Array.isArray(vote.options)) rawChoices.push(...vote.options);

  for (const field of ['choice', 'option', 'optionIndex'] as const) {
    const choice = vote[field];
    if (Array.isArray(choice)) rawChoices.push(...choice);
    else if (choice !== undefined && choice !== null) rawChoices.push(choice);
  }

  return [...new Set(rawChoices.flatMap(choice => {
    const index = choiceToIndex(choice, options);
    return index === null ? [] : [index];
  }))];
}

export function getVoteVoterName(voteKey: string, vote: unknown) {
  if (!isRecord(vote)) return voteKey;

  for (const field of ['name', 'displayName', 'label'] as const) {
    const value = vote[field];
    if (typeof value === 'string' && value.trim()) return value;
  }

  return voteKey;
}

function normalizePlayerEntry(entry: unknown): NormalizedPlayerEntry | null {
  if (!Array.isArray(entry) || entry.length < 2) return null;
  const [rawKey, rawValue] = entry;
  let name: string;

  if (isRecord(rawValue)) {
    const rawName = rawValue.name;
    if (rawName == null) name = String(rawKey);
    else if (typeof rawName === 'string' || typeof rawName === 'number') {
      name = String(rawName);
    } else {
      return null;
    }
  } else if (rawValue == null) {
    name = String(rawKey);
  } else if (typeof rawValue === 'string' || typeof rawValue === 'number') {
    name = String(rawValue);
  } else {
    return null;
  }

  return { key: String(rawKey), name };
}

function normalizePlayerList(
  storage: Record<string, unknown>,
  field: TeamKey
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

function nonPlayerStorage(storage: Record<string, unknown>) {
  const playerFields = new Set<string>(PLAYER_LIST_FIELDS);
  const staticFields = new Set<string>(BOT_STORAGE_STATIC_FIELDS);
  const otherFields = Object.entries(storage).filter(
    ([field]) => !playerFields.has(field) && !staticFields.has(field)
  );
  const normalizedStaticFields = BOT_STORAGE_STATIC_FIELDS.map(field => [
    field,
    storage[field] ?? null,
  ]);

  return Object.fromEntries([...otherFields, ...normalizedStaticFields]);
}

export function botStorageOnlyRenamesPlayers(
  current: Record<string, unknown>,
  requested: Record<string, unknown>
) {
  if (
    Object.keys(requested).some(
      key =>
        !BOT_STORAGE_FIELDS.has(key) &&
        !Object.prototype.hasOwnProperty.call(current, key)
    )
  ) {
    return false;
  }

  if (
    stableStringify(nonPlayerStorage(current)) !==
    stableStringify(nonPlayerStorage(requested))
  ) {
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

export function mergeBotStoragePlayerNames(
  current: Record<string, unknown>,
  requested: Record<string, unknown>
) {
  const merged: Record<string, unknown> = { ...current };

  for (const field of PLAYER_LIST_FIELDS) {
    const currentEntries = current[field] ?? [];
    const currentPlayers = normalizePlayerList(current, field);
    const requestedPlayers = normalizePlayerList(requested, field);
    if (
      !Array.isArray(currentEntries) ||
      !currentPlayers ||
      !requestedPlayers ||
      currentPlayers.length !== requestedPlayers.length ||
      currentPlayers.some(
        (player, index) => player.key !== requestedPlayers[index]?.key
      )
    ) {
      return null;
    }

    const mergedEntries = currentEntries.map((entry, index) =>
      withPlayerEntryName(entry, requestedPlayers[index].name)
    );
    if (mergedEntries.some(entry => entry === null)) return null;

    merged[field] = mergedEntries;
  }

  return merged;
}
