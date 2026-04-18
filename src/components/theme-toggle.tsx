'use client';

import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains('dark');
    setDark(isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  if (!mounted) {
    return (
      <button
        className={cn(
          'flex items-center justify-center text-[#6a6a6a] transition-colors',
          className
        )}
        aria-label="Toggle dark mode"
      >
        <Moon className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        'flex items-center justify-center text-[#6a6a6a] dark:text-[#a3a3a3] hover:text-[#222222] dark:hover:text-white transition-colors',
        className
      )}
      aria-label="Toggle dark mode"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
