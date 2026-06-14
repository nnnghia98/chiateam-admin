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
} from '@/types/world-cup';
import { ArrowLeft, LoaderCircle, ShieldCheck } from 'lucide-react';

type PageProps = {
  params: Promise<{ key: string }>;
};

type PredictionMap = Record<string, WorldCupPredictionEntry | null>;

function matchId(match: WorldCupMatch) {
  return String(match.id ?? match.matchNumber ?? '');
}

function outcomeToPick(value?: WorldCupOutcome | string | number | null): WorldCupPickValue | '' {
  if (value === 0 || value === '0') return '0';
  if (value === 1 || value === '1') return '1';
  if (value === 2 || value === '2') return '2';
  return '';
}

function pickToOutcome(pick: string): WorldCupOutcome | null {
  if (pick === '0') return 0;
  if (pick === '1') return 1;
  if (pick === '2') return 2;
  return null;
}

function predictionPick(prediction?: WorldCupPredictionEntry | null) {
  if (!prediction) return '';
  if (prediction.censored || prediction.value === '***') return '***';
  return outcomeToPick(prediction.value) || outcomeToPick(prediction.prediction);
}

function editablePredictionPick(prediction?: WorldCupPredictionEntry | null) {
  if (!prediction) return '';
  return outcomeToPick(prediction.value) || outcomeToPick(prediction.prediction);
}

function cleanPredictions(
  predictions: Record<string, WorldCupPredictionEntry | null>
) {
  return Object.fromEntries(
    Object.entries(predictions).map(([matchId, entry]) => [
      matchId,
      editablePredictionPick(entry) ? entry : null,
    ])
  );
}

function predictionsToDrafts(predictions: PredictionMap) {
  return Object.fromEntries(
    Object.entries(predictions).map(([matchId, entry]) => {
      const pick = predictionPick(entry);
      return [matchId, pick === '***' ? '' : pick];
    })
  );
}

function matchSchedule(match: WorldCupMatch) {
  return {
    date: String(match.date ?? ''),
    time: String(match.time ?? ''),
  };
}

function displayPick(pick: WorldCupPickValue | '***' | '' | '-') {
  if (pick === '0') return 'H';
  return pick;
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
        const aTime = `${a.date ?? ''} ${a.time ?? ''}`;
        const bTime = `${b.date ?? ''} ${b.time ?? ''}`;
        return aTime.localeCompare(bTime);
      }),
    [matches]
  );

  const loadPredictions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getWorldCupMemberPredictions(key);
      const loadedPredictions = cleanPredictions(
        response.predictions ?? response.entries ?? {}
      );
      window.localStorage.setItem('worldCupPredictionKey', key);
      setMember(response.member);
      setMatches(response.matches ?? []);
      setPredictions(loadedPredictions);
      setDrafts(predictionsToDrafts(loadedPredictions));
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

  const savePrediction = async (matchId: string, pick: WorldCupPickValue) => {
    const previousValue = drafts[matchId] ?? editablePredictionPick(predictions[matchId]);
    const prediction = pickToOutcome(pick);
    if (prediction === null) {
      alert(t('memberPrediction.saveError'));
      return;
    }

    try {
      setDrafts(current => ({ ...current, [matchId]: pick }));
      setSavingMatchId(matchId);
      const response = await apiClient.updateWorldCupMemberPrediction(
        key,
        matchId,
        prediction
      );
      const loadedPredictions = cleanPredictions(
        response.predictions ?? response.entries ?? {}
      );
      setPredictions(loadedPredictions);
      setDrafts(predictionsToDrafts(loadedPredictions));
    } catch (error) {
      console.error('Failed to save prediction:', error);
      setDrafts(current => ({ ...current, [matchId]: previousValue }));
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
              </tr>
            </thead>
            <tbody>
              {sortedMatches.map((match, index) => {
                const schedule = matchSchedule(match);
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
                    <td className="border border-design-border-soft bg-design-active/50 px-3 py-1 text-center">
                      {isClosed ? (
                        <span className="text-lg font-bold">
                          {displayPick(value || '-')}
                        </span>
                      ) : (
                        <div className="relative">
                          <select
                            value={value}
                            disabled={Boolean(savingMatchId)}
                            onChange={event =>
                              savePrediction(id, event.target.value as WorldCupPickValue)
                            }
                            className="h-10 w-full rounded-airbnb border border-design-border bg-design-card px-3 text-center text-lg font-bold text-design-text outline-none transition-opacity focus:border-design-primary focus:ring-2 focus:ring-design-primary/20 disabled:cursor-wait disabled:opacity-60"
                          >
                            <option value="" disabled>-</option>
                            <option value="0">H</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                          </select>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {savingMatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div
            className="flex items-center gap-3 rounded-card border border-design-border-soft bg-design-card px-5 py-4 text-design-text shadow-design-card"
            role="status"
            aria-live="polite"
          >
            <LoaderCircle className="h-5 w-5 animate-spin text-design-primary" />
            <span className="text-sm font-semibold">{t('common.loading')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
