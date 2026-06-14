'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageToggle } from '@/components/language-toggle';
import { useI18n } from '@/contexts/i18n-context';
import { Lock, Eye, Shield } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError(t('login.required'));
      return;
    }

    setLoading(true);
    const success = await login(password);
    setLoading(false);

    if (success) {
      router.push('/');
    } else {
      setError(t('login.invalid'));
      setPassword('');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-design-page px-4 text-design-text">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(var(--design-border-soft) 1px, transparent 1px), linear-gradient(90deg, var(--design-border-soft) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-3 flex justify-end">
          <LanguageToggle className="rounded-full bg-design-card shadow-design-card" />
        </div>
        {/* Card */}
        <div className="w-full rounded-large border border-design-border-soft bg-design-card p-8 shadow-design-card">
          {/* Logo zone */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-design-active text-design-primary-strong">
              <Shield className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-design-text">
              Chiateam Admin
            </h1>
            <p className="mt-1.5 text-center text-sm text-design-secondary">
              {t('login.subtitle')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-design-text"
              >
                {t('login.password')}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-design-secondary" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('login.placeholder')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  className="h-11 pl-10 pr-10"
                />
                <button
                  type="button"
                  aria-label={
                    showPassword ? t('login.hidePassword') : t('login.showPassword')
                  }
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-design-secondary transition-colors hover:text-design-text"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="animate-[shake_0.3s_ease-in-out] rounded-airbnb border border-[#ffd1d8] bg-design-active p-3 text-sm font-medium text-design-error dark:border-[#5a1a27]">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  />
                  {t('login.signingIn')}
                </span>
              ) : (
                t('login.signIn')
              )}
            </Button>
          </form>

          {/* Hint */}
          <div className="mt-6 border-t border-design-border-soft pt-5">
            <p className="mb-2 text-center text-xs font-medium text-design-secondary">
              {t('login.accessLevels')}
            </p>
            <div className="flex justify-center gap-4 text-xs text-design-secondary">
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-design-primary" />
                {t('login.adminAccess')}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {t('login.viewerAccess')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
