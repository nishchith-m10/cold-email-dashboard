'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// ---- Lazy-loaded Clerk wrapper ------------------------------------------------
// We dynamic-import ClerkProvider so that @clerk/nextjs is never evaluated on
// landing pages. This prevents the "Publishable key not valid" crash when env
// vars are missing / incorrect.
const ClerkWrapper = dynamic(
  () => import('./clerk-wrapper').then((m) => m.ClerkWrapper),
  { ssr: false },
);

interface ClerkThemeProviderProps {
  children: React.ReactNode;
}

export function ClerkThemeProvider({ children }: ClerkThemeProviderProps) {
  const pathname = usePathname();

  // Landing pages don't need Clerk at all
  const isLandingPage = pathname === '/' || pathname === '/pricing' || pathname === '/demo';

  // Auth pages always use dark Clerk theme regardless of user's saved preference
  const isAuthPage = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up');

  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (isAuthPage) {
      setIsDark(true);
      return;
    }

    const checkTheme = () => {
      const isLightMode = document.documentElement.classList.contains('light');
      setIsDark(!isLightMode);
    };

    checkTheme();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [isAuthPage]);

  // Landing pages skip Clerk entirely
  if (isLandingPage) {
    return <>{children}</>;
  }

  // Dashboard / auth pages get the full Clerk wrapper (lazy-loaded)
  return (
    <ClerkWrapper isDark={isDark} mounted={mounted}>
      {children}
    </ClerkWrapper>
  );
}
