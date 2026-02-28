'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook for managing theme state (dark/light mode)
 * Extracted for use across components (Header, Settings)
 */

/**
 * Apply theme with zero transition lag.
 *
 * Injects a temporary <style> that kills every CSS transition,
 * toggles the theme class, forces a synchronous reflow so all
 * elements resolve their new styles instantly, then removes the
 * style tag. Result: truly instantaneous swap with no animation.
 */
function applyThemeInstant(newTheme: 'dark' | 'light') {
  const html = document.documentElement;

  // 1. Inject style that disables ALL transitions globally
  const style = document.createElement('style');
  style.setAttribute('data-theme-switch', '');
  style.textContent = '*, *::before, *::after { transition: none !important; }';
  document.head.appendChild(style);

  // 2. Toggle theme class
  if (newTheme === 'light') {
    html.classList.add('light');
    html.classList.remove('dark');
  } else {
    html.classList.remove('light');
    html.classList.add('dark');
  }

  // 3. Force synchronous reflow — browser must compute all styles NOW
  //    with transitions disabled, so there's nothing left to animate
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  window.getComputedStyle(html).color;

  // 4. Remove the injected style so normal micro-animations resume
  document.head.removeChild(style);
}

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check localStorage or system preference
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyThemeInstant(newTheme);
  };

  const setThemeValue = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyThemeInstant(newTheme);
  };

  return { theme, toggleTheme, setTheme: setThemeValue, mounted };
}
