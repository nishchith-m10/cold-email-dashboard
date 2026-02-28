'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Settings, Calendar, BarChart2, Link2, LayoutGrid, ChevronRight } from 'lucide-react'
import { Reveal } from '@/components/landing/reveal'
import { SectionLabel } from '@/components/landing/section-label'

const features = [
  { icon: Calendar, title: 'Meaningful calendar', body: 'Create, modify, and share events with ease.' },
  { icon: BarChart2, title: 'Insightful analytics', body: 'Track key performance indicators, generate reports.' },
  { icon: Link2, title: 'Seamless integration', body: 'Keep everything connected without any limits.' },
  { icon: LayoutGrid, title: 'Effortless boards', body: 'Visual way to organize and track your tasks.' },
]

export function Everything() {
  return (
    <section className="bg-[#F5F5F3] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header row */}
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <SectionLabel icon={Settings} text="Features" />
              <h2
                className="mt-4 text-4xl text-[#0C0C0C] md:text-5xl"
                style={{ fontFamily: 'var(--font-display), serif' }}
              >
                Everything you need to<br className="hidden md:block" /> grow, in one place
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-[#666660]">
                Our platform is designed with simplicity in mind, ensuring that even the least tech-savvy users can navigate effortlessly.
              </p>
            </div>
            <Link
              href="#"
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-[#E4E4DF] bg-transparent px-5 py-2.5 text-sm font-medium text-[#0C0C0C] transition-colors hover:bg-[#0C0C0C] hover:text-white"
            >
              Learn more <ChevronRight size={16} />
            </Link>
          </div>
        </Reveal>

        {/* Dashboard image */}
        <Reveal>
          <div className="mt-10 overflow-hidden rounded-2xl border border-[#E4E4DF] shadow-sm">
            <Image
              src="https://framerusercontent.com/images/fDpZwbdQ0YlmYkH0aV1NJCtMJ7c.png"
              alt="Full dashboard overview"
              width={1200}
              height={700}
              className="w-full"
            />
          </div>
        </Reveal>

        {/* 4-column feature summary */}
        <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <div className="flex flex-col gap-2">
                <f.icon size={16} className="text-[#3A6B35]" />
                <h4 className="text-sm font-semibold text-[#0C0C0C]">{f.title}</h4>
                <p className="text-[13px] leading-relaxed text-[#666660]">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
