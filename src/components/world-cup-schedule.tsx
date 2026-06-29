'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  History,
  KeyRound,
  LoaderCircle,
  Lock,
  MapPin,
  RefreshCw,
  Save,
  Unlock,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getWorldCupEffectiveStatus } from '@/lib/world-cup-time';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';
import type { Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  WorldCupMatch,
  WorldCupMatchStatus,
  WorldCupMember,
  WorldCupOutcome,
  WorldCupPickValue,
  WorldCupPredictionEntry,
} from '@/types/world-cup';

export type WorldCupScheduleMatch = {
  round: string;
  num?: number;
  date: string;
  time: string;
  team1: string;
  team2: string;
  score?: {
    ft?: [number, number];
    ht?: [number, number];
  };
  group?: string;
  ground: string;
  matchNumber: number;
  vietnamTimestamp: number;
  vietnamDateKey: string;
  vietnamDateLabel: string;
  vietnamTimeLabel: string;
};

export type WorldCupScheduleGroup = {
  dateKey: string;
  dateLabel: string;
  matches: WorldCupScheduleMatch[];
};

export type WorldCupPredictionSurfaceContext = {
  isPredictionUnlocked: boolean;
  savingMatchId: string | null;
  getPredictionValue: (match: WorldCupScheduleMatch) => WorldCupPickValue | '';
  canPredictMatch: (match: WorldCupScheduleMatch) => boolean;
  savePrediction: (
    match: WorldCupScheduleMatch,
    pick: WorldCupPickValue
  ) => void;
};

type PredictionMap = Record<string, WorldCupPredictionEntry | null>;
type DraftMap = Record<string, WorldCupPickValue | ''>;
type ScoreDraftMap = Record<string, { home: string; away: string }>;

function predictionStorageKey(passCode: string) {
  let hash = 0;
  for (let index = 0; index < passCode.length; index += 1) {
    hash = Math.imul(31, hash) + passCode.charCodeAt(index);
  }
  return `worldCupPredictionDrafts:${(hash >>> 0).toString(36)}`;
}

function clearPersistentPredictionStorage() {
  try {
    window.localStorage.removeItem('worldCupPredictionKey');
    Object.keys(window.localStorage)
      .filter(key => key.startsWith('worldCupPredictionDrafts:'))
      .forEach(key => window.localStorage.removeItem(key));
  } catch {}
}

function scoreLabel(match: WorldCupScheduleMatch) {
  if (!match.score?.ft) return '-';
  return `${match.score.ft[0]}-${match.score.ft[1]}`;
}

function matchScoreLabel(match: WorldCupScheduleMatch, backendMatch?: WorldCupMatch) {
  if (backendMatch?.score) return backendMatch.score;
  if (
    typeof backendMatch?.homeScore === 'number' &&
    typeof backendMatch?.awayScore === 'number'
  ) {
    return `${backendMatch.homeScore}-${backendMatch.awayScore}`;
  }
  return scoreLabel(match);
}

function stageLabel(match: WorldCupScheduleMatch, t: ReturnType<typeof useI18n>['t']) {
  const groupMatch = match.group?.match(/^Group\s+(.+)$/i);
  if (groupMatch) {
    return t('worldCup.groupName', { group: groupMatch[1] });
  }
  return match.group ?? match.round;
}

function scheduleMatchId(match: WorldCupScheduleMatch) {
  return String(match.num ?? match.matchNumber);
}

function backendMatchId(match: WorldCupMatch | null | undefined) {
  if (!match) return '';
  return String(match.id ?? match.matchNumber ?? '');
}

