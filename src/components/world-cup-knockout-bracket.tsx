'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CircleDotDashed,
  LoaderCircle,
  Lock,
  Save,
  Unlock,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getWorldCupEffectiveStatus } from '@/lib/world-cup-time';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import type {
  WorldCupPredictionSurfaceContext,
  WorldCupScheduleMatch,
} from '@/components/world-cup-schedule';
import type {
  WorldCupMatch,
  WorldCupMatchStatus,
  WorldCupOutcome,
  WorldCupPickValue,
} from '@/types/world-cup';

type RoundKey = 'r32' | 'r16' | 'qf' | 'sf' | 'final';

type WorldCupKnockoutMatch = WorldCupScheduleMatch;

type ScoreDraftMap = Record<string, { home: string; away: string }>;

type RoundConfig = {
  key: RoundKey;
  label: string;
  title: string;
  round: string;
  column: number;
};

const ROUND_CONFIGS: RoundConfig[] = [
  {
    key: 'r32',
    label: 'R32',
    title: 'Round of 32',
    round: 'Round of 32',
    column: 1,
  },
  {
    key: 'r16',
    label: 'R16',
    title: 'Round of 16',
    round: 'Round of 16',
    column: 2,
  },
  {
    key: 'qf',
    label: 'QF',
    title: 'Quarter-finals',
    round: 'Quarter-final',
    column: 3,
  },
  {
    key: 'sf',
    label: 'SF',
    title: 'Semi-finals',
    round: 'Semi-final',
    column: 4,
  },
  {
    key: 'final',
    label: 'F',
    title: 'Final',
    round: 'Final',
    column: 5,
  },
];

const ROUND_MATCH_ORDER: Partial<Record<RoundKey, number[]>> = {
  r32: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
  r16: [89, 90, 93, 94, 91, 92, 95, 96],
  qf: [97, 98, 99, 100],
  sf: [101, 102],
  final: [104],
};

const TEAM_BADGES: Record<string, string> = {
  Algeria: '🇩🇿',
  Argentina: '🇦🇷',
  Australia: '🇦🇺',
  Austria: '🇦🇹',
  Belgium: '🇧🇪',
  'Bosnia & Herzegovina': '🇧🇦',
  Brazil: '🇧🇷',
  Canada: '🇨🇦',
  'Cape Verde': '🇨🇻',
  Colombia: '🇨🇴',
  Croatia: '🇭🇷',
  Curaçao: '🇨🇼',
  'Czech Republic': '🇨🇿',
  'DR Congo': '🇨🇩',
  Ecuador: '🇪🇨',
  Egypt: '🇪🇬',
  England: '🏴',
  France: '🇫🇷',
  Germany: '🇩🇪',
  Ghana: '🇬🇭',
  Haiti: '🇭🇹',
  Iran: '🇮🇷',
  Iraq: '🇮🇶',
  'Ivory Coast': '🇨🇮',
  Japan: '🇯🇵',
  Jordan: '🇯🇴',
  Mexico: '🇲🇽',
  Morocco: '🇲🇦',
  Netherlands: '🇳🇱',
  'New Zealand': '🇳🇿',
  Norway: '🇳🇴',
  Panama: '🇵🇦',
  Paraguay: '🇵🇾',
  Portugal: '🇵🇹',
  Qatar: '🇶🇦',
  'Saudi Arabia': '🇸🇦',
  Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  Senegal: '🇸🇳',
  'South Africa': '🇿🇦',
  'South Korea': '🇰🇷',
  Spain: '🇪🇸',
  Sweden: '🇸🇪',
  Switzerland: '🇨🇭',
  Tunisia: '🇹🇳',
  Turkey: '🇹🇷',
  Uruguay: '🇺🇾',
  USA: '🇺🇸',
  Uzbekistan: '🇺🇿',
};

const ROUND_ROW_SPAN: Record<RoundKey, number> = {
  r32: 2,
  r16: 4,
  qf: 8,
  sf: 16,
  final: 32,
};

const CONNECTOR_HEIGHT: Record<RoundKey, string> = {
  r32: '11rem',
  r16: '22rem',
  qf: '44rem',
  sf: '88rem',
  final: '0',
};

