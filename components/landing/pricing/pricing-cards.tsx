'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DollarSign, Check, ChevronRight, Flame } from 'lucide-react'
import { Reveal } from '@/components/landing/reveal'
import { SectionLabel } from '@/components/landing/section-label'

type Period = 'monthly' | 'yearly'

const prices = {
  growth: { monthly: 1499, yearly: 1199 },
  scale: { monthly: 1999, yearly: 1599 },
  premium: { monthly: null, yearly: null },
}

const plans = [
  {
    key: 'growth' as const,
    name: 'Growth',
    desc: 'Get started with essential features and resources for focused outreach.',
    features: [
      'Advanced analytics',
      'Custom branding',
      'Storage integrations',
      '3,000 leads/month',
      '9,000 emails per send cycle',
      'Up to 27,000 emails with re-loops',
      '3 Gmail sending accounts',
      'Dedicated sovereign server',
      'Email support',
    ],
    cta: 'Get started',
    ctaHref: '/sign-in',
    featured: false,
  },
  {
    key: 'scale' as const,
    name: 'Scale',
    desc: 'For growing businesses, expanding companies, and ambitious agencies.',
    features: [
      'Advanced analytics',
      'Custom branding',
      'Storage integrations',
      'AI assistant',
      '5,000 leads/month',
      '15,000 emails per send cycle',
      'Up to 45,000 emails with re-loops',
      '5 Gmail sending accounts',
      'Dedicated sovereign server',
      'User roles and permissions',
      'Email + Chat support',
    ],
    cta: 'Get started',
    ctaHref: '/sign-in',
    featured: true,
  },
  {
    key: 'premium' as const,
    name: 'Premium',
    desc: 'For large agencies with specialized requirements and custom solutions.',
    features: [
      'Advanced analytics',
      'Custom branding',
      'Storage integrations',
      'AI assistant',
      'Automated reports',
      'Research reports (per booked meeting)',
      '8,000 leads/month',
      '24,000 emails per send cycle',
      'Up to 72,000 emails with re-loops',
      '8 Gmail sending accounts',
      'Dedicated sovereign server',
      'User roles and permissions',
      'Guest accounts',
      'Dedicated account manager',
      'Priority support',
    ],
    cta: 'Talk to sales',
    ctaHref: '/demo',
    featured: false,
  },
]

export function PricingCards() {
  const [period, setPeriod] = useState<Period>('monthly')

  function formatPrice(key: 'growth' | 'scale' | 'premium') {
    const price = prices[key][period]
    if (price === null) return null
    return `$${price.toLocaleString()}`
  }

  function billingNote(key: 'growth' | 'scale' | 'premium') {
    const price = prices[key][period]
    if (price === null) return 'Yearly billing only'
    if (period === 'monthly') return 'Billed monthly'
    const yearlyTotal = price * 12
    const monthlyTotal = prices[key].monthly! * 12
    const savings = monthlyTotal - yearlyTotal
    return `Billed $${yearlyTotal.toLocaleString()}/year · save $${savings.toLocaleString()}`
  }

  return (
    <section className="bg-[#F5F5F3] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="text-center">
            <SectionLabel icon={DollarSign} text="Pricing" />
            <h2
              className="mt-4 text-5xl tracking-tight text-[#0C0C0C] md:text-[64px]"
              style={{ fontFamily: 'var(--font-display), serif' }}
            >
              {"Choose a plan that's"}
              <br />
              {"right for you."}
            </h2>
            <p className="mt-4 text-base text-[#666660]">
              No hidden fees. No stress. Built with ease and transparency.
            </p>
          </div>
        </Reveal>

        {/* Toggle */}
        <Reveal>
          <div className="mt-8 flex justify-center">
            <div className="relative inline-flex items-center rounded-full border border-[#E4E4DF] bg-[#F5F5F3] p-1">
              <button
                onClick={() => setPeriod('monthly')}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                  period === 'monthly'
                    ? 'bg-white text-[#0C0C0C] shadow-sm'
                    : 'text-[#666660]'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setPeriod('yearly')}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                  period === 'yearly'
                    ? 'bg-white text-[#0C0C0C] shadow-sm'
                    : 'text-[#666660]'
                }`}
              >
                Yearly
              </button>
              {/* -20% badge */}
              <span className="absolute -right-2 -top-3 rounded-full bg-[#3A6B35] px-2 py-0.5 text-[10px] font-semibold text-white">
                -20%
              </span>
            </div>
          </div>
        </Reveal>

        {/* Cards */}
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
          {plans.map((plan, i) => (
            <Reveal key={plan.key} delay={i * 0.1}>
              <div
                className={`relative flex flex-col rounded-2xl p-8 ${
                  plan.featured
                    ? 'border-2 border-[#0C0C0C] bg-white shadow-lg'
                    : 'border border-[#E4E4DF] bg-white'
                }`}
              >
                {/* Popular badge */}
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    <Flame size={12} /> Popular
                  </div>
                )}

                <h3
                  className="text-2xl text-[#0C0C0C]"
                  style={{ fontFamily: 'var(--font-display), serif' }}
                >
                  {plan.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#666660]">{plan.desc}</p>

                {/* Price */}
                <div className="mt-6">
                  {formatPrice(plan.key) ? (
                    <div className="flex items-baseline gap-1">
                      <span
                        className="text-5xl text-[#0C0C0C]"
                        style={{ fontFamily: 'var(--font-display), serif' }}
                      >
                        {formatPrice(plan.key)}
                      </span>
                      <span className="text-lg text-[#666660]">/mo</span>
                    </div>
                  ) : (
                    <span
                      className="text-5xl text-[#0C0C0C]"
                      style={{ fontFamily: 'var(--font-display), serif' }}
                    >
                      Custom
                    </span>
                  )}
                  <p className="mt-1 text-sm text-[#666660]">{billingNote(plan.key)}</p>
                  <p className="mt-1 text-xs italic text-[#666660]/70">
                    {'+ $3,000 one-time setup fee'}
                  </p>
                </div>

                <hr className="my-6 border-[#E4E4DF]" />

                {/* Features */}
                <ul className="flex flex-1 flex-col gap-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 flex-shrink-0 text-[#3A6B35]" />
                      <span className="text-sm text-[#0C0C0C]">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={plan.ctaHref}
                  className={`mt-8 flex w-full items-center justify-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
                    plan.featured
                      ? 'bg-[#0C0C0C] text-white hover:bg-[#222]'
                      : 'border border-[#E4E4DF] bg-transparent text-[#0C0C0C] hover:bg-[#0C0C0C] hover:text-white'
                  }`}
                >
                  {plan.cta} <ChevronRight size={16} />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Trust strip */}
        <Reveal>
          <p className="mt-16 text-center text-xs font-medium uppercase tracking-widest text-[#666660]/60">
            Trusted by the world leaders
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-8">
            {['Springfield', 'Orbitc', 'Cloud', 'Proline', 'Luminous'].map((name) => (
              <span
                key={name}
                className="text-lg font-semibold text-[#0C0C0C]/25"
                style={{ fontFamily: 'var(--font-body), sans-serif' }}
              >
                {name}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
