'use client';

import { SignUp } from '@clerk/nextjs';
import { BarChart3, CheckCircle } from 'lucide-react';
import Image from 'next/image';

// Same light-mode overrides as sign-in — forces white card regardless
// of the ClerkProvider's current baseTheme state.
const LIGHT_APPEARANCE = {
  elements: {
    rootBox: 'w-full',
    card: '!bg-white !border !border-slate-200/70 !shadow-xl !rounded-2xl',
    headerTitle: '!text-slate-900 !font-semibold',
    headerSubtitle: '!text-slate-500',
    socialButtonsBlockButton:
      '!bg-white !border !border-slate-200 !text-slate-800 hover:!bg-slate-50 !shadow-none',
    socialButtonsBlockButtonText: '!text-slate-800 !font-medium',
    socialButtonsBlockButtonArrow: '!text-slate-400',
    dividerRow: '!my-3',
    dividerText: '!text-slate-400 !text-xs',
    dividerLine: '!bg-slate-200',
    formField: '!gap-1',
    formFieldLabel: '!text-slate-700 !text-sm !font-medium',
    formFieldInput:
      '!bg-white !border !border-slate-200 !text-slate-900 !rounded-lg !placeholder-slate-400 focus:!border-blue-400 focus:!ring-1 focus:!ring-blue-400',
    formFieldInputShowPasswordButton: '!text-slate-400 hover:!text-slate-700',
    formFieldAction: '!text-blue-600 hover:!text-blue-700 !text-sm',
    formButtonPrimary:
      '!bg-blue-600 hover:!bg-blue-700 !text-white !font-medium !rounded-lg !shadow-none',
    identityPreviewText: '!text-slate-900',
    identityPreviewEditButton: '!text-blue-600 hover:!text-blue-700',
    alert: '!bg-red-50 !border !border-red-200 !rounded-lg',
    alertText: '!text-red-700',
    otpCodeFieldInput:
      '!bg-white !border !border-slate-200 !text-slate-900 !rounded-lg',
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

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Left side — Branding (60%) */}
      <div className="hidden lg:flex lg:w-3/5 p-12 flex-col justify-between relative overflow-hidden border-r border-slate-200">
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-blue-500/20 to-transparent" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden">
              <Image src="/logo.png" alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-semibold text-slate-900">Cold Email Analytics</span>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3 leading-tight">
              Get started in
              <span className="block bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                minutes.
              </span>
            </h1>
            <p className="text-slate-500 text-base max-w-md leading-relaxed">
              Create your account and start tracking your cold email campaigns with powerful analytics.
            </p>
          </div>

          <div className="space-y-3">
            {[
              'Real-time email tracking & analytics',
              'LLM cost monitoring across providers',
              'Multi-campaign performance comparison',
              'Team collaboration with role-based access',
              'Beautiful, fast, modern dashboard',
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <p className="text-slate-700 text-sm">{benefit}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-slate-400 text-sm">Trusted by high-performing outreach teams</p>
        </div>
      </div>

      {/* Right side — Sign up form (40%) */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg overflow-hidden">
              <Image src="/logo.png" alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-semibold text-slate-900">Cold Email Analytics</span>
          </div>

          <div suppressHydrationWarning>
            <SignUp
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              forceRedirectUrl="/dashboard"
              appearance={LIGHT_APPEARANCE}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
