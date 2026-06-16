'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, LoaderCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getWorldCupEffectiveStatus } from '@/lib/world-cup-time';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';
import { cn } from '@/lib/utils';
import type {
  WorldCupMatch,
  WorldCupMember,
  WorldCupOutcome,
  WorldCupOverallResponse,
  WorldCupPredictionEntry,
} from '@/types/world-cup';
import type {
  WorldCupScheduleGroup,
  WorldCupScheduleMatch,
} from '@/components/world-cup-schedule';

type PredictionMatrix = Record<
  string,
  Record<string, WorldCupPredictionEntry | null>
>;

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

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

function normalizeMatches(
  matches: WorldCupOverallResponse['matches']
): WorldCupMatch[] {
  if (Array.isArray(matches)) return matches;
  if (matches && typeof matches === 'object') return Object.values(matches);
  return [];
}

function normalizeMatchResponse(response: unknown): WorldCupMatch[] {
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

function normalizeMembers(
  members: WorldCupOverallResponse['members']
): WorldCupMember[] {
  if (Array.isArray(members)) return members;
  if (members && typeof members === 'object') return Object.values(members);
  return [];
}

function memberId(member: WorldCupMember) {
  return String(
    member.memberId ?? member.userId ?? member.id ?? member.playerNumber ?? ''
  );
}

function predictionValue(entry?: WorldCupPredictionEntry | null) {
  if (!entry) return '-';
  if (entry.censored || entry.value === '***' || entry.prediction === '***') {
    return '***';
  }

  const value = entry.value ?? entry.prediction;
  if (value === 0) return '0';
  if (value === 1) return '1';
  if (value === 2) return '2';
  return '-';
}

function isPredictionEntry(value: unknown): value is WorldCupPredictionEntry | null {
  if (value === null) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  return (
    'prediction' in value ||
    'value' in value ||
    'matchId' in value ||
    'memberId' in value ||
    'userId' in value ||
    'censored' in value
  );
}

function addMatrixKey(keys: Set<string>, value: unknown) {
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

function indexedMembers(members: WorldCupMember[]) {
  const byKey = new Map<string, string>();

  members.forEach(member => {
    const canonical = memberId(member);
    if (!canonical) return;

    [canonical, member.id, member.memberId, member.userId, member.playerNumber].forEach(
      key => {
        const normalizedKey = String(key ?? '').trim();
        if (normalizedKey) byKey.set(normalizedKey, canonical);
      }
    );
  });

  return byKey;
}

function addMatchAliases(
  keys: Set<string>,
  backendByKey: Map<string, WorldCupMatch>,
  scheduleById: Map<string, WorldCupScheduleMatch>,
  scheduleByTeamPair: Map<string, WorldCupScheduleMatch>,
  rawKey: string,
  entry?: WorldCupPredictionEntry | null
) {
  addMatrixKey(keys, rawKey);
  addMatrixKey(keys, entry?.matchId);

  Array.from(keys).forEach(key => {
    const backendMatch = backendByKey.get(key);
    const scheduleMatch = scheduleById.get(key);

    if (backendMatch) {
      addMatrixKey(keys, backendMatchId(backendMatch));
      addMatrixKey(keys, backendMatch.matchNumber);
      const backendPairKey = backendTeamPairKey(backendMatch);
      const matchedSchedule = scheduleByTeamPair.get(backendPairKey);
      addMatrixKey(keys, backendPairKey);
      addMatrixKey(keys, matchedSchedule ? scheduleMatchId(matchedSchedule) : '');
    }

    if (scheduleMatch) {
      addMatrixKey(keys, scheduleMatchId(scheduleMatch));
      addMatrixKey(keys, scheduleTeamPairKey(scheduleMatch));
    }
  });
}

function addOverviewPrediction(
  matrix: PredictionMatrix,
  memberKey: string,
  matchKeys: Set<string>,
  entry: WorldCupPredictionEntry | null
) {
  if (!matrix[memberKey]) matrix[memberKey] = {};

  matchKeys.forEach(matchKey => {
    if (!(matchKey in matrix[memberKey]) || !matrix[memberKey][matchKey]) {
      matrix[memberKey][matchKey] = entry;
    }
  });
}

function normalizePredictionMatrix(
  predictions: Record<string, Record<string, WorldCupPredictionEntry | null>>,
  members: WorldCupMember[],
  scheduleMatches: WorldCupScheduleMatch[],
  matches: WorldCupMatch[]
): PredictionMatrix {
  const memberByKey = indexedMembers(members);
  const backendByKey = indexedBackendMatches(matches);
  const scheduleById = new Map<string, WorldCupScheduleMatch>();
  const scheduleByTeamPair = new Map<string, WorldCupScheduleMatch>();

  scheduleMatches.forEach(match => {
    scheduleById.set(scheduleMatchId(match), match);
    scheduleByTeamPair.set(scheduleTeamPairKey(match), match);
  });

  return Object.entries(predictions).reduce<PredictionMatrix>(
    (matrix, [outerKey, inner]) => {
      if (!inner || typeof inner !== 'object' || Array.isArray(inner)) {
        return matrix;
      }

      const outerMemberKey = memberByKey.get(outerKey);
      const innerEntries = Object.entries(inner);
      const innerLooksLikePredictionSet = innerEntries.every(([, entry]) =>
        isPredictionEntry(entry)
      );

      if (outerMemberKey && innerLooksLikePredictionSet) {
        innerEntries.forEach(([rawMatchId, entry]) => {
          if (!isPredictionEntry(entry)) return;
          const matchKeys = new Set<string>();
          addMatchAliases(
            matchKeys,
            backendByKey,
            scheduleById,
            scheduleByTeamPair,
            rawMatchId,
            entry
          );
          addOverviewPrediction(matrix, outerMemberKey, matchKeys, entry);
        });
        return matrix;
      }

      const matchKeys = new Set<string>();
      addMatchAliases(
        matchKeys,
        backendByKey,
        scheduleById,
        scheduleByTeamPair,
        outerKey
      );

      innerEntries.forEach(([rawMemberId, entry]) => {
        if (!isPredictionEntry(entry)) return;
        const entryMemberKey =
          memberByKey.get(String(entry?.memberId ?? '')) ??
          memberByKey.get(String(entry?.userId ?? '')) ??
          memberByKey.get(rawMemberId) ??
          rawMemberId;
        if (!entryMemberKey) return;
        addOverviewPrediction(matrix, entryMemberKey, matchKeys, entry);
      });

      return matrix;
    },
    {}
  );
}

function scoreToResult(match: WorldCupScheduleMatch): WorldCupOutcome | null {
  const score = match.score?.ft;
  if (!score) return null;
  if (score[0] > score[1]) return 1;
  if (score[1] > score[0]) return 2;
  return 0;
}

function formatDateShort(dateKey: string) {
  const [year, month, day] = dateKey.split('-');
  if (!year || !month || !day) return dateKey;
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

function teamResultClass(
  result: WorldCupOutcome | null | undefined,
  side: 'home' | 'away'
) {
  const isWinner = (result === 1 && side === 'home') || (result === 2 && side === 'away');
  const isLoser = (result === 1 && side === 'away') || (result === 2 && side === 'home');

  if (isWinner) {
    return 'text-emerald-700 dark:text-emerald-300';
  }
  if (isLoser) {
    return 'text-design-error dark:text-[#ff8a9d]';
  }
  return 'text-design-text';
}

function comparableMatch(
  match: WorldCupScheduleMatch,
  backendMatch?: WorldCupMatch
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
    score:
      backendMatch?.score ??
      (match.score?.ft ? `${match.score.ft[0]}-${match.score.ft[1]}` : null),
    status: backendMatch?.status ?? (match.score?.ft ? 'SETTLED' : 'OPEN'),
    result: backendMatch?.result ?? scoreToResult(match),
  };
}

function scoreLabel(match: WorldCupScheduleMatch, backendMatch?: WorldCupMatch) {
  if (backendMatch?.score) return backendMatch.score;
  if (
    typeof backendMatch?.homeScore === 'number' &&
    typeof backendMatch?.awayScore === 'number'
  ) {
    return `${backendMatch.homeScore}-${backendMatch.awayScore}`;
  }
  if (!match.score?.ft) return '-';
  return `${match.score.ft[0]}-${match.score.ft[1]}`;
}

function shouldRevealPredictions(
  match: WorldCupScheduleMatch,
  _backendMatch?: WorldCupMatch
) {
  const vietnamNow = Date.now() + VIETNAM_OFFSET_MS;
  return (
    Number.isFinite(match.vietnamTimestamp) &&
    match.vietnamTimestamp !== Number.MAX_SAFE_INTEGER &&
    vietnamNow >= match.vietnamTimestamp
  );
}

export function WorldCupPredictionOverview({
  groups,
}: {
  groups: WorldCupScheduleGroup[];
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useI18n();
  const [members, setMembers] = useState<WorldCupMember[]>([]);
  const [backendMatches, setBackendMatches] = useState<WorldCupMatch[]>([]);
  const [predictions, setPredictions] = useState<PredictionMatrix>({});
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const allMatches = useMemo(
    () => groups.flatMap(group => group.matches),
    [groups]
  );

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

  const sortedMembers = useMemo(
    () =>
      [...members]
        .filter(member => memberId(member))
        .sort((left, right) =>
          (left.name ?? memberId(left)).localeCompare(
            right.name ?? memberId(right),
            'vi'
          )
        ),
    [members]
  );

  const memberTotal = useCallback(
    (member: WorldCupMember) => {
      const candidateKeys = [
        memberId(member),
        member.id,
        member.memberId,
        member.userId,
        member.playerNumber !== undefined && member.playerNumber !== null
          ? String(member.playerNumber)
          : undefined,
      ].filter((key): key is string => Boolean(key));

      for (const key of candidateKeys) {
        const value = totals[key];
        if (typeof value === 'number') return value;
      }
      return 0;
    },
    [totals]
  );

  const loadOverview = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError('');
      const response = await apiClient.getWorldCupPredictions();
      let databaseMatches = normalizeMatches(response.matches);

      try {
        const matchesResponse = await apiClient.getWorldCupMatches();
        const loadedMatches = normalizeMatchResponse(matchesResponse);
        if (loadedMatches.length > 0) {
          databaseMatches = loadedMatches;
        }
      } catch (matchesError) {
        console.error('Failed to load World Cup match scores:', matchesError);
      }

      const loadedMembers = normalizeMembers(response.members);
      const loadedPredictions = normalizePredictionMatrix(
        (response.predictions ?? response.entries ?? {}) as Record<
          string,
          Record<string, WorldCupPredictionEntry | null>
        >,
        loadedMembers,
        allMatches,
        databaseMatches
      );

      setBackendMatches(databaseMatches);
      setMembers(loadedMembers);
      setPredictions(loadedPredictions);
      setTotals(response.totals ?? {});
    } catch (loadError) {
      console.error('Failed to load World Cup prediction overview:', loadError);
      setError(t('worldCup.loadPredictionOverviewError'));
    } finally {
      setLoading(false);
    }
  }, [allMatches, isAuthenticated, t]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <details className="group overflow-hidden rounded-airbnb border border-design-border-soft bg-design-card shadow-design-card [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 border-b border-design-border-soft px-5 py-4 outline-none transition-colors hover:bg-design-muted/60 focus-visible:ring-2 focus-visible:ring-design-primary focus-visible:ring-offset-2 focus-visible:ring-offset-design-card">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-airbnb bg-design-active text-design-primary-strong">
            <Image
              src="/fifa-world-cup-2026.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-[4px] object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-black text-design-text">
              {t('worldCup.predictionOverview')}
            </p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <p className="hidden text-sm font-bold text-design-secondary sm:block">
            {t('worldCup.matchesCount', { count: allMatches.length })}
          </p>
          <ChevronDown className="h-5 w-5 text-design-secondary transition-transform duration-200 group-open:rotate-180" />
        </div>
      </summary>

      {error ? (
        <div className="p-5 text-sm font-medium text-design-error">{error}</div>
      ) : loading ? (
        <div className="flex items-center gap-2 p-5 text-sm font-semibold text-design-secondary">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          {t('worldCup.loadingPredictionOverview')}
        </div>
      ) : (
        <div className="max-h-[min(34rem,calc(100vh-14rem))] overflow-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-design-border-soft bg-design-muted">
                <th className="sticky left-0 top-0 z-30 w-20 bg-design-muted px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-design-secondary">
                  {t('worldCup.round')}
                </th>
                <th className="sticky top-0 z-20 w-32 bg-design-muted px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-design-secondary">
                  {t('worldCup.vnTime')}
                </th>
                <th className="sticky top-0 z-20 min-w-72 bg-design-muted px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-design-secondary">
                  {t('common.match')}
                </th>
                <th className="sticky top-0 z-20 w-24 bg-design-muted px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-design-secondary">
                  {t('common.score')}
                </th>
                {sortedMembers.map(member => (
                  <th
                    key={memberId(member)}
                    className="sticky top-0 z-20 w-32 bg-design-muted px-4 py-3 text-center"
                  >
                    <span className="block whitespace-nowrap text-xs font-bold uppercase tracking-[0.14em] text-design-secondary">
                      {member.name ?? memberId(member)}
                    </span>
                    <span className="mt-1 inline-flex rounded-full bg-design-active px-2.5 py-0.5 text-xs font-black tracking-normal text-design-primary-strong">
                      {memberTotal(member)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allMatches.map((match, index) => {
                const id = scheduleMatchId(match);
                const backendMatch =
                  backendMatchById.get(id) ?? backendMatchById.get(scheduleTeamPairKey(match));
                const revealPredictions = shouldRevealPredictions(match, backendMatch);
                const comparable = comparableMatch(match, backendMatch);
                const resultTone =
                  getWorldCupEffectiveStatus(comparable) === 'SETTLED'
                    ? comparable.result
                    : null;

                return (
                  <tr
                    key={`overview-${id}`}
                    className="border-b border-design-border-soft last:border-b-0 hover:bg-design-muted/50"
                  >
                    <td className="sticky left-0 z-10 bg-design-card px-4 py-4 font-black text-design-secondary">
                      {t('worldCup.round')} {index + 1}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-base font-black text-design-text">
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
                            teamResultClass(resultTone, 'home')
                          )}
                        >
                          {match.team1}
                        </p>
                        <span className="rounded-full border border-design-border-soft bg-design-card px-2 py-1 text-xs font-black text-design-secondary">
                          vs
                        </span>
                        <p
                          className={cn(
                            'max-w-full justify-self-start truncate font-bold',
                            teamResultClass(resultTone, 'away')
                          )}
                        >
                          {match.team2}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex min-w-14 justify-center rounded-full bg-design-active px-3 py-1 text-sm font-black text-design-primary-strong">
                        {scoreLabel(match, backendMatch)}
                      </span>
                    </td>
                    {sortedMembers.map(member => {
                      const idMember = memberId(member);
                      const entry = predictions[idMember]?.[id] ?? null;
                      return (
                        <td
                          key={`${id}-${idMember}`}
                          className="px-4 py-4 text-center font-black text-design-text"
                        >
                          {revealPredictions ? predictionValue(entry) : '***'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}
