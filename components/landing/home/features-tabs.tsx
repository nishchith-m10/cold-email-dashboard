'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, BarChart2, Link2, LayoutGrid, Settings, ChevronRight } from 'lucide-react'
import { Reveal } from '@/components/landing/reveal'
import { SectionLabel } from '@/components/landing/section-label'
import type { LucideIcon } from 'lucide-react'

interface Tab {
  icon: LucideIcon
  label: string
  sublabel: string
  heading: string
  body: string
}

const tabs: Tab[] = [
  {
    icon: Calendar,
    label: 'Meaningful calendar',
    sublabel: 'Meaningful calendar',
    heading: 'Stay organized and on track',
    body: 'Effortlessly manage your time and tasks with our intuitive scheduling calendar. Create, modify, and share events with ease.',
  },
  {
    icon: BarChart2,
    label: 'Insightful analytics',
    sublabel: 'Insightful analytics',
    heading: 'Understand your performance',
    body: 'Track key performance indicators, generate reports, and uncover actionable insights to accelerate your outreach.',
  },
  {
    icon: Link2,
    label: 'Seamless integration',
    sublabel: 'Seamless integration',
    heading: 'Connect everything you need',
    body: 'Keep everything connected without any limits. Integrate with your favorite tools and maintain a single source of truth.',
  },
  {
    icon: LayoutGrid,
    label: 'Effortless boards',
    sublabel: 'Effortless boards',
    heading: 'Organize and track visually',
    body: 'A visual way to organize and track your tasks and projects. Drag, drop, and stay on top of every detail.',
  },
]

export function FeaturesTabs() {
  const [active, setActive] = useState(0)
  const current = tabs[active]

  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="text-center">
            <SectionLabel icon={Settings} text="Features" />
            <h2
              className="mt-4 text-4xl text-[#0C0C0C] md:text-5xl"
              style={{ fontFamily: 'var(--font-display), serif' }}
            >
              Suited for every scenario
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#666660]">
              Explore the comprehensive suite of tools designed to enhance your productivity and streamline your workflow.
            </p>
          </div>
        </Reveal>

        {/* Tab bar */}
        <Reveal>
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {tabs.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => setActive(i)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  active === i
                    ? 'border border-[#E4E4DF] bg-white text-[#0C0C0C] shadow-sm'
                    : 'text-[#666660] hover:text-[#0C0C0C]'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </Reveal>

        {/* Tab content */}
        <div className="mt-14 grid items-center gap-12 md:grid-cols-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={`text-${active}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
            >
              <SectionLabel icon={current.icon} text={current.sublabel} />
              <h3
                className="mt-4 text-2xl text-[#0C0C0C] md:text-3xl"
                style={{ fontFamily: 'var(--font-display), serif' }}
              >
                {current.heading}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-[#666660]">{current.body}</p>
              <Link
                href="#"
                className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-[#E4E4DF] bg-transparent px-5 py-2.5 text-sm font-medium text-[#0C0C0C] transition-colors hover:bg-[#0C0C0C] hover:text-white"
              >
                Learn more <ChevronRight size={16} />
              </Link>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={`img-${active}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="flex items-center justify-center rounded-2xl border border-dashed border-[#C8C8C0] bg-[#F5F5F3]"
                style={{ minHeight: '320px', width: '100%' }}
              >
                <p className="text-center text-sm text-[#666660]/60 px-4">
                  [Image placeholder — {current.label} feature interface]
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
