'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { usePathname } from 'next/navigation';

const baseAppearance = {
  variables: {
    colorPrimary: '#3b82f6',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full',
    formButtonPrimary:
      'bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium rounded-lg transition-colors',
    formButtonReset: 'text-[#3b82f6] hover:text-[#60a5fa]',
    formFieldAction: 'text-[#3b82f6] hover:text-[#60a5fa]',
    userButtonBox: 'rounded-full',
    userButtonTrigger:
      'rounded-full focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2',
    userButtonAvatarBox: 'rounded-full w-8 h-8',
    footerActionLink: 'text-[#3b82f6] hover:text-[#60a5fa] font-medium',
    profileSectionPrimaryButton:
      'bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg',
  },
};

interface ClerkWrapperProps {
  children: React.ReactNode;
  isDark: boolean;
  mounted: boolean;
}

export function ClerkWrapper({ children, isDark, mounted }: ClerkWrapperProps) {
  const pathname = usePathname();
  // Auth pages must ALWAYS be light — ignore whatever isDark says.
  const isAuthPage =
    pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up');

  const effectiveDark = isAuthPage ? false : isDark;

  const appearance = {
    ...baseAppearance,
    baseTheme: effectiveDark ? dark : undefined,
  };

  return (
    <ClerkProvider
      appearance={appearance}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      {children}
    </ClerkProvider>
  );
}
