'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context';
import { Navigation } from '@/components/navigation';
import { cn } from '@/lib/utils';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { collapsed } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (pathname === '/login') {
      if (isAuthenticated) {
        router.replace('/dashboard');
      }
      return;
    }

    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] dark:bg-[#111111]">
        <div
          className="w-10 h-10 rounded-full border-[3px] border-[#f2f2f2] dark:border-[#2e2e2e] animate-spin"
          style={{ borderTopColor: '#ff385c' }}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-[#111111]">
      <Navigation />
      <main
        className={cn(
          'transition-all duration-300 ease-in-out',
          /* Desktop: offset by sidebar width */
          collapsed ? 'lg:ml-16' : 'lg:ml-64'
        )}
      >
        <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-[1600px]">
          {children}
        </div>
      </main>
    </div>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <ProtectedLayout>{children}</ProtectedLayout>
      </SidebarProvider>
    </AuthProvider>
  );
}
