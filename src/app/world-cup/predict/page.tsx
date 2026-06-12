'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageToggle } from '@/components/language-toggle';
import { useI18n } from '@/contexts/i18n-context';
import { apiClient } from '@/lib/api-client';

export default function WorldCupPredictionKeyPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [predictionKey, setPredictionKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const key = predictionKey.trim();

    if (!key) {
      setError(t('predictionKey.required'));
      return;
    }

    try {
      setLoading(true);
      await apiClient.getWorldCupMemberPredictions(key);
      window.localStorage.setItem('worldCupPredictionKey', key);
      router.push('/world-cup');
    } catch (error) {
      console.error('Failed to validate prediction key:', error);
      setError(t('memberPrediction.invalidLink'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-design-page px-4 py-8 text-design-text">
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(var(--design-border-soft) 1px, transparent 1px), linear-gradient(90deg, var(--design-border-soft) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="mb-3 flex items-center justify-between">
          <Link
            href="/login"
            className="text-sm font-semibold text-design-secondary transition-colors hover:text-design-primary"
          >
            {t('predictionKey.loginLink')}
          </Link>
          <LanguageToggle className="rounded-full bg-design-card shadow-design-card" />
        </div>

        <div className="rounded-large border border-design-border-soft bg-design-card p-8 shadow-design-card">
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-design-active text-design-primary-strong">
              <KeyRound className="h-7 w-7" />
            </div>
            <p className="design-section-label">
              {t('predictionKey.memberAccess')}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-design-text">
              {t('predictionKey.title')}
            </h1>
            <p className="mt-2 text-sm text-design-secondary">
              {t('predictionKey.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="prediction-key">{t('predictionKey.label')}</Label>
              <Input
                id="prediction-key"
                value={predictionKey}
                onChange={event => {
                  setPredictionKey(event.target.value);
                  setError('');
                }}
                placeholder={t('predictionKey.placeholder')}
                autoFocus
                className="h-11"
              />
            </div>

            {error && (
              <div className="animate-[shake_0.3s_ease-in-out] rounded-airbnb border border-[#ffd1d8] bg-design-active p-3 text-sm font-medium text-design-error dark:border-[#5a1a27]">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="h-11 w-full">
              {loading ? t('common.loading') : t('predictionKey.submit')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 flex items-start gap-3 rounded-airbnb border border-design-legal/30 bg-design-legal/10 px-4 py-3 text-sm text-design-text">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-design-legal" />
            <p>{t('worldCup.legalNotice')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
