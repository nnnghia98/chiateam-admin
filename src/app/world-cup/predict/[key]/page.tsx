'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { isWorldCupPredictionClosed } from '@/lib/world-cup-time';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/skeleton';
import { LanguageToggle } from '@/components/language-toggle';
import { useI18n } from '@/contexts/i18n-context';
import type {
  WorldCupMatch,
  WorldCupMember,
  WorldCupOutcome,
  WorldCupPickValue,
  WorldCupPredictionEntry,
  WorldCupScore,
  WorldCupWinner,
} from '@/types/world-cup';
import { ArrowLeft, Save, ShieldCheck } from 'lucide-react';

type PageProps = {
  params: Promise<{ key: string }>;
};

type PredictionMap = Record<string, WorldCupPredictionEntry>;

function matchId(match: WorldCupMatch) {
  return String(match.id ?? match.matchNumber ?? '');
}

function outcomeToPick(value?: WorldCupOutcome | string | number | null): WorldCupPickValue | '' {
  if (value === 0 || value === '0') return '0';
  if (value === 1 || value === '1') return '1';
  if (value === 2 || value === '2') return '2';
  return '';
}

function winnerToPick(winner?: WorldCupWinner | null): WorldCupPickValue | '' {
  if (winner === 'HOME') return '1';
  if (winner === 'AWAY') return '2';
  if (winner === 'DRAW') return '0';
  return '';
}

function pickToOutcome(pick: string): WorldCupOutcome | null {
  if (pick === '0') return 0;
  if (pick === '1') return 1;
  if (pick === '2') return 2;
  return null;
}

function predictionPick(prediction?: WorldCupPredictionEntry) {
  if (!prediction) return '';
  if (prediction.censored || prediction.value === '***') return '***';
  return outcomeToPick(prediction.value) || winnerToPick(prediction.winner);
}

function scoreText(result: WorldCupScore | null | undefined) {
  return result ? `${result.homeScore}-${result.awayScore}` : '';
}

function splitKickoff(match: WorldCupMatch) {
  const anyMatch = match as any;
  if (anyMatch.date || anyMatch.time) {
    return {
      date: String(anyMatch.date ?? ''),
      time: String(anyMatch.time ?? ''),
    };
  }

  const parts = String(match.kickoff || '').trim().split(/\s+/);
  return {
    date: parts[0] ?? '',
    time: parts.slice(1).join(' ') || '',
  };
}

function resultPick(match: WorldCupMatch) {
  const result = match.result;
  if (typeof result === 'number' || typeof result === 'string') {
    return outcomeToPick(result);
  }
  return winnerToPick(result?.winner) || scoreText(result) || '';
}

