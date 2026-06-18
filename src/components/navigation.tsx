'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import {
  Users,
  Trophy,
  LogOut,
  Shield,
  Eye,
  Menu,
  Swords,
  Shirt,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import type { TranslationKey } from '@/lib/i18n';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { LanguageToggle } from '@/components/language-toggle';
import { useI18n } from '@/contexts/i18n-context';

type NavLink = {
  href: string;
  labelKey: TranslationKey;
  icon?: LucideIcon;
  iconSrc?: string;
};

const links: NavLink[] = [
  {
    href: '/world-cup',
    labelKey: 'nav.worldCup',
    iconSrc: '/fifa-world-cup-2026.png',
  },
  { href: '/next-match', labelKey: 'nav.nextMatch', icon: Swords },
  { href: '/players', labelKey: 'nav.players', icon: Users },
  { href: '/shirts', labelKey: 'nav.shirts', icon: Shirt },
  { href: '/leaderboard', labelKey: 'nav.leaderboard', icon: Trophy },
];

function SidebarTooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-airbnb bg-[#222222] px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-design-card transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 dark:bg-white dark:text-[#222222]">
      {children}
    </span>
  );
}

function NavIcon({
  link,
  imageClassName,
  iconClassName,
}: {
  link: NavLink;
  imageClassName: string;
  iconClassName: string;
}) {
  if (link.iconSrc) {
    return (
      <Image
        src={link.iconSrc}
        alt=""
        width={32}
        height={32}
        className={cn('flex-shrink-0 object-contain', imageClassName)}
      />
    );
  }

  if (!link.icon) return null;

  const Icon = link.icon;
  return <Icon className={iconClassName} />;
}

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, logout } = useAuth();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const roleLabel = role === 'admin' ? t('common.admin') : t('common.viewer');

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside
        className="fixed left-0 top-0 z-40 hidden h-full w-16 flex-col overflow-visible border-r border-design-border-soft bg-design-card shadow-design-card transition-colors duration-200 lg:flex"
      >
        {/* Logo row */}
        <div className="flex h-16 flex-shrink-0 items-center justify-center px-2">
          <Link
            href="/"
            aria-label="Chiateam home"
            className="group relative flex h-10 w-10 items-center justify-center rounded-full bg-design-active text-base font-bold text-design-primary-strong outline-none transition-colors hover:brightness-95 focus-visible:ring-2 focus-visible:ring-design-primary focus-visible:ring-offset-2 focus-visible:ring-offset-design-card dark:hover:brightness-110"
          >
            C
            <SidebarTooltip>Chiateam</SidebarTooltip>
          </Link>
        </div>

        {/* Divider */}
        <div className="mx-3 h-px flex-shrink-0 bg-design-border-soft" />

        {/* Nav links */}
        <nav className="flex flex-1 flex-col items-center gap-1 overflow-visible py-3">
          {links.map(link => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label={t(link.labelKey)}
                className={cn(
                  'group relative flex h-11 w-11 items-center justify-center rounded-airbnb border-l-2 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-design-primary focus-visible:ring-offset-2 focus-visible:ring-offset-design-card',
                  isActive
                    ? 'border-design-primary bg-design-active text-design-primary-strong'
                    : 'border-transparent text-design-secondary hover:bg-design-muted hover:text-design-text'
                )}
              >
                <NavIcon
                  link={link}
                  imageClassName="h-8 w-8 rounded-[4px]"
                  iconClassName="h-4 w-4 flex-shrink-0"
                />
                <SidebarTooltip>{t(link.labelKey)}</SidebarTooltip>
              </Link>
            );
          })}
        </nav>

        {/* Footer: role + theme + logout */}
        <div className="flex flex-shrink-0 flex-col items-center gap-1 px-2 pb-4">
          <div className="mb-3 h-px w-10 bg-design-border-soft" />

          {/* Role */}
          <div
            aria-label={roleLabel}
            className="group relative flex h-11 w-11 items-center justify-center rounded-airbnb text-design-secondary"
          >
            {role === 'admin' ? (
              <Shield className="h-4 w-4 text-design-primary" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <SidebarTooltip>{roleLabel}</SidebarTooltip>
          </div>

          <div className="group relative">
            <LanguageToggle className="h-11 w-11 rounded-airbnb p-0" />
            <SidebarTooltip>{t('common.language')}</SidebarTooltip>
          </div>

          {/* Theme */}
          <div className="group relative">
            <ThemeToggle className="h-11 w-11 rounded-airbnb" />
            <SidebarTooltip>{t('common.theme')}</SidebarTooltip>
          </div>

          {/* Logout */}
          <button
            onClick={() => void handleLogout()}
            aria-label={t('common.logout')}
            className="group relative flex h-11 w-11 items-center justify-center rounded-airbnb text-sm font-medium text-design-secondary outline-none transition-colors hover:bg-design-muted hover:text-design-primary focus-visible:ring-2 focus-visible:ring-design-primary focus-visible:ring-offset-2 focus-visible:ring-offset-design-card"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <SidebarTooltip>{t('common.logout')}</SidebarTooltip>
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Bar ──────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 border-b border-design-border-soft bg-design-card shadow-[var(--design-shadow-mobile)] lg:hidden"
      >
        <div className="flex items-center justify-between h-14 px-4">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-design-primary"
          >
            Chiateam
          </Link>

          <div className="flex items-center gap-1.5">
            <LanguageToggle className="h-9 rounded-full bg-design-muted px-2" />
            <ThemeToggle className="h-9 w-9 rounded-full bg-design-muted" />

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 rounded-airbnb p-0"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>

              <SheetContent
                side="right"
                className="w-[280px] border-design-border-soft bg-design-card p-0"
              >
                <div className="flex flex-col h-full">
                  <SheetHeader className="border-b border-design-border-soft px-5 pb-4 pt-5">
                    <SheetTitle className="text-left font-bold text-design-text">
                      {t('common.menu')}
                    </SheetTitle>
                  </SheetHeader>

                  <div className="flex flex-col flex-1 px-3 py-4 gap-4 overflow-y-auto">
                    {/* Role badge */}
                    <div className="flex items-center gap-2 rounded-airbnb bg-design-muted px-3 py-2.5">
                      {role === 'admin' ? (
                        <>
                          <Shield className="h-4 w-4 text-design-primary" />
                          <span className="text-sm font-medium text-design-text">
                            {t('common.admin')}
                          </span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 text-design-secondary" />
                          <span className="text-sm font-medium text-design-text">
                            {t('common.viewer')}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Nav links */}
                    <nav className="flex flex-col gap-1">
                      {links.map(link => {
                        const isActive = pathname === link.href;
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'flex items-center gap-3 px-3 py-3 rounded-airbnb text-base font-medium transition-colors',
                              isActive
                                ? 'bg-design-active text-design-primary-strong'
                                : 'text-design-secondary hover:bg-design-muted hover:text-design-text'
                            )}
                          >
                            <NavIcon
                              link={link}
                              imageClassName="h-6 w-6 rounded-[4px]"
                              iconClassName="h-5 w-5 flex-shrink-0"
                            />
                            {t(link.labelKey)}
                          </Link>
                        );
                      })}
                    </nav>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-design-border-soft px-3 pb-4 pt-3">
                    <button
                      onClick={() => {
                        void handleLogout();
                        setMobileOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-airbnb px-3 py-3 text-base font-medium text-design-secondary transition-colors hover:bg-design-muted hover:text-design-primary"
                    >
                      <LogOut className="w-5 h-5" />
                      {t('common.logout')}
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}
