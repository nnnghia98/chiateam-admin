'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, LoaderCircle, Trophy } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getWorldCupEffectiveStatus } from '@/lib/world-cup-time';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';
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

function scheduleMatchId(match: WorldCupScheduleMatch) {
  return String(match.num ?? match.matchNumber);
}

function backendMatchId(match: WorldCupMatch | null | undefined) {
  if (!match) return '';
  return String(match.id ?? match.matchNumber ?? '');
}

function normalizeMatches(
  matches: WorldCupOverallResponse['matches']
): WorldCupMatch[] {
  if (Array.isArray(matches)) return matches;
  if (matches && typeof matches === 'object') return Object.values(matches);
  return [];
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

function scoreToResult(match: WorldCupScheduleMatch): WorldCupOutcome | null {
  const score = match.score?.ft;
  if (!score) return null;
  if (score[0] > score[1]) return 1;
  if (score[1] > score[0]) return 2;
  return 0;
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
    status: backendMatch?.status ?? (match.score?.ft ? 'SETTLED' : 'OPEN'),
    result: backendMatch?.result ?? scoreToResult(match),
  };
}

function scoreLabel(match: WorldCupScheduleMatch, backendMatch?: WorldCupMatch) {
  if (backendMatch?.result === 0) return '0';
  if (backendMatch?.result === 1) return '1';
  if (backendMatch?.result === 2) return '2';
  if (!match.score?.ft) return '-';
  return `${match.score.ft[0]}-${match.score.ft[1]}`;
}

function isSettled(match: WorldCupScheduleMatch, backendMatch?: WorldCupMatch) {
  return getWorldCupEffectiveStatus(comparableMatch(match, backendMatch)) === 'SETTLED';
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

  const loadOverview = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError('');
      const response = await apiClient.getWorldCupPredictions();
      setBackendMatches(normalizeMatches(response.matches));
      setMembers(normalizeMembers(response.members));
      setPredictions((response.predictions ?? response.entries ?? {}) as PredictionMatrix);
    } catch (loadError) {
      console.error('Failed to load World Cup prediction overview:', loadError);
      setError(t('worldCup.loadPredictionOverviewError'));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, t]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <details className="group overflow-hidden rounded-airbnb border border-design-border-soft bg-design-card shadow-design-card [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 border-b border-design-border-soft px-5 py-4 outline-none transition-colors hover:bg-design-muted/60 focus-visible:ring-2 focus-visible:ring-design-primary focus-visible:ring-offset-2 focus-visible:ring-offset-design-card">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-airbnb bg-design-active text-design-primary-strong">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-black text-design-text">
              {t('worldCup.predictionOverview')}
            </p>
            <p className="mt-1 truncate text-sm text-design-secondary">
              {t('worldCup.predictionOverviewHelp')}
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-design-border-soft bg-design-muted">
                <th className="sticky left-0 z-10 w-20 bg-design-muted px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-design-secondary">
                  {t('worldCup.no')}
                </th>
                <th className="w-32 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-design-secondary">
                  {t('worldCup.vnTime')}
                </th>
                <th className="min-w-72 px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-design-secondary">
                  {t('common.match')}
                </th>
                <th className="w-24 px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-design-secondary">
                  {t('common.score')}
                </th>
                {sortedMembers.map(member => (
                  <th
                    key={memberId(member)}
                    className="w-28 px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-design-secondary"
                  >
                    {member.name ?? memberId(member)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allMatches.map(match => {
                const id = scheduleMatchId(match);
                const backendMatch = backendMatchById.get(id);
                const settled = isSettled(match, backendMatch);

                return (
                  <tr
                    key={`overview-${id}`}
                    className="border-b border-design-border-soft last:border-b-0 hover:bg-design-muted/50"
                  >
                    <td className="sticky left-0 z-10 bg-design-card px-4 py-4 font-black text-design-secondary">
                      {match.matchNumber}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-base font-black text-design-text">
                        {match.vietnamTimeLabel}
                      </p>
                      <p className="mt-1 text-xs text-design-secondary">
                        {match.vietnamDateKey}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                        <p className="truncate text-right font-bold text-design-text">
                          {match.team1}
                        </p>
                        <span className="rounded-full border border-design-border-soft bg-design-card px-2 py-1 text-xs font-black text-design-secondary">
                          vs
                        </span>
                        <p className="truncate font-bold text-design-text">
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
                          {settled ? predictionValue(entry) : '***'}
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
