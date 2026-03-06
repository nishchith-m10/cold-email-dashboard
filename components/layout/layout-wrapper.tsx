'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { ClientShell } from './client-shell';
import { UserSyncProvider } from '@/components/providers/user-sync-provider';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

/**
 * LayoutWrapper - Conditionally wraps content based on route
 * 
 * Auth pages (/sign-in, /sign-up) render without the dashboard shell
 * All other pages get the full ClientShell with header, navigation, etc.
 */
export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  
  // Auth pages should render without the dashboard shell
  const isAuthPage = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up');
  
  // Landing pages (/, /pricing, /demo) render without the dashboard shell
  const isLandingPage = pathname === '/' || pathname === '/pricing' || pathname === '/demo';

  useEffect(() => {
    if (isAuthPage) {
      // Auth pages are always light — override any dark mode from the dashboard
      // without touching localStorage so the user's dashboard preference is preserved
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isAuthPage]);
  
  if (isLandingPage) {
    // Landing pages render completely standalone — own layout handles Navbar + Footer
    return <>{children}</>;
  }
  
  if (isAuthPage) {
    return <>{children}</>;
  }
  
  // All other pages get the full dashboard shell with user sync
  return (
    <UserSyncProvider>
      <ClientShell>{children}</ClientShell>
    </UserSyncProvider>
  );
}


