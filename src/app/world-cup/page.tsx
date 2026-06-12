'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { getWorldCupEffectiveStatus } from '@/lib/world-cup-time';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/skeleton';
import type {
  WorldCupLeaderboardRow,
  WorldCupMatch,
  WorldCupMatchPayload,
  WorldCupMember,
  WorldCupMemberKey,
  WorldCupOutcome,
  WorldCupOverallResponse,
  WorldCupPickValue,
  WorldCupPredictionEntry,
} from '@/types/world-cup';
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  KeyRound,
  ListPlus,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';

const MATCH_NUMBER_PATTERN = /^\d+$/;

type FixtureFormState = {
  matchNumber: string;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
};

type MemberKeyFormState = {
  memberId: string;
  name: string;
};

type PredictionBoard = Record<string, Record<string, WorldCupPredictionEntry | null>>;

type ParsedBulkFixture = Required<WorldCupMatchPayload> & {
  lineNumber: number;
};

function emptyForm(): FixtureFormState {
  return { matchNumber: '', date: '', time: '', homeTeam: '', awayTeam: '' };
}

function splitBulkFixtureLine(line: string) {
  if (line.includes('|')) return line.split('|');
  if (line.includes('\t')) return line.split('\t');
  return line.split(',');
}

function matchId(match: WorldCupMatch) {
  return String(match.id ?? match.matchNumber ?? '');
}

function outcomeToPick(value?: WorldCupOutcome | string | number | null): WorldCupPickValue | '' {
  if (value === 0 || value === '0') return '0';
  if (value === 1 || value === '1') return '1';
  if (value === 2 || value === '2') return '2';
  return '';
}

function rawPredictionPick(prediction?: WorldCupPredictionEntry | null) {
  if (!prediction) return '';
  return outcomeToPick(prediction.value) || outcomeToPick(prediction.prediction);
}

function predictionPick(prediction?: WorldCupPredictionEntry | null) {
  if (!prediction) return '';
  if (prediction.censored || prediction.value === '***') return '***';
  return rawPredictionPick(prediction);
}

function displayPick(pick: WorldCupPickValue | '***' | '' | '-') {
  if (pick === '0') return 'H';
  return pick;
}

function visiblePredictionPick(
  prediction: WorldCupPredictionEntry | null | undefined,
  status: ReturnType<typeof getWorldCupEffectiveStatus>
) {
  const pick = status === 'OPEN'
    ? predictionPick(prediction) || '***'
    : rawPredictionPick(prediction) || '-';
  return displayPick(pick);
}

function toMatchArray(response: any): WorldCupMatch[] {
  const rawMatches = Array.isArray(response)
    ? response
    : Array.isArray(response?.matches)
      ? response.matches
      : response?.matches && typeof response.matches === 'object'
        ? Object.values(response.matches)
        : [];

  return rawMatches as WorldCupMatch[];
}

function memberId(member: WorldCupMember | WorldCupMemberKey) {
  const keyLike = member as WorldCupMemberKey;
  return String(
    member.id ??
      member.userId ??
      member.memberId ??
      keyLike.member?.id ??
      keyLike.member?.memberId ??
      keyLike.memberKey?.memberId ??
      member.playerNumber
  );
}

function memberKeyValue(member: WorldCupMemberKey) {
  return (
    member.displayKey ??
    member.publicKey ??
    member.numericKey ??
    member.key ??
    member.accessKey ??
    member.predictionKey ??
    member.memberKey?.displayKey ??
    member.memberKey?.publicKey ??
    member.memberKey?.numericKey ??
    member.memberKey?.key ??
    ''
  );
}

function memberDisplayKey(member: WorldCupMemberKey) {
  const value =
    member.memberId ??
    member.userId ??
    member.member?.memberId ??
    member.member?.id ??
    member.id ??
    member.playerNumber;

  return value === undefined || value === null ? '' : String(value);
}

function normalizeMemberKeyResponse(response: unknown): WorldCupMemberKey[] {
  if (Array.isArray(response)) return response as WorldCupMemberKey[];
  if (!response || typeof response !== 'object') return [];

  const data = response as {
    keys?: WorldCupMemberKey[];
    memberKeys?: WorldCupMemberKey[];
    members?: WorldCupMemberKey[];
  };

  return data.memberKeys ?? data.keys ?? data.members ?? [];
}