function matchesForRound(matches: WorldCupKnockoutMatch[], config: RoundConfig) {
  const order = new Map(
    (ROUND_MATCH_ORDER[config.key] ?? []).map((matchNumber, index) => [
      matchNumber,
      index,
    ])
  );

  return matches
    .filter(match => match.round === config.round)
    .sort((left, right) => {
      const leftOrder = order.get(left.matchNumber) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = order.get(right.matchNumber) ?? Number.MAX_SAFE_INTEGER;

      return leftOrder - rightOrder || left.matchNumber - right.matchNumber;
    });
}

function scheduleMatchId(match: WorldCupKnockoutMatch) {
  return String(match.matchNumber);
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

function scheduleTeamPairKey(match: WorldCupKnockoutMatch) {
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

function goalsToResult(homeScore: number, awayScore: number): WorldCupOutcome {
  if (homeScore > awayScore) return 1;
  if (awayScore > homeScore) return 2;
  return 0;
}

function scoreDraftFromMatch(
  match: WorldCupKnockoutMatch,
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

function fallbackBackendMatch(
  match: WorldCupKnockoutMatch,
  backendMatch?: WorldCupMatch,
  overrides?: Partial<WorldCupMatch>
): WorldCupMatch {
  return {
    id: backendMatch?.id ?? scheduleMatchId(match),
    matchNumber: backendMatch?.matchNumber ?? match.matchNumber,
    date: backendMatch?.date ?? match.vietnamDateLabel,
    time: backendMatch?.time ?? match.vietnamTimeLabel,
    homeTeam: backendMatch?.homeTeam ?? match.team1,
    awayTeam: backendMatch?.awayTeam ?? match.team2,
    homeScore: backendMatch?.homeScore ?? match.score?.ft?.[0] ?? null,
    awayScore: backendMatch?.awayScore ?? match.score?.ft?.[1] ?? null,
    score:
      backendMatch?.score ??
      (match.score?.ft ? `${match.score.ft[0]}-${match.score.ft[1]}` : null),
    status: backendMatch?.status ?? (match.score?.ft ? 'SETTLED' : undefined),
    result:
      backendMatch?.result ??
      (match.score?.ft ? goalsToResult(match.score.ft[0], match.score.ft[1]) : null),
    ...overrides,
  };
}

function gridRowForRound(key: RoundKey, index: number) {
  if (key === 'final') return '1 / span 32';

  const span = ROUND_ROW_SPAN[key];
  return `${index * span + 1} / span ${span}`;
}

function isPlaceholderTeam(team: string) {
  return /^(?:[123][A-L](?:\/[A-L])*|[WL]\d+|TBD)$/i.test(team.trim());
}

function teamInitials(team: string) {
  return team
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
}

function teamBadge(team: string) {
  return TEAM_BADGES[team] ?? (isPlaceholderTeam(team) ? '' : teamInitials(team));
}

function scoreForSide(match: WorldCupKnockoutMatch, side: 'home' | 'away') {
  if (!match.score?.ft) return null;
  return side === 'home' ? match.score.ft[0] : match.score.ft[1];
}

function winnerSide(match: WorldCupKnockoutMatch) {
  const score = match.score?.ft;
  if (!score || score[0] === score[1]) return null;
  return score[0] > score[1] ? 'home' : 'away';
}

function roundLabel(match: WorldCupKnockoutMatch) {
  return `${match.vietnamDateLabel.replace(/,\s*2026$/, '')} · ${
    match.vietnamTimeLabel
  }`;
}

function TeamSlot({
  match,
  side,
  backendMatch,
  canEdit,
  predictionContext,
  scoreDraft,
  adminBusy,
  onScoreDraftChange,
}: {
  match: WorldCupKnockoutMatch;
  side: 'home' | 'away';
  backendMatch?: WorldCupMatch;
  canEdit: boolean;
  predictionContext?: WorldCupPredictionSurfaceContext;
  scoreDraft?: { home: string; away: string };
  adminBusy: boolean;
  onScoreDraftChange: (
    matchId: string,
    side: 'home' | 'away',
    value: string
  ) => void;
}) {
  const id = scheduleMatchId(match);
  const team = side === 'home' ? match.team1 : match.team2;
  const placeholder = isPlaceholderTeam(team);
  const score =
    side === 'home'
      ? typeof backendMatch?.homeScore === 'number'
        ? backendMatch.homeScore
        : scoreForSide(match, side)
      : typeof backendMatch?.awayScore === 'number'
        ? backendMatch.awayScore
        : scoreForSide(match, side);
  const winner = winnerSide(match) === side;
  const badge = teamBadge(team);
  const draftValue = side === 'home' ? scoreDraft?.home ?? '' : scoreDraft?.away ?? '';
  const pickValue: WorldCupPickValue = side === 'home' ? '1' : '2';
  const predictionUnlocked = Boolean(predictionContext?.isPredictionUnlocked);
  const selectedPrediction = predictionContext?.getPredictionValue(match);
  const predictionBusy = predictionContext?.savingMatchId === id;
  const canSelectPrediction = Boolean(
    predictionUnlocked &&
      predictionContext?.canPredictMatch(match) &&
      !placeholder &&
      !canEdit
  );
  const isSelectedPrediction = selectedPrediction === pickValue;

  const content = (
    <>
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[17px]',
          placeholder
            ? 'bg-white/10 text-[10px] font-black tracking-[0.08em] text-white/58'
            : 'bg-white text-black shadow-[0_0_0_1px_rgba(255,255,255,0.26)]'
        )}
      >
        {badge || <CircleDotDashed className="h-4 w-4" aria-hidden="true" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{team}</span>
      {canEdit ? (
        <input
          type="text"
          value={draftValue}
          disabled={adminBusy}
          onChange={event => onScoreDraftChange(id, side, event.target.value)}
          className="h-8 w-9 rounded-airbnb border border-white/18 bg-white/9 px-1 text-center text-sm font-black tabular-nums text-white outline-none transition focus:border-white/55 focus:bg-white/14 disabled:opacity-45"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          aria-label={`${team} score`}
        />
      ) : predictionUnlocked ? (
        <span
          className={cn(
            'inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black transition',
            isSelectedPrediction
              ? 'border-white bg-white text-[#101943]'
              : 'border-white/24 bg-white/8 text-white/58',
            predictionBusy && 'opacity-55'
          )}
          aria-hidden="true"
        >
          {predictionBusy ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : isSelectedPrediction ? (
            '✓'
          ) : (
            pickValue
          )}
        </span>
      ) : null}
    </>
  );

  if (!canEdit && predictionUnlocked) {
    return (
      <button
        type="button"
        disabled={!canSelectPrediction || predictionBusy}
        onClick={() => predictionContext?.savePrediction(match, pickValue)}
        className={cn(
          'flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm font-bold leading-none transition',
          placeholder ? 'text-white/54' : 'text-white',
          winner && 'text-[#fbfffe]',
          isSelectedPrediction && 'bg-white/12 text-white',
          canSelectPrediction && 'hover:bg-white/9',
          (!canSelectPrediction || predictionBusy) &&
            'cursor-not-allowed disabled:opacity-75'
        )}
        aria-pressed={isSelectedPrediction}
        aria-label={`Predict ${team}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'flex min-h-11 items-center gap-3 px-4 text-sm font-bold leading-none',
        placeholder ? 'text-white/54' : 'text-white',
        winner && 'text-[#fbfffe]'
      )}
    >
      {content}
    </div>
  );
}

function MatchStatusControl({
  match,
  backendMatch,
  canEdit,
  adminBusy,
  onStatusChange,
}: {
  match: WorldCupKnockoutMatch;
  backendMatch?: WorldCupMatch;
  canEdit: boolean;
  adminBusy: boolean;
  onStatusChange: (
    match: WorldCupKnockoutMatch,
    status: WorldCupMatchStatus
  ) => void;
}) {
  if (!canEdit) return <span className="ml-3 h-8 w-20 shrink-0" aria-hidden="true" />;

  const effectiveMatch = fallbackBackendMatch(match, backendMatch);
  const isPredictionOpen = getWorldCupEffectiveStatus(effectiveMatch) === 'OPEN';
  const Icon = adminBusy ? LoaderCircle : isPredictionOpen ? Unlock : Lock;
  const nextStatus: WorldCupMatchStatus = isPredictionOpen ? 'LOCKED' : 'OPEN';

  return (
    <button
      type="button"
      disabled={adminBusy}
      onClick={() => onStatusChange(match, nextStatus)}
      className={cn(
        'ml-3 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-airbnb border px-2 text-[11px] font-black uppercase tracking-[0.02em] transition',
        isPredictionOpen
          ? 'border-emerald-300/35 bg-emerald-300/12 text-emerald-100 hover:bg-emerald-300/18'
          : 'border-white/18 bg-white/9 text-white/70 hover:bg-white/14',
        'disabled:cursor-not-allowed disabled:opacity-55'
      )}
      aria-label={isPredictionOpen ? 'Lock match prediction' : 'Open match prediction'}
    >
      <Icon
        className={cn('h-3.5 w-3.5', adminBusy && 'animate-spin')}
        aria-hidden="true"
      />
      {isPredictionOpen ? 'Lock' : 'Open'}
    </button>
  );
}

function Connector({
  roundKey,
  index,
}: {
  roundKey: RoundKey;
  index: number;
}) {
  if (roundKey === 'final') return null;

  const isUpperMatch = index % 2 === 0;

  return (
    <div
      className="pointer-events-none absolute left-full top-1/2 hidden h-px w-9 bg-white/24 xl:block"
      aria-hidden="true"
    >
      <span
        className={cn(
          'absolute right-0 w-px bg-white/24',
          isUpperMatch ? 'top-0' : 'bottom-0'
        )}
        style={{ height: CONNECTOR_HEIGHT[roundKey] }}
      />
      <span className="absolute left-full top-0 h-px w-9 bg-white/24" />
    </div>
  );
}

function MatchCard({
  match,
  roundKey,
  index,
  backendMatch,
  canEdit,
  predictionContext,
  scoreDraft,
  adminBusy,
  onScoreDraftChange,
  onStatusChange,
  onResultSave,
}: {
  match: WorldCupKnockoutMatch;
  roundKey: RoundKey;
  index: number;
  backendMatch?: WorldCupMatch;
  canEdit: boolean;
  predictionContext?: WorldCupPredictionSurfaceContext;
  scoreDraft?: { home: string; away: string };
  adminBusy: boolean;
  onScoreDraftChange: (
    matchId: string,
    side: 'home' | 'away',
    value: string
  ) => void;
  onStatusChange: (
    match: WorldCupKnockoutMatch,
    status: WorldCupMatchStatus
  ) => void;
  onResultSave: (match: WorldCupKnockoutMatch) => void;
}) {
  const isFinal = roundKey === 'final';

  return (
    <article
      className={cn(
        'group relative z-10 min-h-[7.25rem] overflow-visible rounded-card border text-white shadow-[0_18px_46px_rgba(0,0,0,0.28)] transition duration-200',
        'border-white/10 bg-[#101943]/88 hover:-translate-y-0.5 hover:border-white/24 hover:bg-[#131f52]',
        isFinal && 'border-[#ff385c]/40 bg-[#0a1234] shadow-[0_0_0_1px_rgba(255,56,92,0.22),0_22px_60px_rgba(0,0,0,0.36)]'
      )}
    >
      <Connector roundKey={roundKey} index={index} />
      <div className="flex min-h-10 items-center justify-between border-b border-white/20 px-4 text-[13px] font-black tracking-[0.01em] text-white/58">
        <span className="truncate">{roundLabel(match)}</span>
        <MatchStatusControl
          match={match}
          backendMatch={backendMatch}
          canEdit={canEdit}
          adminBusy={adminBusy}
          onStatusChange={onStatusChange}
        />
      </div>
      <TeamSlot
        match={match}
        side="home"
        backendMatch={backendMatch}
        canEdit={canEdit}
        predictionContext={predictionContext}
        scoreDraft={scoreDraft}
        adminBusy={adminBusy}
        onScoreDraftChange={onScoreDraftChange}
      />
      <div className="h-px bg-white/9" />
      <TeamSlot
        match={match}
        side="away"
        backendMatch={backendMatch}
        canEdit={canEdit}
        predictionContext={predictionContext}
        scoreDraft={scoreDraft}
        adminBusy={adminBusy}
        onScoreDraftChange={onScoreDraftChange}
      />
      <div className="flex items-center gap-2 border-t border-white/8 px-4 py-2 text-[11px] font-semibold text-white/40">
        <span className="block truncate">{match.ground}</span>
        {canEdit && (
          <button
            type="button"
            disabled={adminBusy}
            onClick={() => onResultSave(match)}
            className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/16 bg-white/9 text-white transition hover:bg-white/16 disabled:cursor-not-allowed disabled:opacity-55"
            aria-label="Save match result"
          >
            {adminBusy ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
    </article>
  );
}

function RoundColumnHeader({ config }: { config: RoundConfig }) {
  return (
    <div
      className="z-20 flex h-10 items-center justify-between rounded-airbnb border border-white/10 bg-white/8 px-3 text-white backdrop-blur"
      style={{ gridColumn: config.column }}
    >
      <span className="text-sm font-black">{config.label}</span>
      <span className="text-xs font-semibold text-white/48">{config.title}</span>
    </div>
  );
}

export function WorldCupKnockoutBracket({
  matches,
  predictionContext,
}: {
  matches: WorldCupKnockoutMatch[];
  predictionContext?: WorldCupPredictionSurfaceContext;
}) {
  const { canEdit } = useAuth();
  const [backendMatches, setBackendMatches] = useState<WorldCupMatch[]>([]);
  const [scoreDrafts, setScoreDrafts] = useState<ScoreDraftMap>({});
  const [savingAdminMatchId, setSavingAdminMatchId] = useState<string | null>(null);
  const roundMatches = new Map(
    ROUND_CONFIGS.map(config => [
      config.key,
      matchesForRound(matches, config),
    ])
  );
  const bronzeMatch = matches
    .filter(match => match.round === 'Match for third place')
    .sort((left, right) => left.matchNumber - right.matchNumber)[0];
  const backendMatchById = useMemo(
    () => indexedBackendMatches(backendMatches),
    [backendMatches]
  );

  const upsertBackendMatch = useCallback((match: WorldCupMatch | null | undefined) => {
    const nextId = backendMatchId(match);
    if (!nextId || !match) return;

    setBackendMatches(current => [
      ...current.filter(item => backendMatchId(item) !== nextId),
      match,
    ]);
  }, []);

  const loadAdminMatches = useCallback(async () => {
    if (!canEdit) return;

    try {
      const response = await apiClient.getWorldCupMatches();
      setBackendMatches(toBackendMatchArray(response));
    } catch (loadError) {
      console.error('Failed to load World Cup matches for knockout bracket:', loadError);
    }
  }, [canEdit]);

  useEffect(() => {
    void loadAdminMatches();
  }, [loadAdminMatches]);

  useEffect(() => {
    if (!canEdit) return;

    setScoreDrafts(current => {
      const next = { ...current };
      matches.forEach(match => {
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
  }, [backendMatchById, canEdit, matches]);

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

  const updateMatchResult = async (match: WorldCupKnockoutMatch) => {
    const id = scheduleMatchId(match);
    const backendMatch =
      backendMatchById.get(id) ?? backendMatchById.get(scheduleTeamPairKey(match));
    const scoreDraft = scoreDrafts[id] ?? scoreDraftFromMatch(match, backendMatch);
    const homeScore = Number(scoreDraft.home);
    const awayScore = Number(scoreDraft.away);

    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      return;
    }

    const result = goalsToResult(homeScore, awayScore);
    const score = `${homeScore}-${awayScore}`;
    const resultMatchId = backendMatchId(backendMatch) || id;

    try {
      setSavingAdminMatchId(id);
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
      console.error('Failed to set World Cup knockout result:', saveError);
    } finally {
      setSavingAdminMatchId(null);
    }
  };

  const updatePredictionStatus = async (
    match: WorldCupKnockoutMatch,
    status: WorldCupMatchStatus
  ) => {
    const id = scheduleMatchId(match);
    const backendMatch =
      backendMatchById.get(id) ?? backendMatchById.get(scheduleTeamPairKey(match));
    const statusMatchId = backendMatchId(backendMatch) || id;

    try {
      setSavingAdminMatchId(id);
      const response = await apiClient.setWorldCupMatchStatus(statusMatchId, status);
      upsertBackendMatch(
        responseMatch(response) ??
          fallbackBackendMatch(match, backendMatch, { status })
      );
      await loadAdminMatches();
    } catch (saveError) {
      console.error('Failed to update World Cup knockout status:', saveError);
    } finally {
      setSavingAdminMatchId(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-large bg-[#26347f] text-white shadow-[0_24px_70px_rgba(17,17,17,0.22)]">
      <div className="relative isolate overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_22%_0%,rgba(255,255,255,0.12),transparent_26%),linear-gradient(180deg,#2d3989_0%,#1d286d_45%,#101842_100%)]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-[linear-gradient(90deg,rgba(255,56,92,0.22),transparent_35%,rgba(255,255,255,0.08)_70%,transparent)]" />

        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <div className="relative h-20 w-20 overflow-hidden rounded-[18px] bg-white p-2 shadow-[0_10px_32px_rgba(0,0,0,0.22)]">
            <Image
              src="/fifa-world-cup-2026.png"
              alt="FIFA World Cup 2026"
              fill
              className="object-contain p-2"
              sizes="80px"
              priority
            />
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-white/50">
            Knockout bracket
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight tracking-[-0.02em] text-white sm:text-4xl">
            FIFA World Cup 2026
          </h2>
        </div>

        <div className="-mx-4 mt-8 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div
            className="grid min-w-[86rem] gap-x-12 pb-2"
            style={{
              gridTemplateColumns: 'repeat(5, minmax(15.5rem, 1fr))',
              gridTemplateRows: 'repeat(32, 5.5rem)',
            }}
          >
            {ROUND_CONFIGS.map(config => (
              <RoundColumnHeader key={config.key} config={config} />
            ))}

            {ROUND_CONFIGS.flatMap(config =>
              (roundMatches.get(config.key) ?? []).map((match, index) => (
                (() => {
                  const id = scheduleMatchId(match);
                  const backendMatch =
                    backendMatchById.get(id) ??
                    backendMatchById.get(scheduleTeamPairKey(match));
                  return (
                    <div
                      key={match.matchNumber}
                      className="self-center"
                      style={{
                        gridColumn: config.column,
                        gridRow: gridRowForRound(config.key, index),
                      }}
                    >
                      <MatchCard
                        match={match}
                        roundKey={config.key}
                        index={index}
                        backendMatch={backendMatch}
                        canEdit={canEdit}
                        predictionContext={predictionContext}
                        scoreDraft={
                          scoreDrafts[id] ?? scoreDraftFromMatch(match, backendMatch)
                        }
                        adminBusy={savingAdminMatchId === id}
                        onScoreDraftChange={updateScoreDraft}
                        onStatusChange={(matchStatus, status) =>
                          void updatePredictionStatus(matchStatus, status)
                        }
                        onResultSave={matchResult => void updateMatchResult(matchResult)}
                      />
                    </div>
                  );
                })()
              ))
            )}
          </div>
        </div>

        {bronzeMatch && (
          <div className="mx-auto mt-1 flex max-w-6xl items-center justify-between gap-4 rounded-card border border-white/10 bg-white/8 px-4 py-3 text-sm text-white/70">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                Third place
              </p>
              <p className="mt-1 font-bold text-white">
                {bronzeMatch.team1} vs {bronzeMatch.team2}
              </p>
            </div>
            <p className="text-right text-xs font-semibold">
              {roundLabel(bronzeMatch)}
              <span className="block text-white/42">{bronzeMatch.ground}</span>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
