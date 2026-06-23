'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { I18nProvider } from '@/contexts/i18n-context';
import { Navigation } from '@/components/navigation';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    try {
      window.localStorage.removeItem('worldCupPredictionKey');
      Object.keys(window.localStorage)
        .filter(key => key.startsWith('worldCupPredictionDrafts:'))
        .forEach(key => window.localStorage.removeItem(key));
    } catch {}
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (pathname === '/login') {
      if (isAuthenticated) {
        router.replace('/');
      }
      return;
    }

    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [
    isAuthenticated,
    isLoading,
    pathname,
    router,
  ]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-design-page">
        <div
          className="h-10 w-10 animate-spin rounded-full border-[3px] border-design-muted border-t-design-primary"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-design-page text-design-text">
      <Navigation />
      <main className="transition-all duration-300 ease-in-out lg:ml-16">
        <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <ProtectedLayout>{children}</ProtectedLayout>
      </AuthProvider>
    </I18nProvider>
  );
}
