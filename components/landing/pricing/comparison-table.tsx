'use client'

import Link from 'next/link'
import { Check, ChevronRight } from 'lucide-react'
import { Reveal } from '@/components/landing/reveal'

interface Row {
  label: string
  growth: string | boolean
  scale: string | boolean
  premium: string | boolean
}

interface Section {
  title: string
  rows: Row[]
}

const sections: Section[] = [
  {
    title: 'Core',
    rows: [
      { label: 'Advanced analytics', growth: true, scale: true, premium: true },
      { label: 'Custom branding', growth: true, scale: true, premium: true },
      { label: 'Storage integrations', growth: true, scale: true, premium: true },
      { label: 'AI assistant', growth: false, scale: true, premium: true },
      { label: 'Automated reports', growth: false, scale: false, premium: true },
    ],
  },
  {
    title: 'Lead Volume',
    rows: [
      { label: 'Monthly leads prepared', growth: '3,000', scale: '5,000', premium: '8,000' },
      { label: 'Emails per send cycle', growth: '9,000', scale: '15,000', premium: '24,000' },
      { label: 'Emails with 2 re-loops', growth: '27,000', scale: '45,000', premium: '72,000' },
      { label: 'Gmail sending accounts', growth: '3', scale: '5', premium: '8' },
    ],
  },
  {
    title: 'Collaboration',
    rows: [
      { label: 'Team members', growth: '1 user', scale: '5 users', premium: 'Unlimited' },
      { label: 'User roles and permissions', growth: false, scale: true, premium: true },
      { label: 'Guest accounts', growth: false, scale: false, premium: true },
    ],
  },
  {
    title: 'Support',
    rows: [
      { label: 'Email support', growth: true, scale: true, premium: true },
      { label: 'Onboarding support', growth: false, scale: true, premium: true },
      { label: 'Dedicated account manager', growth: false, scale: false, premium: true },
    ],
  },
]

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === 'string') {
    return <span className="text-sm text-[#0C0C0C]">{value}</span>
  }
  if (value) {
    return <Check size={16} className="mx-auto text-[#3A6B35]" />
  }
  return <span className="text-lg text-[#666660]/40">{'—'}</span>
}

export function ComparisonTable() {
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-6">
        <Reveal>
          <div className="text-center">
            <h2
              className="text-4xl text-[#0C0C0C] md:text-5xl"
              style={{ fontFamily: 'var(--font-display), serif' }}
            >
              Compare plans
            </h2>
            <p className="mt-3 text-base text-[#666660]">
              Get an overview of what is included.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-14 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-[#E4E4DF]">
                  <th className="pb-6 text-left" />
                  <th className="pb-6 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-lg font-semibold text-[#0C0C0C]">Growth</span>
                      <span className="text-sm text-[#666660]">$1,499/mo</span>
                      <Link
                        href="/sign-in"
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E4E4DF] px-4 py-1.5 text-xs font-medium text-[#0C0C0C] transition-colors hover:bg-[#0C0C0C] hover:text-white"
                      >
                        Get started <ChevronRight size={12} />
                      </Link>
                    </div>
                  </th>
                  <th className="pb-6 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-lg font-semibold text-[#0C0C0C]">Scale</span>
                      <span className="text-sm text-[#666660]">$1,999/mo</span>
                      <Link
                        href="/sign-in"
                        className="inline-flex items-center gap-1 rounded-lg bg-[#0C0C0C] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#222]"
                      >
                        Get started <ChevronRight size={12} />
                      </Link>
                    </div>
                  </th>
                  <th className="pb-6 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-lg font-semibold text-[#0C0C0C]">Premium</span>
                      <span className="text-sm text-[#666660]">Custom</span>
                      <Link
                        href="/demo"
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E4E4DF] px-4 py-1.5 text-xs font-medium text-[#0C0C0C] transition-colors hover:bg-[#0C0C0C] hover:text-white"
                      >
                        Talk to sales <ChevronRight size={12} />
                      </Link>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => (
                  <> 
                    {/* Section divider */}
                    <tr key={`section-${section.title}`}>
                      <td
                        colSpan={4}
                        className="bg-[#F5F5F3] py-3 pl-4 text-sm font-semibold text-[#0C0C0C]"
                      >
                        {section.title}
                      </td>
                    </tr>
                    {section.rows.map((row, i) => (
                      <tr
                        key={row.label}
                        className={i % 2 === 0 ? 'bg-[#F5F5F3]/40' : ''}
                      >
                        <td className="py-3.5 pl-4 text-sm text-[#0C0C0C]">{row.label}</td>
                        <td className="py-3.5 text-center">
                          <CellValue value={row.growth} />
                        </td>
                        <td className="py-3.5 text-center">
                          <CellValue value={row.scale} />
                        </td>
                        <td className="py-3.5 text-center">
                          <CellValue value={row.premium} />
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
