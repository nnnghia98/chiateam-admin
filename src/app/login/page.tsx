'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, Shield } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter a password');
      return;
    }

    setLoading(true);
    const success = await login(password);
    setLoading(false);

    if (success) {
      router.push('/');
    } else {
      setError('Invalid password. Please try again.');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] dark:bg-[#111111] px-4">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #222 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div
          className="bg-white dark:bg-[#1c1c1e] rounded-large p-8 w-full"
          style={{
            boxShadow:
              'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 16px 32px',
          }}
        >
          {/* Logo zone */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: '#fff0f2' }}
            >
              <span className="text-3xl">⚽</span>
            </div>
            <h1 className="text-2xl font-bold text-[#222222] dark:text-[#f5f5f5] tracking-tight">
              Chiateam Admin
            </h1>
            <p className="text-sm text-[#6a6a6a] dark:text-[#a3a3a3] mt-1.5 text-center">
              Enter your password to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-[#222222] dark:text-[#f5f5f5]"
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c1c1c1] dark:text-[#5a5a5a]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  className="pl-10 pr-10 h-11 rounded-airbnb border-[#c1c1c1] dark:border-[#2e2e2e] dark:bg-[#111111] dark:text-[#f5f5f5] focus:border-[#ff385c] focus:ring-1 focus:ring-[#ff385c] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c1c1c1] hover:text-[#6a6a6a] dark:text-[#5a5a5a] dark:hover:text-[#a3a3a3] transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-[#c13515] dark:text-[#ff6b6b] bg-red-50 dark:bg-[#3a1010] p-3 rounded-airbnb border border-red-100 dark:border-[#5a1010] animate-[shake_0.3s_ease-in-out]">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-airbnb bg-[#222222] hover:bg-[#333333] dark:bg-[#ff385c] dark:hover:bg-[#e00b41] text-white font-medium text-sm transition-colors disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  />
                  Signing in…
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Hint */}
          <div className="mt-6 pt-5 border-t border-[#f2f2f2] dark:border-[#2e2e2e]">
            <p className="text-xs text-[#6a6a6a] dark:text-[#5a5a5a] text-center font-medium mb-2">
              Access levels
            </p>
            <div className="flex justify-center gap-4 text-xs text-[#6a6a6a] dark:text-[#5a5a5a]">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-[#ff385c]" />
                Admin — full access
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Viewer — read-only
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