function normalizeMatchName(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

function teamPairKey(homeTeam: string | null | undefined, awayTeam: string | null | undefined) {
  return `teams:${normalizeMatchName(homeTeam)}::${normalizeMatchName(awayTeam)}`;
}

function scheduleTeamPairKey(match: WorldCupScheduleMatch) {
  return teamPairKey(match.team1, match.team2);
}

function backendTeamPairKey(match: WorldCupMatch) {
  return teamPairKey(match.homeTeam, match.awayTeam);
}

function toBackendMatchArray(response: unknown): WorldCupMatch[] {
  if (Array.isArray(response)) return response as WorldCupMatch[];
  if (!response || typeof response !== 'object') return [];

  const data = response as {
    matches?: WorldCupMatch[] | Record<string, WorldCupMatch>;
    match?: WorldCupMatch;
  };

  if (Array.isArray(data.matches)) return data.matches;
  if (data.matches && typeof data.matches === 'object') {
    return Object.values(data.matches);
  }
  return data.match ? [data.match] : [];
}

function outcomeToPick(
  value?: WorldCupOutcome | string | number | null
): WorldCupPickValue | '' {
  if (value === 0 || value === '0') return '0';
  if (value === 1 || value === '1') return '1';
  if (value === 2 || value === '2') return '2';
  return '';
}

function predictionPick(prediction?: WorldCupPredictionEntry | null) {
  if (!prediction) return '';
  if (prediction.censored || prediction.value === '***') return '';
  return outcomeToPick(prediction.value) || outcomeToPick(prediction.prediction);
}

function pickToOutcome(pick: string): WorldCupOutcome | null {
  if (pick === '0') return 0;
  if (pick === '1') return 1;
  if (pick === '2') return 2;
  return null;
}

function scoreToPick(match: WorldCupScheduleMatch): WorldCupPickValue | '' {
  const score = match.score?.ft;
  if (!score) return '';
  if (score[0] > score[1]) return '1';
  if (score[1] > score[0]) return '2';
  return '0';
}

function scoreToResult(match: WorldCupScheduleMatch): WorldCupOutcome | null {
  const pick = scoreToPick(match);
  return pickToOutcome(pick);
}

function goalsToResult(homeScore: number, awayScore: number): WorldCupOutcome {
  if (homeScore > awayScore) return 1;
  if (awayScore > homeScore) return 2;
  return 0;
}

function winningTeamClass(
  result: WorldCupOutcome | null | undefined,
  side: 'home' | 'away'
) {
  const isWinner = (result === 1 && side === 'home') || (result === 2 && side === 'away');
  return isWinner
    ? 'underline decoration-2 underline-offset-4 decoration-design-primary'
    : '';
}

function fallbackBackendMatch(
  match: WorldCupScheduleMatch,
  backendMatch?: WorldCupMatch,
  overrides?: Partial<WorldCupMatch>
): WorldCupMatch {
  return {
    id: backendMatch?.id ?? scheduleMatchId(match),
    matchNumber: backendMatch?.matchNumber ?? match.matchNumber,
    date: backendMatch?.date ?? match.vietnamDateKey,
    time: backendMatch?.time ?? match.vietnamTimeLabel,
    homeTeam: backendMatch?.homeTeam ?? match.team1,
    awayTeam: backendMatch?.awayTeam ?? match.team2,
    homeScore: backendMatch?.homeScore ?? match.score?.ft?.[0] ?? null,
    awayScore: backendMatch?.awayScore ?? match.score?.ft?.[1] ?? null,
    score: backendMatch?.score ?? (match.score?.ft ? scoreLabel(match) : null),
    status: backendMatch?.status ?? (match.score?.ft ? 'SETTLED' : undefined),
    result: backendMatch?.result ?? scoreToResult(match),
    ...overrides,
  };
}

function scoreDraftFromMatch(
  match: WorldCupScheduleMatch,
  backendMatch?: WorldCupMatch
) {
  return {
    home:
      typeof backendMatch?.homeScore === 'number'
        ? String(backendMatch.homeScore)
        : match.score?.ft
          ? String(match.score.ft[0])
          : '',
    away:
      typeof backendMatch?.awayScore === 'number'
        ? String(backendMatch.awayScore)
        : match.score?.ft
          ? String(match.score.ft[1])
          : '',
  };
}

function hasMatchScore(match: WorldCupScheduleMatch, backendMatch?: WorldCupMatch) {
  return (
    Boolean(backendMatch?.score) ||
    (typeof backendMatch?.homeScore === 'number' &&
      typeof backendMatch?.awayScore === 'number') ||
    Boolean(match.score?.ft)
  );
}

function responseMatch(response: unknown): WorldCupMatch | null {
  if (!response || typeof response !== 'object') return null;

  const data = response as {
    match?: WorldCupMatch;
    data?: WorldCupMatch | { match?: WorldCupMatch };
  };

  if (data.match) return data.match;
  if (data.data && typeof data.data === 'object' && 'match' in data.data) {
    return data.data.match ?? null;
  }
  if ('id' in data || 'matchNumber' in data) return data as WorldCupMatch;
  return null;
}

function cleanPredictions(
  predictions: Record<string, WorldCupPredictionEntry | null>
) {
  return Object.fromEntries(
    Object.entries(predictions).map(([matchId, entry]) => [
      matchId,
      predictionPick(entry) ? entry : null,
    ])
  );
}

function isPredictionEntry(value: unknown): value is WorldCupPredictionEntry | null {
  if (value === null) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  return (
    'prediction' in value ||
    'value' in value ||
    'matchId' in value ||
    'member_id' in value ||
    'memberId' in value ||
    'censored' in value
  );
}

function memberPredictionKeys(member: WorldCupMember | null | undefined) {
  return new Set(
    [member?.member_id, member?.memberId, member?.id, member?.playerNumber]
      .map(value => String(value ?? '').trim())
      .filter(Boolean)
  );
}

function flattenMemberPredictions(
  predictions: Record<string, unknown>,
  member: WorldCupMember | null | undefined
) {
  const memberKeys = memberPredictionKeys(member);
  const values = Object.values(predictions);
  const isFlat = values.every(isPredictionEntry);

  if (isFlat) {
    return predictions as Record<string, WorldCupPredictionEntry | null>;
  }

  for (const key of memberKeys) {
    const memberPredictions = predictions[key];
    if (
      memberPredictions &&
      typeof memberPredictions === 'object' &&
      !Array.isArray(memberPredictions)
    ) {
      return memberPredictions as Record<string, WorldCupPredictionEntry | null>;
    }
  }

  const firstPredictionSet = values.find(
    value => value && typeof value === 'object' && !Array.isArray(value)
  );
  return (firstPredictionSet ?? {}) as Record<string, WorldCupPredictionEntry | null>;
}

function addPredictionKey(keys: Set<string>, value: unknown) {
  const key = String(value ?? '').trim();
  if (key) keys.add(key);
}

function indexedBackendMatches(matches: WorldCupMatch[]) {
  const byKey = new Map<string, WorldCupMatch>();

  matches.forEach(match => {
    const id = backendMatchId(match);
    if (id) byKey.set(id, match);
    if (match.matchNumber !== undefined && match.matchNumber !== null) {
      byKey.set(String(match.matchNumber), match);
    }
    byKey.set(backendTeamPairKey(match), match);
  });

  return byKey;
}

function normalizePredictionsToSchedule(
  predictions: Record<string, unknown>,
  member: WorldCupMember | null | undefined,
  scheduleMatches: WorldCupScheduleMatch[],
  matches: WorldCupMatch[]
): PredictionMap {
  const cleanedPredictions = cleanPredictions(
    flattenMemberPredictions(predictions, member)
  );
  const backendByKey = indexedBackendMatches(matches);
  const scheduleById = new Map<string, WorldCupScheduleMatch>();
  const scheduleByTeamPair = new Map<string, WorldCupScheduleMatch>();

  scheduleMatches.forEach(match => {
    scheduleById.set(scheduleMatchId(match), match);
    scheduleByTeamPair.set(scheduleTeamPairKey(match), match);
  });

  return Object.entries(cleanedPredictions).reduce<PredictionMap>(
    (normalized, [rawMatchId, entry]) => {
      const keys = new Set<string>();
      addPredictionKey(keys, rawMatchId);
      addPredictionKey(keys, entry?.matchId);

      Array.from(keys).forEach(key => {
        const backendMatch = backendByKey.get(key);
        const scheduleMatch = scheduleById.get(key);

        if (backendMatch) {
          addPredictionKey(keys, backendMatchId(backendMatch));
          addPredictionKey(keys, backendMatch.matchNumber);
          const backendPairKey = backendTeamPairKey(backendMatch);
          const matchedSchedule = scheduleByTeamPair.get(backendPairKey);
          addPredictionKey(keys, backendPairKey);
          addPredictionKey(keys, matchedSchedule ? scheduleMatchId(matchedSchedule) : '');
        }

        if (scheduleMatch) {
          addPredictionKey(keys, scheduleMatchId(scheduleMatch));
          addPredictionKey(keys, scheduleTeamPairKey(scheduleMatch));
        }
      });

      keys.forEach(key => {
        if (!(key in normalized) || !normalized[key]) {
          normalized[key] = entry;
        }
      });

      return normalized;
    },
    {}
  );
}

function predictionsToDrafts(predictions: PredictionMap): DraftMap {
  return Object.fromEntries(
    Object.entries(predictions).map(([matchId, entry]) => [
      matchId,
      predictionPick(entry),
    ])
  );
}

function readLocalDrafts(passCode: string): DraftMap {
  try {
    const parsed = JSON.parse(
      window.sessionStorage.getItem(predictionStorageKey(passCode)) ?? '{}'
    );
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, WorldCupPickValue] => {
        const value = entry[1];
        return value === '0' || value === '1' || value === '2';
      })
    );
  } catch {
    return {};
  }
}