export default function WorldCupMemberPredictionPage({ params }: PageProps) {
  const { key } = use(params);
  const { t } = useI18n();
  const [member, setMember] = useState<WorldCupMember | null>(null);
  const [matches, setMatches] = useState<WorldCupMatch[]>([]);
  const [predictions, setPredictions] = useState<PredictionMap>({});
  const [drafts, setDrafts] = useState<Record<string, WorldCupPickValue | ''>>({});
  const [loading, setLoading] = useState(true);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);

  const sortedMatches = useMemo(
    () =>
      [...matches].sort((a, b) => {
        const aTime = `${a.date ?? ''} ${a.time ?? ''} ${a.kickoff ?? ''}`;
        const bTime = `${b.date ?? ''} ${b.time ?? ''} ${b.kickoff ?? ''}`;
        return aTime.localeCompare(bTime);
      }),
    [matches]
  );

  const loadPredictions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getWorldCupMemberPredictions(key);
      const loadedPredictions = response.predictions ?? response.entries ?? {};
      setMember(response.member);
      setMatches(response.matches ?? []);
      setPredictions(loadedPredictions);
      setDrafts(
        Object.fromEntries(
          Object.entries(loadedPredictions).map(([matchId, entry]) => [
            matchId,
            predictionPick(entry) as WorldCupPickValue | '',
          ])
        )
      );
    } catch (error) {
      console.error('Failed to load member predictions:', error);
      alert(t('memberPrediction.invalidLink'));
    } finally {
      setLoading(false);
    }
  }, [key, t]);

  useEffect(() => {
    void loadPredictions();
  }, [loadPredictions]);

  const savePrediction = async (matchId: string) => {
    try {
      setSavingMatchId(matchId);
      await apiClient.updateWorldCupMemberPrediction(
        key,
        matchId,
        pickToOutcome(drafts[matchId] ?? '')
      );
      await loadPredictions();
    } catch (error) {
      console.error('Failed to save prediction:', error);
      alert(t('memberPrediction.saveError'));
    } finally {
      setSavingMatchId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-design-page p-4">
        <div className="mx-auto max-w-6xl space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-[520px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-design-page p-3 text-design-text sm:p-5">
      <div className="mx-auto mb-3 flex max-w-6xl items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/world-cup">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Link>
        </Button>
        <LanguageToggle className="rounded-full bg-design-card shadow-design-card" />
      </div>
      <div className="mx-auto max-w-6xl overflow-hidden rounded-airbnb border border-design-border-soft bg-design-card shadow-design-card">
        <div className="border-b border-design-border-soft bg-design-text px-4 py-4 text-center">
          <h1 className="text-3xl font-black tracking-normal text-design-card sm:text-5xl">
            {t('worldCup.title')}
          </h1>
        </div>

        <div className="flex items-start gap-3 border-b border-design-border-soft bg-design-muted px-4 py-3 text-sm">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-design-legal" />
          <p>
            {t('memberPrediction.privateLink')}{' '}
            <strong>{member?.name ?? t('memberPrediction.you')}</strong>.{' '}
            {t('memberPrediction.instructions')}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-lg">
            <thead>
              <tr className="bg-design-muted text-xl font-black">
                <th className="w-24 border border-design-border-soft px-3 py-2">{t('worldCup.round')}</th>
                <th className="w-32 border border-design-border-soft px-3 py-2">{t('worldCup.date')}</th>
                <th className="w-28 border border-design-border-soft px-3 py-2">{t('worldCup.time')}</th>
                <th className="w-48 border border-design-border-soft px-3 py-2">{t('worldCup.teamOne')}</th>
                <th className="w-48 border border-design-border-soft px-3 py-2">{t('worldCup.teamTwo')}</th>
                <th className="w-32 border border-design-border-soft bg-design-active px-3 py-2 text-design-primary-strong">
                  {member?.name ?? t('memberPrediction.you')}
                </th>
                <th className="w-28 border border-design-border-soft px-3 py-2">{t('common.save')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedMatches.map((match, index) => {
                const kickoff = splitKickoff(match);
                const id = matchId(match);
                const value =
                  drafts[id] ?? predictionPick(predictions[id]);
                const isClosed = isWorldCupPredictionClosed(match);
                return (
                  <tr
                    key={id}
                    className={index % 2 === 0 ? 'bg-design-card' : 'bg-design-muted/50'}
                  >
                    <td className="border border-design-border-soft px-3 py-2 text-center font-semibold">
                      {t('worldCup.round')} {index + 1}
                    </td>
                    <td className="border border-design-border-soft px-3 py-2 text-center">
                      {kickoff.date}
                    </td>
                    <td className="border border-design-border-soft px-3 py-2 text-center">
                      {kickoff.time}
                    </td>
                    <td className="border border-design-border-soft px-3 py-2 font-medium">
                      {match.homeTeam}
                    </td>
                    <td className="border border-design-border-soft px-3 py-2 font-medium">
                      {match.awayTeam}
                    </td>
                    <td className="border border-design-border-soft bg-design-active/50 px-3 py-1 text-center">
                      {isClosed ? (
                        <span className="text-lg font-bold">
                          {value || '-'}
                        </span>
                      ) : (
                        <select
                          value={value}
                          onChange={event =>
                            setDrafts({
                              ...drafts,
                              [id]: event.target.value as WorldCupPickValue | '',
                            })
                          }
                          className="h-10 w-full rounded-airbnb border border-design-border bg-design-card px-3 text-center text-lg font-bold text-design-text outline-none focus:border-design-primary focus:ring-2 focus:ring-design-primary/20"
                        >
                          <option value="">-</option>
                          <option value="0">0</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                        </select>
                      )}
                    </td>
                    <td className="border border-design-border-soft px-2 py-1 text-center">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isClosed || savingMatchId === id}
                        onClick={() => savePrediction(id)}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {t('common.save')}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
