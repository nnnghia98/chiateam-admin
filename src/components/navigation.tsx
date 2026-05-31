'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Users,
  Trophy,
  Calendar,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const links = [
  { href: '/next-match', label: 'Next Match', icon: Swords },
  { href: '/players', label: 'Players', icon: Users },
  { href: '/shirts', label: 'Shirts', icon: Shirt },
  { href: '/matches', label: 'Matches', icon: Calendar },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

function SidebarTooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-airbnb bg-[#222222] px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-airbnb-card transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100 dark:bg-white dark:text-[#222222]">
      {children}
    </span>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside
        className="fixed left-0 top-0 z-40 hidden h-full w-16 flex-col overflow-visible border-r border-[#f2f2f2] bg-white transition-colors duration-200 dark:border-[#2e2e2e] dark:bg-[#1c1c1e] lg:flex"
        style={{
          boxShadow:
            'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px',
        }}
      >
        {/* Logo row */}
        <div className="flex h-16 flex-shrink-0 items-center justify-center px-2">
          <Link
            href="/"
            aria-label="Chiateam home"
            className="group relative flex h-10 w-10 items-center justify-center rounded-full bg-[#fff0f2] text-base font-bold text-[#ff385c] outline-none transition-colors hover:bg-[#ffe4e9] focus-visible:ring-2 focus-visible:ring-[#ff385c] focus-visible:ring-offset-2 dark:bg-[#3a1020] dark:hover:bg-[#4a1428] dark:focus-visible:ring-offset-[#1c1c1e]"
          >
            C
            <SidebarTooltip>Chiateam</SidebarTooltip>
          </Link>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#f2f2f2] dark:bg-[#2e2e2e] mx-3 flex-shrink-0" />

        {/* Nav links */}
        <nav className="flex flex-1 flex-col items-center gap-1 overflow-visible py-3">
          {links.map(link => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                className={cn(
                  'group relative flex h-11 w-11 items-center justify-center rounded-airbnb border-l-2 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#ff385c] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1c1c1e]',
                  isActive
                    ? 'border-[#ff385c] bg-[#fff0f2] text-[#ff385c] dark:bg-[#3a1020]'
                    : 'border-transparent text-[#6a6a6a] hover:bg-[#f2f2f2] hover:text-[#222222] dark:text-[#a3a3a3] dark:hover:bg-[#2a2a2a] dark:hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <SidebarTooltip>{link.label}</SidebarTooltip>
              </Link>
            );
          })}
        </nav>

        {/* Footer: role + theme + logout */}
        <div className="flex flex-shrink-0 flex-col items-center gap-1 px-2 pb-4">
          <div className="mb-3 h-px w-10 bg-[#f2f2f2] dark:bg-[#2e2e2e]" />

          {/* Role */}
          <div
            aria-label={role === 'admin' ? 'Admin' : 'Viewer'}
            className="group relative flex h-11 w-11 items-center justify-center rounded-airbnb text-[#6a6a6a] dark:text-[#a3a3a3]"
          >
            {role === 'admin' ? (
              <Shield className="h-4 w-4 text-[#ff385c]" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <SidebarTooltip>{role === 'admin' ? 'Admin' : 'Viewer'}</SidebarTooltip>
          </div>

          {/* Theme */}
          <div className="group relative">
            <ThemeToggle className="h-11 w-11 rounded-airbnb hover:bg-[#f2f2f2] dark:hover:bg-[#2a2a2a]" />
            <SidebarTooltip>Theme</SidebarTooltip>
          </div>

          {/* Logout */}
          <button
            onClick={() => void handleLogout()}
            aria-label="Logout"
            className="group relative flex h-11 w-11 items-center justify-center rounded-airbnb text-sm font-medium text-[#6a6a6a] outline-none transition-colors hover:bg-[#f2f2f2] hover:text-[#ff385c] focus-visible:ring-2 focus-visible:ring-[#ff385c] focus-visible:ring-offset-2 dark:text-[#a3a3a3] dark:hover:bg-[#2a2a2a] dark:focus-visible:ring-offset-[#1c1c1e]"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <SidebarTooltip>Logout</SidebarTooltip>
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Bar ──────────────────────────────────── */}
      <header
        className="lg:hidden sticky top-0 z-40 bg-white dark:bg-[#1c1c1e] border-b border-[#f2f2f2] dark:border-[#2e2e2e]"
        style={{ boxShadow: 'rgba(0,0,0,0.04) 0px 2px 8px' }}
      >
        <div className="flex items-center justify-between h-14 px-4">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight"
            style={{ color: '#ff385c' }}
          >
            Chiateam
          </Link>

          <div className="flex items-center gap-1.5">
            <ThemeToggle className="w-9 h-9 rounded-full bg-[#f2f2f2] dark:bg-[#2a2a2a]" />

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#e0e0e0] dark:border-[#2e2e2e] dark:bg-[#2a2a2a] dark:text-[#f5f5f5] rounded-airbnb w-9 h-9 p-0"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>

              <SheetContent
                side="right"
                className="w-[280px] bg-white dark:bg-[#1c1c1e] border-[#f2f2f2] dark:border-[#2e2e2e] p-0"
              >
                <div className="flex flex-col h-full">
                  <SheetHeader className="px-5 pt-5 pb-4 border-b border-[#f2f2f2] dark:border-[#2e2e2e]">
                    <SheetTitle className="text-[#222222] dark:text-[#f5f5f5] font-bold text-left">
                      Menu
                    </SheetTitle>
                  </SheetHeader>

                  <div className="flex flex-col flex-1 px-3 py-4 gap-4 overflow-y-auto">
                    {/* Role badge */}
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-[#f2f2f2] dark:bg-[#2a2a2a] rounded-airbnb">
                      {role === 'admin' ? (
                        <>
                          <Shield className="w-4 h-4 text-[#ff385c]" />
                          <span className="text-sm font-medium text-[#222222] dark:text-[#f5f5f5]">
                            Admin
                          </span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 text-[#6a6a6a]" />
                          <span className="text-sm font-medium text-[#222222] dark:text-[#f5f5f5]">
                            Viewer
                          </span>
                        </>
                      )}
                    </div>

                    {/* Nav links */}
                    <nav className="flex flex-col gap-1">
                      {links.map(link => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'flex items-center gap-3 px-3 py-3 rounded-airbnb text-base font-medium transition-colors',
                              isActive
                                ? 'bg-[#fff0f2] dark:bg-[#3a1020] text-[#ff385c]'
                                : 'text-[#6a6a6a] dark:text-[#a3a3a3] hover:bg-[#f2f2f2] dark:hover:bg-[#2a2a2a] hover:text-[#222222] dark:hover:text-white'
                            )}
                          >
                            <Icon className="w-5 h-5" />
                            {link.label}
                          </Link>
                        );
                      })}
                    </nav>
                  </div>

                  {/* Logout */}
                  <div className="px-3 pb-4 border-t border-[#f2f2f2] dark:border-[#2e2e2e] pt-3">
                    <button
                      onClick={() => {
                        void handleLogout();
                        setMobileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-airbnb text-base font-medium text-[#6a6a6a] dark:text-[#a3a3a3] hover:bg-[#f2f2f2] dark:hover:bg-[#2a2a2a] hover:text-[#ff385c] transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      Logout
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
