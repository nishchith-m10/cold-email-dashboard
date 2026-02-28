'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// Base appearance that works for both themes
const baseAppearance = {
  variables: {
    colorPrimary: '#3b82f6',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '0.75rem',
  },
  elements: {
    card: 'shadow-2xl rounded-xl',
    rootBox: 'w-full',
    formButtonPrimary: 'bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium rounded-lg transition-colors',
    formButtonReset: 'text-[#3b82f6] hover:text-[#60a5fa]',
    formFieldAction: 'text-[#3b82f6] hover:text-[#60a5fa]',
    userButtonBox: 'rounded-full',
    userButtonTrigger: 'rounded-full focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2',
    userButtonAvatarBox: 'rounded-full w-8 h-8',
    footerActionLink: 'text-[#3b82f6] hover:text-[#60a5fa] font-medium',
    profileSectionPrimaryButton: 'bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg',
  },
};

interface ClerkThemeProviderProps {
  children: React.ReactNode;
}

export function ClerkThemeProvider({ children }: ClerkThemeProviderProps) {
  const pathname = usePathname();
  
  // Landing pages don't need Clerk at all — render children directly so an
  // invalid / missing publishable key doesn't break the marketing site.
  const isLandingPage = pathname === '/' || pathname === '/pricing' || pathname === '/demo';
  
  // Auth pages always use dark Clerk theme regardless of user's saved preference
  const isAuthPage = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up');

  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Auth pages are always dark — no observer needed
    if (isAuthPage) {
      setIsDark(true);
      return;
    }

    // Check initial theme for dashboard pages
    const checkTheme = () => {
      const isLightMode = document.documentElement.classList.contains('light');
      setIsDark(!isLightMode);
    };

    checkTheme();

    // Watch for theme changes via MutationObserver
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

  // Landing pages skip Clerk entirely — avoids crashes from missing keys
  if (isLandingPage) {
    return <>{children}</>;
  }

  // Build appearance based on current theme
  const appearance = {
    ...baseAppearance,
    baseTheme: isDark ? dark : undefined,
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <ClerkProvider appearance={{ ...baseAppearance, baseTheme: dark }}>
        {children}
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider appearance={appearance}>
      {children}
    </ClerkProvider>
  );
}