function writeLocalDraft(passCode: string, matchId: string, pick: WorldCupPickValue) {
  try {
    const nextDrafts = {
      ...readLocalDrafts(passCode),
      [matchId]: pick,
    };
    window.sessionStorage.setItem(
      predictionStorageKey(passCode),
      JSON.stringify(nextDrafts)
    );
  } catch {}
}

function formatDateLabel(dateKey: string, locale: Locale) {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return dateKey;

  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatDateShort(dateKey: string) {
  const [year, month, day] = dateKey.split('-');
  if (!year || !month || !day) return dateKey;
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

function vietnamTodayKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  const day = parts.find(part => part.type === 'day')?.value;

  return year && month && day ? `${year}-${month}-${day}` : '';
}

export function WorldCupSchedule({
  groups,
  afterPassCode,
}: {
  groups: WorldCupScheduleGroup[];
  afterPassCode?: (context: WorldCupPredictionSurfaceContext) => ReactNode;
}) {
  const { locale, t } = useI18n();
  const { canEdit } = useAuth();
  const [passCode, setPassCode] = useState('');
  const [member, setMember] = useState<WorldCupMember | null>(null);
  const [backendMatches, setBackendMatches] = useState<WorldCupMatch[]>([]);
  const [predictions, setPredictions] = useState<PredictionMap>({});
  const [drafts, setDrafts] = useState<Record<string, WorldCupPickValue | ''>>({});
  const [scoreDrafts, setScoreDrafts] = useState<ScoreDraftMap>({});
  const [loading, setLoading] = useState(false);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [savingAdminMatchId, setSavingAdminMatchId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showOldMatches, setShowOldMatches] = useState(false);
  const backendMatchesRef = useRef<WorldCupMatch[]>([]);
  const isLoggedIn = Boolean(member);
  const todayKey = useMemo(() => vietnamTodayKey(), []);
  const allMatches = useMemo(
    () => groups.flatMap(group => group.matches),
    [groups]
  );
  const oldGroups = useMemo(
    () => groups.filter(group => todayKey && group.dateKey < todayKey),
    [groups, todayKey]
  );
  const visibleGroups = useMemo(
    () =>
      showOldMatches || !todayKey
        ? groups
        : groups.filter(group => group.dateKey >= todayKey),
    [groups, showOldMatches, todayKey]
  );
  const oldMatchCount = useMemo(
    () => oldGroups.reduce((count, group) => count + group.matches.length, 0),
    [oldGroups]
  );

  useEffect(() => {
    backendMatchesRef.current = backendMatches;
  }, [backendMatches]);

  const backendMatchById = useMemo(() => {
    const byId = new Map<string, WorldCupMatch>();
    backendMatches.forEach(match => {
      const id = backendMatchId(match);
      if (id) byId.set(id, match);
      if (match.matchNumber !== undefined && match.matchNumber !== null) {
        byId.set(String(match.matchNumber), match);
      }
      byId.set(backendTeamPairKey(match), match);
    });
    return byId;
  }, [backendMatches]);

  const upsertBackendMatch = useCallback((match: WorldCupMatch | null | undefined) => {
    const nextId = backendMatchId(match);
    if (!nextId) return;
    const nextMatch = match;
    if (!nextMatch) return;

    setBackendMatches(current => [
      ...current.filter(item => backendMatchId(item) !== nextId),
      nextMatch,
    ]);
  }, []);

  const loadAdminMatches = useCallback(async () => {
    if (!canEdit) return;

    try {
      const response = await apiClient.getWorldCupMatches();
      setBackendMatches(toBackendMatchArray(response));
    } catch (loadError) {
      console.error('Failed to load World Cup matches for admin:', loadError);
    }
  }, [canEdit]);

  const loadMemberPredictions = useCallback(async (key: string) => {
    const trimmedKey = key.replace(/\s+/g, '').trim();
    if (!trimmedKey) {
      setError(t('worldCup.enterPassCodeError'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await apiClient.getWorldCupMemberPredictions(trimmedKey);
      const responseMatches = toBackendMatchArray(response);
      const availableMatches = [...backendMatchesRef.current, ...responseMatches];
      const loadedPredictions = normalizePredictionsToSchedule(
        response.predictions ?? response.entries ?? {},
        response.member,
        allMatches,
        availableMatches
      );

      clearPersistentPredictionStorage();
      window.sessionStorage.setItem('worldCupPredictionKey', trimmedKey);
      setPassCode(trimmedKey);
      setMember(response.member);
      if (!canEdit) setBackendMatches(responseMatches);
      setPredictions(loadedPredictions);
      setDrafts({
        ...readLocalDrafts(trimmedKey),
        ...predictionsToDrafts(loadedPredictions),
      });
    } catch (loadError) {
      console.error('Failed to load World Cup member predictions:', loadError);
      setMember(null);
      setPredictions({});
      setDrafts({});
      if (!canEdit) setBackendMatches([]);
      setError(t('worldCup.invalidPassCode'));
    } finally {
      setLoading(false);
    }
  }, [allMatches, canEdit, t]);

  useEffect(() => {
    try {
      clearPersistentPredictionStorage();
      const storedKey = window.sessionStorage.getItem('worldCupPredictionKey') ?? '';
      if (storedKey) {
        setPassCode(storedKey);
        void loadMemberPredictions(storedKey);
      }
    } catch {
      setPassCode('');
    }
  }, [loadMemberPredictions]);

  useEffect(() => {
    void loadAdminMatches();
  }, [loadAdminMatches]);

  useEffect(() => {
    if (!canEdit) return;

    setScoreDrafts(current => {
      const next = { ...current };
      allMatches.forEach(match => {
        const id = scheduleMatchId(match);
        const backendMatch =
          backendMatchById.get(id) ?? backendMatchById.get(scheduleTeamPairKey(match));
        const backendDraft = scoreDraftFromMatch(match, backendMatch);
        const currentDraft = next[id];
        const hasCurrentDraft = Boolean(currentDraft?.home || currentDraft?.away);
        const hasBackendDraft = Boolean(backendDraft.home || backendDraft.away);

        if (!currentDraft || (!hasCurrentDraft && hasBackendDraft)) {
          next[id] = backendDraft;
        }
      });
      return next;
    });
  }, [allMatches, backendMatchById, canEdit]);

  const savePrediction = async (
    match: WorldCupScheduleMatch,
    pick: WorldCupPickValue
  ) => {
    if (!member || !passCode) return;

    const id = scheduleMatchId(match);
    const backendMatch =
      backendMatchById.get(id) ?? backendMatchById.get(scheduleTeamPairKey(match));
    const effectiveMatch = fallbackBackendMatch(match, backendMatch);
    if (getWorldCupEffectiveStatus(effectiveMatch) !== 'OPEN') return;

    const previousValue = drafts[id] ?? predictionPick(predictions[id]);
    if (pick !== '1' && pick !== '2') {
      setError(t('worldCup.choosePredictionError'));
      return;
    }
    const prediction = pickToOutcome(pick);
    if (prediction === null) return;

    try {
      setSavingMatchId(id);
      setError('');
      setDrafts(current => ({ ...current, [id]: pick }));
      writeLocalDraft(passCode, id, pick);
      const response = await apiClient.updateWorldCupMemberPrediction(
        passCode,
        id,
        prediction
      );
      const responseMatches = toBackendMatchArray(response);
      const loadedPredictions = normalizePredictionsToSchedule(
        response.predictions ?? response.entries ?? {},
        response.member,
        allMatches,
        responseMatches.length ? responseMatches : backendMatches
      );
      setPredictions(loadedPredictions);
      setDrafts({
        ...readLocalDrafts(passCode),
        ...predictionsToDrafts(loadedPredictions),
        [id]: pick,
      });
    } catch (saveError) {
      console.error('Failed to save World Cup prediction:', saveError);
      setDrafts(current => ({ ...current, [id]: previousValue }));
      setError(t('worldCup.savePredictionError'));
    } finally {
      setSavingMatchId(null);
    }
  };

  const changePassCode = () => {
    try {
      window.sessionStorage.removeItem('worldCupPredictionKey');
    } catch {}
    setMember(null);
    setPassCode('');
    if (!canEdit) setBackendMatches([]);
    setPredictions({});
    setDrafts({});
    setError('');
  };

  const updateMatchResult = async (
    match: WorldCupScheduleMatch
  ) => {
    const id = scheduleMatchId(match);
    const scoreDraft =
      scoreDrafts[id] ?? scoreDraftFromMatch(match, backendMatchById.get(id));
    const homeScore = Number(scoreDraft.home);
    const awayScore = Number(scoreDraft.away);

    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      setError(t('worldCup.scoreFormat'));
      return;
    }

    const result = goalsToResult(homeScore, awayScore);
    const score = `${homeScore}-${awayScore}`;
    const backendMatch = backendMatchById.get(id) ?? backendMatchById.get(scheduleTeamPairKey(match));
    const resultMatchId = backendMatchId(backendMatch) || id;
    try {
      setSavingAdminMatchId(id);
      setError('');
      const response = await apiClient.setWorldCupMatchResult(resultMatchId, {
        homeScore,
        awayScore,
        score,
        result,
        status: 'SETTLED',
      });
      upsertBackendMatch(
        responseMatch(response) ??
          fallbackBackendMatch(match, backendMatch, {
            homeScore,
            awayScore,
            score,
            result,
            status: 'SETTLED',
          })
      );
    } catch (saveError) {
      console.error('Failed to set World Cup result:', saveError);
      setError(t('worldCup.setResultError'));
    } finally {
      setSavingAdminMatchId(null);
    }
  };

  const updateScoreDraft = (
    matchId: string,
    side: 'home' | 'away',
    value: string
  ) => {
    const cleanedValue = value.replace(/[^\d]/g, '');
    setScoreDrafts(current => ({
      ...current,
      [matchId]: {
        home: current[matchId]?.home ?? '',
        away: current[matchId]?.away ?? '',
        [side]: cleanedValue,
      },
    }));
  };

  const updatePredictionStatus = async (
    match: WorldCupScheduleMatch,
    status: WorldCupMatchStatus
  ) => {
    const id = scheduleMatchId(match);
    const backendMatch = backendMatchById.get(id) ?? backendMatchById.get(scheduleTeamPairKey(match));
    const statusMatchId = backendMatchId(backendMatch) || id;

    try {
      setSavingAdminMatchId(id);
      setError('');
      const response = await apiClient.setWorldCupMatchStatus(statusMatchId, status);
      upsertBackendMatch(
        responseMatch(response) ??
          fallbackBackendMatch(match, backendMatch, { status })
      );
      await loadAdminMatches();
    } catch (saveError) {
      console.error('Failed to update World Cup match status:', saveError);
      setError(t('worldCup.updateStatusError'));
    } finally {
      setSavingAdminMatchId(null);
    }
  };

  const predictionSurfaceContext: WorldCupPredictionSurfaceContext = {
    isPredictionUnlocked: isLoggedIn,
    savingMatchId,
    getPredictionValue: match => {
      const id = scheduleMatchId(match);
      return drafts[id] ?? predictionPick(predictions[id]);
    },
    canPredictMatch: match => {
      const id = scheduleMatchId(match);
      const backendMatch =
        backendMatchById.get(id) ?? backendMatchById.get(scheduleTeamPairKey(match));
      const effectiveMatch = fallbackBackendMatch(match, backendMatch);
      return isLoggedIn && getWorldCupEffectiveStatus(effectiveMatch) === 'OPEN';
    },
    savePrediction: (match, pick) => {
      void savePrediction(match, pick);
    },
  };

  return (
    <section className="space-y-5">
      <div className="rounded-airbnb border border-design-border-soft bg-design-card p-4 shadow-design-card">
        {isLoggedIn ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-airbnb bg-design-active text-design-primary-strong">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-design-secondary">
                  {t('worldCup.predictionMember')}
                </p>
                <p className="truncate text-lg font-black text-design-text">
                  {member?.name}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <p className="inline-flex h-10 items-center rounded-airbnb bg-design-muted px-3 text-sm font-bold text-design-secondary">
                {t('worldCup.passCodeVerified')}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={changePassCode}
                className="h-10"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('worldCup.changePassCode')}
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={event => {
              event.preventDefault();
              void loadMemberPredictions(passCode);
            }}
            className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-end"
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="world-cup-pass-code"
                className="text-base font-black text-design-text"
              >
                {t('worldCup.passCode')}
              </Label>
              <p className="max-w-sm text-sm leading-6 text-design-secondary">
                {t('worldCup.passCodeHelp')}
              </p>
            </div>
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_148px]">
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-design-secondary" />
                  <Input
                    id="world-cup-pass-code"
                    value={passCode}
                    onChange={event => {
                      setPassCode(event.target.value);
                      setError('');
                    }}
                    placeholder={t('worldCup.enterPassCode')}
                    className="h-11 pl-9 font-semibold"
                    inputMode="numeric"
                  />
                </div>
                <Button type="submit" disabled={loading} className="h-11 w-full">
                  {loading ? (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="mr-2 h-4 w-4" />
                  )}
                  {t('worldCup.loginWithPassCode')}
                </Button>
              </div>
              {error && <p className="text-sm font-medium text-design-error">{error}</p>}
            </div>
          </form>
        )}
      </div>

      {afterPassCode ? <div>{afterPassCode(predictionSurfaceContext)}</div> : null}

      {oldMatchCount > 0 && (
        <div className="flex flex-col gap-3 rounded-airbnb border border-design-border-soft bg-design-card p-3 shadow-design-card sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-design-secondary">
            {t('worldCup.oldMatchesHidden', { count: oldMatchCount })}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowOldMatches(current => !current)}
            className="h-10 w-full sm:w-auto"
          >
            <History className="mr-2 h-4 w-4" />
            {showOldMatches
              ? t('worldCup.hideOldMatches')
              : t('worldCup.showOldMatches')}
          </Button>
        </div>
      )}

      {visibleGroups.map((group, index) => (
        <details
          key={group.dateKey}
          open={index === 0}
          className="group overflow-hidden rounded-airbnb border border-design-border-soft bg-design-card shadow-design-card [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-design-border-soft bg-design-text px-4 py-3 text-design-card outline-none transition-colors hover:bg-design-text/95 focus-visible:ring-2 focus-visible:ring-design-primary focus-visible:ring-offset-2 focus-visible:ring-offset-design-card">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black tracking-normal text-design-card">
                {formatDateLabel(group.dateKey, locale)}
              </h2>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              <p className="text-sm font-semibold text-design-card/75">
                {t('worldCup.matchesCount', { count: group.matches.length })}
              </p>
              <ChevronDown className="h-5 w-5 text-design-card/75 transition-transform duration-200 group-open:rotate-180" />
            </div>
          </summary>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-design-border-soft bg-design-muted">
                  <th className="w-28 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-design-secondary">
                    {t('worldCup.vnTime')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-design-secondary">
                    {t('common.match')}
                  </th>
                  <th className="w-36 px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-design-secondary">
                    {t('worldCup.predict')}
                  </th>
                  {canEdit && (
                    <th className="w-40 px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-design-secondary">
                      {t('common.status')}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {group.matches.map(match => {
                  const id = scheduleMatchId(match);
                  const backendMatch =
                    backendMatchById.get(id) ?? backendMatchById.get(scheduleTeamPairKey(match));
                  const effectiveMatch = fallbackBackendMatch(match, backendMatch);
                  const value = drafts[id] ?? predictionPick(predictions[id]);
                  const scoreDraft =
                    scoreDrafts[id] ?? scoreDraftFromMatch(match, backendMatch);
                  const adminBusy = savingAdminMatchId === id;
                  const predictionBusy = savingMatchId === id;
                  const effectiveStatus = getWorldCupEffectiveStatus(effectiveMatch);
                  const isPredictionOpen = effectiveStatus === 'OPEN';
                  const resultTone =
                    effectiveStatus === 'SETTLED' ? effectiveMatch.result : null;
                  const resultLabel = matchScoreLabel(match, backendMatch);
                  const hasResult = hasMatchScore(match, backendMatch);
                  return (
                    <tr
                      key={`${group.dateKey}-${match.matchNumber}`}
                      className="border-b border-design-border-soft last:border-b-0 hover:bg-design-muted/70"
                    >
                      <td className="px-4 py-4">
                        <p className="text-lg font-black text-design-text">
                          {match.vietnamTimeLabel}
                        </p>
                        <p className="mt-1 text-xs text-design-secondary">
                          {formatDateShort(match.vietnamDateKey)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                          <p
                            className={cn(
                              'max-w-full justify-self-end truncate text-right font-bold',
                              winningTeamClass(resultTone, 'home')
                            )}
                          >
                            {match.team1}
                          </p>
                          {canEdit ? (
                            <div
                              className="grid grid-cols-[2.5rem_auto_2.5rem_auto] items-center justify-center gap-1"
                              aria-label={t('worldCup.setResultFor', { id })}
                            >
                              <Input
                                type="text"
                                value={scoreDraft.home}
                                disabled={adminBusy}
                                onChange={event =>
                                  updateScoreDraft(id, 'home', event.target.value)
                                }
                                className="h-9 w-10 px-2 text-center text-sm font-black"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={2}
                                aria-label={`${match.team1} ${t('common.score')}`}
                              />
                              <span className="font-black text-design-secondary">-</span>
                              <Input
                                type="text"
                                value={scoreDraft.away}
                                disabled={adminBusy}
                                onChange={event =>
                                  updateScoreDraft(id, 'away', event.target.value)
                                }
                                className="h-9 w-10 px-2 text-center text-sm font-black"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={2}
                                aria-label={`${match.team2} ${t('common.score')}`}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={adminBusy}
                                onClick={() => void updateMatchResult(match)}
                                className="h-9 w-9"
                                aria-label={t('worldCup.saveResult')}
                              >
                                {adminBusy ? (
                                  <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <span
                              className={cn(
                                'rounded-full border border-design-border-soft bg-design-card px-2 py-1 text-xs font-black text-design-secondary',
                                hasResult &&
                                  'min-w-14 border-transparent bg-design-muted px-3 text-sm text-design-text'
                              )}
                            >
                              {hasResult ? resultLabel : 'vs'}
                            </span>
                          )}
                          <p
                            className={cn(
                              'max-w-full justify-self-start truncate font-bold',
                              winningTeamClass(resultTone, 'away')
                            )}
                          >
                            {match.team2}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="relative">
                          <select
                            value={value}
                            disabled={!isLoggedIn || !isPredictionOpen || Boolean(savingMatchId)}
                            onChange={event =>
                              void savePrediction(
                                match,
                                event.target.value as WorldCupPickValue
                              )
                            }
                            className="h-9 w-full rounded-airbnb border border-design-border bg-design-card px-2 text-center text-sm font-bold text-design-text outline-none focus:border-design-primary focus:ring-2 focus:ring-design-primary/20 disabled:cursor-not-allowed disabled:opacity-55"
                            aria-busy={predictionBusy}
                          >
                            <option value="">-</option>
                            <option value="1">{match.team1}</option>
                            <option value="2">{match.team2}</option>
                          </select>
                          {predictionBusy && (
                            <span className="pointer-events-none absolute inset-y-0 right-7 flex items-center text-design-primary">
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            </span>
                          )}
                        </div>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={adminBusy}
                            onClick={() =>
                              void updatePredictionStatus(
                                match,
                                isPredictionOpen ? 'LOCKED' : 'OPEN'
                              )
                            }
                            className="w-full"
                          >
                            {adminBusy ? (
                              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            ) : isPredictionOpen ? (
                              <Unlock className="mr-2 h-4 w-4" />
                            ) : (
                              <Lock className="mr-2 h-4 w-4" />
                            )}
                            {isPredictionOpen
                              ? t('worldCup.closePredict')
                              : t('worldCup.openPredict')}
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-design-border-soft md:hidden">
            {group.matches.map(match => {
              const id = scheduleMatchId(match);
              const backendMatch =
                backendMatchById.get(id) ?? backendMatchById.get(scheduleTeamPairKey(match));
              const effectiveMatch = fallbackBackendMatch(match, backendMatch);
              const value = drafts[id] ?? predictionPick(predictions[id]);
              const scoreDraft =
                scoreDrafts[id] ?? scoreDraftFromMatch(match, backendMatch);
              const adminBusy = savingAdminMatchId === id;
              const predictionBusy = savingMatchId === id;
              const effectiveStatus = getWorldCupEffectiveStatus(effectiveMatch);
              const isPredictionOpen = effectiveStatus === 'OPEN';
              const resultTone =
                effectiveStatus === 'SETTLED' ? effectiveMatch.result : null;
              const resultLabel = matchScoreLabel(match, backendMatch);
              const hasResult = hasMatchScore(match, backendMatch);
              return (
                <article
                  key={`${group.dateKey}-${match.matchNumber}-mobile`}
                  className="p-4"
                >
                  <div className="flex items-start gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-design-secondary">
                        {t('common.match')} {match.matchNumber} · {stageLabel(match, t)}
                      </p>
                      <p className="mt-1 text-2xl font-black text-design-text">
                        {match.vietnamTimeLabel}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                    <p
                      className={cn(
                        'max-w-full justify-self-end text-right text-base font-black',
                        winningTeamClass(resultTone, 'home')
                      )}
                    >
                      {match.team1}
                    </p>
                    {canEdit ? (
                      <div
                        className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1"
                        aria-label={t('worldCup.setResultFor', { id })}
                      >
                        <Input
                          type="text"
                          value={scoreDraft.home}
                          disabled={adminBusy}
                          onChange={event =>
                            updateScoreDraft(id, 'home', event.target.value)
                          }
                          className="h-10 w-10 px-2 text-center text-sm font-black"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={2}
                          aria-label={`${match.team1} ${t('common.score')}`}
                        />
                        <span className="font-black text-design-secondary">-</span>
                        <Input
                          type="text"
                          value={scoreDraft.away}
                          disabled={adminBusy}
                          onChange={event =>
                            updateScoreDraft(id, 'away', event.target.value)
                          }
                          className="h-10 w-10 px-2 text-center text-sm font-black"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={2}
                          aria-label={`${match.team2} ${t('common.score')}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={adminBusy}
                          onClick={() => void updateMatchResult(match)}
                          className="h-10 w-10"
                          aria-label={t('worldCup.saveResult')}
                        >
                          {adminBusy ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <span
                        className={cn(
                          'rounded-full border border-design-border-soft bg-design-card px-2 py-1 text-xs font-black uppercase text-design-secondary',
                          hasResult &&
                            'min-w-14 border-transparent bg-design-muted px-3 text-center text-sm text-design-text'
                        )}
                      >
                        {hasResult ? resultLabel : 'vs'}
                      </span>
                    )}
                    <p
                      className={cn(
                        'max-w-full justify-self-start text-base font-black',
                        winningTeamClass(resultTone, 'away')
                      )}
                    >
                      {match.team2}
                    </p>
                  </div>

                  <p className="mt-3 flex items-start gap-2 text-sm text-design-secondary">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-design-primary" />
                    {match.ground}
                  </p>
                  <p className="mt-2 text-xs text-design-secondary">
                    {formatDateShort(match.vietnamDateKey)}
                  </p>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor={`prediction-${id}`}>
                      {t('worldCup.predict')}
                    </Label>
                    <div className="relative">
                      <select
                        id={`prediction-${id}`}
                        value={value}
                        disabled={!member || !isPredictionOpen || Boolean(savingMatchId)}
                        onChange={event =>
                          void savePrediction(
                            match,
                            event.target.value as WorldCupPickValue
                          )
                        }
                        className="h-10 w-full rounded-airbnb border border-design-border bg-design-card px-3 text-sm font-bold text-design-text outline-none focus:border-design-primary focus:ring-2 focus:ring-design-primary/20 disabled:cursor-not-allowed disabled:opacity-55"
                        aria-busy={predictionBusy}
                      >
                        <option value="">-</option>
                        <option value="1">{match.team1}</option>
                        <option value="2">{match.team2}</option>
                      </select>
                      {predictionBusy && (
                        <span className="pointer-events-none absolute inset-y-0 right-8 flex items-center text-design-primary">
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        </span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={adminBusy}
                        onClick={() =>
                          void updatePredictionStatus(
                            match,
                            isPredictionOpen ? 'LOCKED' : 'OPEN'
                          )
                        }
                        className="w-full"
                      >
                        {adminBusy ? (
                          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        ) : isPredictionOpen ? (
                          <Unlock className="mr-2 h-4 w-4" />
                        ) : (
                          <Lock className="mr-2 h-4 w-4" />
                        )}
                        {isPredictionOpen
                          ? t('worldCup.closePredict')
                          : t('worldCup.openPredict')}
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </details>
      ))}
    </section>
  );
}
