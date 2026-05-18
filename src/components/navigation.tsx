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
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useSidebar } from '@/contexts/sidebar-context';
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
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/next-match', label: 'Next Match', icon: Swords },
  { href: '/players', label: 'Players', icon: Users },
  { href: '/matches', label: 'Matches', icon: Calendar },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, logout } = useAuth();
  const { collapsed, toggle } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <>
      {/* ── Desktop Backdrop ───────────────────────────────── */}
      <button
        type="button"
        aria-label="Close sidebar"
        onClick={collapsed ? undefined : toggle}
        className={cn(
          'hidden lg:block fixed inset-0 z-30 bg-[#222222]/40 dark:bg-black/50 transition-opacity duration-300 ease-in-out',
          collapsed
            ? 'pointer-events-none opacity-0'
            : 'pointer-events-auto opacity-100'
        )}
      />

      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed left-0 top-0 h-full bg-white dark:bg-[#1c1c1e] z-40 transition-all duration-300 ease-in-out',
          collapsed ? 'w-16' : 'w-64'
        )}
        style={{
          boxShadow:
            'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px',
        }}
      >
        {/* Logo row */}
        <div
          className={cn(
            'flex items-center h-16 px-3 flex-shrink-0',
            collapsed ? 'justify-center' : 'justify-between px-4'
          )}
        >
          {!collapsed && (
            <Link
              href="/"
              className="text-lg font-bold tracking-tight truncate"
              style={{ color: '#ff385c' }}
            >
              Chiateam
            </Link>
          )}
          <button
            onClick={toggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-8 h-8 rounded-full bg-[#f2f2f2] dark:bg-[#2a2a2a] flex items-center justify-center text-[#6a6a6a] dark:text-[#a3a3a3] hover:text-[#222222] dark:hover:text-white transition-colors flex-shrink-0"
          >
            {collapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#f2f2f2] dark:bg-[#2e2e2e] mx-3 flex-shrink-0" />

        {/* Nav links */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          {links.map(link => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                title={collapsed ? link.label : undefined}
                className={cn(
                  'flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-airbnb text-sm font-medium transition-all duration-150 border-l-2 overflow-hidden',
                  isActive
                    ? 'bg-[#fff0f2] dark:bg-[#3a1020] text-[#ff385c] border-[#ff385c]'
                    : 'text-[#6a6a6a] dark:text-[#a3a3a3] hover:bg-[#f2f2f2] dark:hover:bg-[#2a2a2a] hover:text-[#222222] dark:hover:text-white border-transparent',
                  collapsed ? 'justify-center px-2' : ''
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && (
                  <span className="truncate">{link.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer: role + theme + logout */}
        <div className="pb-4 px-2 flex-shrink-0">
          <div className="h-px bg-[#f2f2f2] dark:bg-[#2e2e2e] mb-3" />

          {/* Role + theme row */}
          <div
            className={cn(
              'flex items-center mb-1 px-1',
              collapsed ? 'justify-center' : 'justify-between'
            )}
          >
            {!collapsed && (
              <div className="flex items-center gap-1.5 text-sm font-medium text-[#222222] dark:text-[#f5f5f5]">
                {role === 'admin' ? (
                  <>
                    <Shield className="w-4 h-4 text-[#ff385c]" />
                    <span>Admin</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-[#6a6a6a]" />
                    <span>Viewer</span>
                  </>
                )}
              </div>
            )}
            <ThemeToggle className="w-8 h-8 rounded-full bg-[#f2f2f2] dark:bg-[#2a2a2a]" />
          </div>

          {/* Logout */}
          <button
            onClick={() => void handleLogout()}
            title={collapsed ? 'Logout' : undefined}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2.5 rounded-airbnb text-sm font-medium text-[#6a6a6a] dark:text-[#a3a3a3] hover:bg-[#f2f2f2] dark:hover:bg-[#2a2a2a] hover:text-[#ff385c] transition-colors',
              collapsed ? 'justify-center' : ''
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
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