function toMemberArray(
  members: WorldCupOverallResponse['members']
): WorldCupMember[] {
  if (Array.isArray(members)) return members;
  if (members && typeof members === 'object') {
    return Object.values(members);
  }
  return [];
}

function enrichMemberKeys(
  keys: WorldCupMemberKey[],
  members: WorldCupMember[]
): WorldCupMemberKey[] {
  const memberMap = new Map(members.map(member => [memberId(member), member]));
  const keyMap = new Map(keys.map(key => [memberId(key), key]));

  return Array.from(new Set([...memberMap.keys(), ...keyMap.keys()]))
    .map(id => {
      const key = keyMap.get(id);
      const member = key?.member ?? memberMap.get(id);
      return {
        ...(key ?? {}),
        id,
        memberId: key?.memberId ?? member?.memberId ?? id,
        name: key?.name ?? member?.name ?? id,
        username: key?.username ?? member?.username ?? null,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'vi'));
}

function hasActiveMemberKey(member: WorldCupMemberKey) {
  return Boolean(memberKeyValue(member)) && !member.revokedAt;
}

function normalizeMembers(
  response: WorldCupOverallResponse | null,
  keys: WorldCupMemberKey[],
  leaderboard: WorldCupLeaderboardRow[],
  matches: WorldCupMatch[]
) {
  const members = new Map<string, WorldCupMember>();
  const add = (member: Partial<WorldCupMember> | null | undefined) => {
    if (!member) return;
    const id = String(
      member.id ?? member.userId ?? member.memberId ?? member.playerNumber ?? ''
    );
    if (!id) return;
    members.set(id, {
      id,
      userId: member.userId,
      memberId: member.memberId,
      playerNumber: member.playerNumber,
      name: member.name || id,
      username: member.username ?? null,
    });
  };

  toMemberArray(response?.members).forEach(add);
  keys.forEach(add);
  leaderboard.forEach(row => add(row));

  const entries = response?.predictions ?? response?.entries ?? {};
  const matchIds = new Set(matches.map(match => matchId(match)));
  Object.entries(entries).forEach(([outerId, inner]) => {
    if (matchIds.has(outerId)) {
      Object.values(inner ?? {}).forEach(entry => {
        if (entry) add(entry);
      });
    } else {
      Object.values(inner ?? {}).forEach(entry => {
        if (entry) {
          add({ id: outerId, name: entry.name, username: entry.username });
        }
      });
    }
  });

  return Array.from(members.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function normalizePredictionBoard(
  response: WorldCupOverallResponse | null,
  matches: WorldCupMatch[]
): PredictionBoard {
  const raw = response?.predictions ?? {};
  const matchIds = new Set(matches.map(match => matchId(match)));
  const board: PredictionBoard = {};

  Object.entries(raw).forEach(([outerId, inner]) => {
    Object.entries(inner ?? {}).forEach(([innerId, entry]) => {
      const matchId = matchIds.has(outerId) ? outerId : innerId;
      const userId = matchIds.has(outerId)
        ? String(entry?.userId ?? innerId)
        : outerId;
      board[userId] = {
        ...(board[userId] ?? {}),
        [matchId]: entry ? { ...entry, userId } : null,
      };
    });
  });

  return board;
}

function calculateTotals(
  members: WorldCupMember[],
  matches: WorldCupMatch[],
  board: PredictionBoard,
  response: WorldCupOverallResponse | null,
  leaderboard: WorldCupLeaderboardRow[]
) {
  const leaderboardTotals = new Map(
    leaderboard.map(row => [String(row.userId), row.points])
  );

  return Object.fromEntries(
    members.map(member => {
      const id = memberId(member);
      const explicit = response?.totals?.[id] ?? leaderboardTotals.get(id);
      if (typeof explicit === 'number') return [id, explicit];

      const total = matches.reduce((sum, match) => {
        const prediction = board[id]?.[matchId(match)];
        const pick = predictionPick(prediction);
        const result = resultPick(match);
        return sum + (pick && result && pick === result ? 1 : 0);
      }, 0);
      return [id, total];
    })
  );
}

function matchSchedule(match: WorldCupMatch) {
  return {
    date: String(match.date ?? ''),
    time: String(match.time ?? ''),
  };
}

function resultPick(match: WorldCupMatch) {
  return outcomeToPick(match.result);
}

function resultDisplay(match: WorldCupMatch) {
  return displayPick(resultPick(match) || '-');
}

export default function WorldCupPage() {
  const { canEdit, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useI18n();
  const [predictionKey, setPredictionKey] = useState('');
  const [predictionKeyChecked, setPredictionKeyChecked] = useState(false);
  const [matches, setMatches] = useState<WorldCupMatch[]>([]);
  const [members, setMembers] = useState<WorldCupMember[]>([]);
  const [memberKeys, setMemberKeys] = useState<WorldCupMemberKey[]>([]);
  const [predictionBoard, setPredictionBoard] = useState<PredictionBoard>({});
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'bulk' | null>(null);
  const [formData, setFormData] = useState<FixtureFormState>(emptyForm);
  const [bulkFixtures, setBulkFixtures] = useState('');
  const [resultMatch, setResultMatch] = useState<WorldCupMatch | null>(null);
  const [resultScore, setResultScore] = useState('');
  const [keyForm, setKeyForm] = useState<MemberKeyFormState>({
    memberId: '',
    name: '',
  });

  const sortedMatches = useMemo(
    () =>
      [...matches].sort((a, b) => {
        const aTime = `${a.date ?? ''} ${a.time ?? ''}`;
        const bTime = `${b.date ?? ''} ${b.time ?? ''}`;
        return aTime.localeCompare(bTime);
      }),
    [matches]
  );

  useEffect(() => {
    try {
      setPredictionKey(window.localStorage.getItem('worldCupPredictionKey') || '');
    } catch {
      setPredictionKey('');
    } finally {
      setPredictionKeyChecked(true);
    }
  }, []);

  const loadWorldCupData = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated && !predictionKeyChecked) return;

    try {
      setLoading(true);
      if (!isAuthenticated && predictionKey) {
        const response = await apiClient.getWorldCupMemberPredictions(predictionKey);
        const loadedMatches = toMatchArray(response);
        const member = response.member;
        const id = memberId(member);
        const board = { [id]: response.predictions ?? {} };

        setMatches(loadedMatches);
        setMembers([member]);
        setMemberKeys([]);
        setPredictionBoard(board);
        setTotals(calculateTotals([member], loadedMatches, board, null, []));
        return;
      }

      const [overallResponse, keysResponse] =
        await Promise.all([
          apiClient.getWorldCupPredictions().catch(() => null),
          canEdit
            ? apiClient.getWorldCupMemberKeys().catch(() => [])
            : Promise.resolve([]),
        ]);

      const loadedMatches = toMatchArray(overallResponse);
      const keys = normalizeMemberKeyResponse(keysResponse);
      const leaderboard: WorldCupLeaderboardRow[] = [];
      const normalizedMembers = normalizeMembers(
        overallResponse,
        keys,
        leaderboard,
        loadedMatches
      );
      const board = normalizePredictionBoard(overallResponse, loadedMatches);

      setMatches(loadedMatches);
      setMembers(normalizedMembers);
      setMemberKeys(enrichMemberKeys(keys, normalizedMembers));
      setPredictionBoard(board);
      setTotals(
        calculateTotals(normalizedMembers, loadedMatches, board, overallResponse, leaderboard)
      );
    } catch (error) {
      console.error('Failed to load World Cup predictions:', error);
      alert(t('worldCup.loadError'));
    } finally {
      setLoading(false);
    }
  }, [authLoading, canEdit, isAuthenticated, predictionKey, predictionKeyChecked, t]);

  useEffect(() => {
    void loadWorldCupData();
  }, [loadWorldCupData]);

  const validateFixtureForm = () => {
    const matchNumber = formData.matchNumber.trim();
    if (formMode === 'create' && !MATCH_NUMBER_PATTERN.test(matchNumber)) {
      alert(t('worldCup.invalidMatchId'));
      return null;
    }
    if (!formData.homeTeam.trim() || !formData.awayTeam.trim()) {
      alert(t('worldCup.homeTeamRequired'));
      return null;
    }
    if (!formData.date.trim() || !formData.time.trim()) {
      alert(t('worldCup.kickoffRequired'));
      return null;
    }

    const payload: WorldCupMatchPayload = {
      date: formData.date.trim(),
      time: formData.time.trim(),
      homeTeam: formData.homeTeam.trim(),
      awayTeam: formData.awayTeam.trim(),
    };
    if (formMode === 'create') payload.matchNumber = Number(matchNumber);
    return payload;
  };

  const handleSaveFixture = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = validateFixtureForm();
    if (!payload || !formMode) return;

    try {
      setSaving(true);
      if (formMode === 'create') {
        await apiClient.createWorldCupMatch(payload as Required<WorldCupMatchPayload>);
      } else {
        await apiClient.updateWorldCupMatch(formData.matchNumber, payload);
      }
      setFormMode(null);
      setFormData(emptyForm());
      await loadWorldCupData();
    } catch (error) {
      console.error('Failed to save fixture:', error);
      alert(t('worldCup.saveFixtureError'));
    } finally {
      setSaving(false);
    }
  };

  const parseBulkFixtures = () => {
    const parsed: ParsedBulkFixture[] = [];
    const errors: string[] = [];
    const seen = new Set<string>();
    const existing = new Set(matches.map(match => matchId(match).toUpperCase()));

    bulkFixtures.split(/\r?\n/).forEach((rawLine, index) => {
      const line = rawLine.trim();
      if (!line) return;

      const parts = splitBulkFixtureLine(line).map(part => part.trim());
      if (index === 0 && parts[0]?.toUpperCase() === 'MATCH_NUMBER') return;

      if (parts.length < 5) {
        errors.push(t('worldCup.bulkLineFormat', { line: String(index + 1) }));
        return;
      }

      const id = parts[0];
      const date = parts[1];
      const time = parts[2];
      const homeTeam = parts[3];
      const awayTeam = parts.slice(4).join(line.includes(',') ? ',' : ' | ').trim();

      if (!MATCH_NUMBER_PATTERN.test(id)) {
        errors.push(t('worldCup.bulkInvalidId', { line: String(index + 1), id }));
      }
      if (!date || !time || !homeTeam || !awayTeam) {
        errors.push(t('worldCup.bulkMissingFields', { line: String(index + 1) }));
      }
      if (seen.has(id) || existing.has(id)) {
        errors.push(t('worldCup.bulkDuplicateId', { line: String(index + 1), id }));
      }

      seen.add(id);
      parsed.push({
        matchNumber: Number(id),
        date,
        time,
        homeTeam,
        awayTeam,
        lineNumber: index + 1,
      });
    });

    if (parsed.length === 0 && errors.length === 0) {
      errors.push(t('worldCup.bulkEmpty'));
    }

    return { parsed, errors };
  };

  const handleBulkCreateFixtures = async (event: React.FormEvent) => {
    event.preventDefault();
    const { parsed, errors } = parseBulkFixtures();

    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    try {
      setSaving(true);
      for (const fixture of parsed) {
        await apiClient.createWorldCupMatch({
          matchNumber: fixture.matchNumber,
          date: fixture.date,
          time: fixture.time,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
        });
      }
      setFormMode(null);
      setBulkFixtures('');
      await loadWorldCupData();
    } catch (error) {
      console.error('Failed to bulk create fixtures:', error);
      alert(t('worldCup.bulkCreateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleSetResult = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resultMatch) return;
    const result = resultScore.trim();
    const pick = outcomeToPick(result);
    if (!pick) {
      alert(t('worldCup.scoreFormat'));
      return;
    }

    try {
      setSaving(true);
      await apiClient.setWorldCupMatchResult(matchId(resultMatch), Number(pick) as WorldCupOutcome);
      setResultMatch(null);
      setResultScore('');
      await loadWorldCupData();
    } catch (error) {
      console.error('Failed to set result:', error);
      alert(t('worldCup.setResultError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (match: WorldCupMatch) => {
    const id = matchId(match);
    if (!confirm(t('worldCup.deleteFixtureConfirm', { id }))) {
      return;
    }

    try {
      setSaving(true);
      await apiClient.deleteWorldCupMatch(id);
      await loadWorldCupData();
    } catch (error) {
      console.error('Failed to delete fixture:', error);
      alert(t('worldCup.deleteFixtureError'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateKey = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!keyForm.memberId.trim() || !keyForm.name.trim()) {
      alert(t('worldCup.createKeyRequired'));
      return;
    }

    try {
      setSaving(true);
      await apiClient.createWorldCupMemberKey({
        memberId: keyForm.memberId.trim(),
        name: keyForm.name.trim(),
      });
      setKeyForm({ memberId: '', name: '' });
      await loadWorldCupData();
    } catch (error) {
      console.error('Failed to create member key:', error);
      alert(t('worldCup.createKeyError'));
    } finally {
      setSaving(false);
    }
  };

  const copyPredictionLink = async (key: string) => {
    const url = `${window.location.origin}/world-cup/predict/${encodeURIComponent(key)}`;
    await navigator.clipboard.writeText(url);
  };

  const isMemberWorldCupView = !authLoading && !isAuthenticated && Boolean(predictionKey);
  const pageClassName = isMemberWorldCupView
    ? 'mx-auto min-h-screen max-w-[1600px] space-y-5 bg-design-page px-4 py-6 text-design-text lg:px-8 lg:py-8'
    : 'space-y-5';

  if (authLoading || loading) {
    return (
      <div
        className={
          isMemberWorldCupView
            ? 'mx-auto min-h-screen max-w-[1600px] space-y-4 bg-design-page px-4 py-6 lg:px-8 lg:py-8'
            : 'space-y-4'
        }
      >
        <Skeleton className="h-20" />
        <Skeleton className="h-[520px]" />
      </div>
    );
  }

  return (
    <div className={pageClassName}>
      {isMemberWorldCupView && (
        <div className="flex flex-col gap-3 rounded-airbnb border border-design-border-soft bg-design-card px-4 py-3 shadow-design-card sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-design-text">
              {t('worldCup.memberViewTitle')}
            </p>
            <p className="text-sm text-design-secondary">
              {t('worldCup.memberViewDescription')}
            </p>
          </div>
          <Button asChild>
            <Link href={`/world-cup/predict/${encodeURIComponent(predictionKey)}`}>
              {t('worldCup.goToMyPredictions')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-airbnb border border-design-border-soft bg-design-card text-design-text shadow-design-card">
        <div className="border-b border-design-border-soft bg-design-text px-5 py-3 text-center">
          <h1 className="text-2xl font-black tracking-normal text-design-card sm:text-4xl">
            {t('worldCup.title')}
          </h1>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-sm text-design-text">
            <thead>
              <tr className="bg-design-muted text-lg font-black">
                <th colSpan={5} className="border border-design-border-soft px-2 py-1" />
                <th className="border border-design-border-soft px-2 py-1 text-right">
                  {t('worldCup.totalPoints')}
                </th>
                {members.map(member => (
                  <th
                    key={memberId(member)}
                    className="border border-design-border-soft bg-design-card px-3 py-1 text-center"
                  >
                    {totals[memberId(member)] ?? 0}
                  </th>
                ))}
              </tr>
              <tr className="bg-design-muted text-base font-black">
                <th className="w-24 border border-design-border-soft px-3 py-2">{t('worldCup.round')}</th>
                <th className="w-32 border border-design-border-soft px-3 py-2">{t('worldCup.date')}</th>
                <th className="w-28 border border-design-border-soft px-3 py-2">{t('worldCup.time')}</th>
                <th className="w-48 border border-design-border-soft px-3 py-2">{t('worldCup.teamOne')}</th>
                <th className="w-48 border border-design-border-soft px-3 py-2">{t('worldCup.teamTwo')}</th>
                <th className="w-40 border border-design-border-soft px-3 py-2">
                  {t('worldCup.actualResult')}
                </th>
                {members.map(member => (
                  <th
                    key={memberId(member)}
                    className="w-32 border border-design-border-soft bg-design-active px-3 py-2 text-design-primary-strong"
                  >
                    {member.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedMatches.length === 0 ? (
                <tr>
                  <td
                    colSpan={6 + members.length}
                    className="border border-design-border-soft px-3 py-12 text-center text-base text-design-secondary"
                  >
                    {t('worldCup.noFixtures')}
                  </td>
                </tr>
              ) : (
                sortedMatches.map((match, index) => {
                  const schedule = matchSchedule(match);
                  const id = matchId(match);
                  const status = getWorldCupEffectiveStatus(match);
                  return (
                    <tr
                      key={id}
                      className={index % 2 === 0 ? 'bg-design-card' : 'bg-design-muted/50'}
                    >
                      <td className="border border-design-border-soft px-3 py-2 text-center font-semibold">
                        {match.matchNumber ?? index + 1}
                      </td>
                      <td className="border border-design-border-soft px-3 py-2 text-center">
                        {schedule.date}
                      </td>
                      <td className="border border-design-border-soft px-3 py-2 text-center">
                        {schedule.time}
                      </td>
                      <td className="border border-design-border-soft px-3 py-2 font-medium">
                        {match.homeTeam}
                      </td>
                      <td className="border border-design-border-soft px-3 py-2 font-medium">
                        {match.awayTeam}
                      </td>
                      <td className="border border-design-border-soft px-3 py-2 text-center text-lg font-bold">
                        {resultDisplay(match)}
                      </td>
                      {members.map(member => {
                        const memberKey = memberId(member);
                        const prediction = predictionBoard[memberKey]?.[id];
                        return (
                          <td
                            key={`${memberKey}-${id}`}
                            className="border border-design-border-soft bg-design-active/50 px-3 py-2 text-center text-lg font-semibold"
                          >
                            {visiblePredictionPick(prediction, status)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-airbnb border border-design-legal/30 bg-design-legal/10 px-4 py-3 text-sm text-design-text">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-design-legal" />
        <p>
          {t('worldCup.legalNotice')}
        </p>
      </div>

      {canEdit && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">{t('worldCup.fixtures')}</CardTitle>
                  <CardDescription>
                    {t('worldCup.fixturesDescription')}
                  </CardDescription>
                </div>
                {!formMode && !resultMatch && (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setFormMode('create')} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      {t('worldCup.addFixture')}
                    </Button>
                    <Button
                      onClick={() => setFormMode('bulk')}
                      size="sm"
                      variant="outline"
                    >
                      <ListPlus className="mr-2 h-4 w-4" />
                      {t('worldCup.addFixtureList')}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formMode && formMode !== 'bulk' && (
                <form onSubmit={handleSaveFixture} className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-5">
                    <div className="space-y-2">
                      <Label htmlFor="match-id">{t('worldCup.matchId')}</Label>
                      <Input
                        id="match-id"
                        value={formData.matchNumber}
                        onChange={event =>
                          setFormData({
                            ...formData,
                            matchNumber: event.target.value,
                          })
                        }
                        disabled={formMode === 'edit'}
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="match-date">{t('worldCup.date')}</Label>
                      <Input
                        id="match-date"
                        type="date"
                        value={formData.date}
                        onChange={event =>
                          setFormData({ ...formData, date: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="match-time">{t('worldCup.time')}</Label>
                      <Input
                        id="match-time"
                        type="time"
                        value={formData.time}
                        onChange={event =>
                          setFormData({ ...formData, time: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="home-team">{t('worldCup.teamOne')}</Label>
                      <Input
                        id="home-team"
                        value={formData.homeTeam}
                        onChange={event =>
                          setFormData({ ...formData, homeTeam: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="away-team">{t('worldCup.teamTwo')}</Label>
                      <Input
                        id="away-team"
                        value={formData.awayTeam}
                        onChange={event =>
                          setFormData({ ...formData, awayTeam: event.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {t('common.save')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFormMode(null);
                        setFormData(emptyForm());
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      {t('common.cancel')}
                    </Button>
                  </div>
                </form>
              )}

              {formMode === 'bulk' && (
                <form onSubmit={handleBulkCreateFixtures} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-fixtures">
                      {t('worldCup.fixtureList')}
                    </Label>
                    <textarea
                      id="bulk-fixtures"
                      value={bulkFixtures}
                      onChange={event => setBulkFixtures(event.target.value)}
                      rows={7}
                      className="flex min-h-[168px] w-full rounded-airbnb border border-design-input-border bg-design-input px-3 py-2 text-sm text-design-text shadow-sm outline-none transition-colors placeholder:text-design-placeholder focus:border-design-input-focus focus:ring-2 focus:ring-design-input-focus/20 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="1 | 2026-06-12 | 08:00 | Mexico | South Africa&#10;2 | 2026-06-13 | 07:00 | USA | Canada"
                    />
                    <p className="text-xs text-design-secondary">
                      {t('worldCup.fixtureListHelp')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {t('worldCup.createFixtureList')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFormMode(null);
                        setBulkFixtures('');
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      {t('common.cancel')}
                    </Button>
                  </div>
                </form>
              )}

              {resultMatch && (
                <form onSubmit={handleSetResult} className="flex flex-col gap-3 sm:flex-row">
                  <div className="space-y-2 sm:w-56">
                    <Label htmlFor="result-score">{t('worldCup.actualScore')}</Label>
                    <select
                      id="result-score"
                      value={resultScore}
                      onChange={event => setResultScore(event.target.value)}
                      className="h-10 w-full rounded-airbnb border border-design-input-border bg-design-input px-3 text-sm text-design-text outline-none focus:border-design-input-focus focus:ring-2 focus:ring-design-input-focus/20"
                    >
                      <option value="">-</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="0">H</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button type="submit" disabled={saving}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {t('worldCup.saveResult')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setResultMatch(null)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      {t('common.cancel')}
                    </Button>
                  </div>
                </form>
              )}

              <div className="max-h-[440px] overflow-auto rounded-airbnb border border-design-border-soft">
                {sortedMatches.map(match => {
                  const id = matchId(match);
                  const schedule = matchSchedule(match);
                  const status = getWorldCupEffectiveStatus(match);
                  return (
                  <div
                    key={id}
                    className="grid gap-2 border-b border-design-border-soft p-3 text-sm last:border-b-0 md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <p className="font-bold text-design-text">
                        {id} · {match.homeTeam} vs {match.awayTeam}
                      </p>
                      <p className="mt-1 text-xs text-design-secondary">
                        {schedule.date} {schedule.time} · {status} · {t('common.result')} {resultDisplay(match)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 md:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        aria-label={t('worldCup.editFixture', { id })}
                        onClick={() => {
                          setFormMode('edit');
                          setResultMatch(null);
                          setFormData({
                            matchNumber: id,
                            date: schedule.date,
                            time: schedule.time,
                            homeTeam: match.homeTeam,
                            awayTeam: match.awayTeam,
                          });
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        aria-label={t('worldCup.setResultFor', { id })}
                        onClick={() => {
                          setResultMatch(match);
                          setFormMode(null);
                          setResultScore(resultPick(match));
                        }}
                      >
                        <Trophy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 w-8 p-0"
                        aria-label={t('worldCup.deleteFixture', { id })}
                        onClick={() => handleDelete(match)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4" />
                {t('worldCup.memberKeys')}
              </CardTitle>
              <CardDescription>
                {t('worldCup.memberKeysDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleCreateKey} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="member-id">{t('worldCup.memberId')}</Label>
                    <Input
                      id="member-id"
                      value={keyForm.memberId}
                      onChange={event =>
                        setKeyForm({ ...keyForm, memberId: event.target.value })
                      }
                      placeholder="nghia"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="member-name">{t('common.name')}</Label>
                    <Input
                      id="member-name"
                      value={keyForm.name}
                      onChange={event =>
                        setKeyForm({ ...keyForm, name: event.target.value })
                      }
                      placeholder="Nghĩa"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={saving} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('worldCup.createKey')}
                </Button>
              </form>

              <div className="max-h-[420px] space-y-2 overflow-auto">
                {memberKeys.length === 0 ? (
                  <div className="rounded-airbnb border border-dashed border-design-border-soft p-5 text-center text-sm text-design-secondary">
                    {t('worldCup.noMemberKeys')}
                  </div>
                ) : (
                  memberKeys.map(item => {
                    const id = memberId(item);
                    const predictionKey = memberKeyValue(item);
                    const activeKey = hasActiveMemberKey(item);
                    const displayKey = predictionKey || memberDisplayKey(item);
                    return (
                      <div
                        key={id}
                        className="rounded-airbnb border border-design-border-soft p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-design-text">{item.name}</p>
                            <p className="truncate text-xs text-design-secondary">
                              {displayKey || t('worldCup.keyHidden')}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              aria-label={t('worldCup.copyKey', { name: item.name })}
                              onClick={() =>
                                predictionKey && copyPredictionLink(predictionKey)
                              }
                              disabled={!activeKey}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              aria-label={t('worldCup.regenerateKey', { name: item.name })}
                              onClick={async () => {
                                await apiClient.regenerateWorldCupMemberKey(id);
                                await loadWorldCupData();
                              }}
                              disabled={!activeKey}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="h-8 w-8 p-0"
                              aria-label={t('worldCup.deleteKey', { name: item.name })}
                              onClick={async () => {
                                await apiClient.deleteWorldCupMemberKey(id);
                                await loadWorldCupData();
                              }}
                              disabled={!activeKey}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
