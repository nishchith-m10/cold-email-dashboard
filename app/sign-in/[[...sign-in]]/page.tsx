'use client';

import dynamic from 'next/dynamic';
import { Mail, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import Image from 'next/image';

// ssr: false → Clerk renders nothing on the server, so there is no
// SSR/CSR mismatch. The sign-in card appears only after hydration.
const SignIn = dynamic(
  () => import('@clerk/nextjs').then((m) => m.SignIn),
  { ssr: false }
);

// Tailwind !important overrides on every Clerk element so the card
// is ALWAYS white regardless of what baseTheme the ClerkProvider is
// currently holding (dark mode dashboard → sign-in navigation edge case).
const LIGHT_APPEARANCE = {
  elements: {
    rootBox: 'w-full',
    // Card shell
    card: '!bg-white !border !border-slate-200/70 !shadow-xl !rounded-2xl',
    // Header
    headerTitle: '!text-slate-900 !font-semibold',
    headerSubtitle: '!text-slate-500',
    // Social "Continue with Google" button
    socialButtonsBlockButton:
      '!bg-white !border !border-slate-200 !text-slate-800 hover:!bg-slate-50 !shadow-none',
    socialButtonsBlockButtonText: '!text-slate-800 !font-medium',
    socialButtonsBlockButtonArrow: '!text-slate-400',
    // "or" divider
    dividerRow: '!my-3',
    dividerText: '!text-slate-400 !text-xs',
    dividerLine: '!bg-slate-200',
    // Form fields
    formField: '!gap-1',
    formFieldLabel: '!text-slate-700 !text-sm !font-medium',
    formFieldInput:
      '!bg-white !border !border-slate-200 !text-slate-900 !rounded-lg !placeholder-slate-400 focus:!border-blue-400 focus:!ring-1 focus:!ring-blue-400',
    formFieldInputShowPasswordButton: '!text-slate-400 hover:!text-slate-700',
    formFieldAction: '!text-blue-600 hover:!text-blue-700 !text-sm',
    // Primary action button
    formButtonPrimary:
      '!bg-blue-600 hover:!bg-blue-700 !text-white !font-medium !rounded-lg !shadow-none',
    // Identity preview (after email entered)
    identityPreviewText: '!text-slate-900',
    identityPreviewEditButton: '!text-blue-600 hover:!text-blue-700',
    // Alerts & errors
    alert: '!bg-red-50 !border !border-red-200 !rounded-lg',
    alertText: '!text-red-700',
    // OTP / verification code inputs
    otpCodeFieldInput:
      '!bg-white !border !border-slate-200 !text-slate-900 !rounded-lg',
    // Footer (hidden — page has its own branding)
    footer: 'hidden',
    footerActionText: '!text-slate-500',
    footerActionLink: '!text-blue-600 hover:!text-blue-700',
  },
  variables: {
    colorPrimary: '#3b82f6',
    colorBackground: '#ffffff',
    colorInputBackground: '#ffffff',
    colorText: '#0f172a',
    colorTextSecondary: '#64748b',
    colorInputText: '#0f172a',
    colorNeutral: '#0f172a',
    colorShimmer: '#f1f5f9',
    colorAlphaShade: 'rgba(0,0,0,0.06)',
    borderRadius: '0.5rem',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
  },
  layout: {
    socialButtonsPlacement: 'top' as const,
    socialButtonsVariant: 'blockButton' as const,
  },
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Left side — Branding (60%) — Desktop only */}
      <div className="hidden lg:flex lg:w-3/5 p-12 flex-col justify-between relative overflow-hidden border-r border-slate-200">
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-blue-500/20 to-transparent" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden">
              <Image src="/logo.png" alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-xl font-semibold text-slate-900">Cold Email</span>
              <span className="block text-[10px] uppercase tracking-wider font-medium text-slate-500">Analytics</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3 leading-tight">
              Track your outreach.
              <span className="block bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                Scale your success.
              </span>
            </h1>
            <p className="text-slate-500 text-base max-w-md leading-relaxed">
              Real-time analytics for cold email campaigns. Monitor performance, track costs, and optimize your outreach.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-slate-700">
              <Mail className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <span className="text-sm">Track opens, clicks, and replies</span>
            </div>
            <div className="flex items-center gap-3 text-slate-700">
              <TrendingUp className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <span className="text-sm">Advanced analytics and metrics</span>
            </div>
            <div className="flex items-center gap-3 text-slate-700">
              <Zap className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <span className="text-sm">Monitor LLM usage and costs</span>
            </div>
            <div className="flex items-center gap-3 text-slate-700">
              <BarChart3 className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <span className="text-sm">Compare campaign performance</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-slate-400 text-sm">Built for high-performance outreach teams</p>
        </div>
      </div>

      {/* Right side — Sign in form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-xl overflow-hidden mb-4">
              <Image src="/logo.png" alt="Logo" width={64} height={64} className="w-full h-full object-cover" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900">Cold Email</h1>
              <p className="text-xs uppercase tracking-widest font-medium text-slate-500 mt-0.5">Analytics</p>
            </div>
          </div>

          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            forceRedirectUrl="/dashboard"
            appearance={LIGHT_APPEARANCE}
          />
        </div>
      </div>
    </div>
  );
}
