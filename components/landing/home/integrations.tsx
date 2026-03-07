'use client'

import Link from 'next/link'
import { Link2, ChevronRight } from 'lucide-react'
import { Reveal } from '@/components/landing/reveal'
import { SectionLabel } from '@/components/landing/section-label'

export function Integrations() {
  return (
    <section className="bg-[#F5F5F3] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="text-center">
            <SectionLabel icon={Link2} text="Integrations" />
            <h2
              className="mt-4 text-4xl text-[#0C0C0C] md:text-5xl"
              style={{ fontFamily: 'var(--font-display), serif' }}
            >
              Integrates with your favorite tools
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#666660]">
              Enhance productivity, streamline processes, and keep everything connected without disrupting your current workflow.
            </p>
            <Link
              href="#"
              className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-[#E4E4DF] bg-transparent px-5 py-2.5 text-sm font-medium text-[#0C0C0C] transition-colors hover:bg-[#0C0C0C] hover:text-white"
            >
              Explore integrations <ChevronRight size={16} />
            </Link>
          </div>
        </Reveal>

        <Reveal>
          <div
            className="mx-auto mt-10 max-w-3xl flex items-center justify-center rounded-2xl border border-dashed border-[#C8C8C0] bg-[#F5F5F3]"
            style={{ minHeight: '360px', width: '100%' }}
          >
            <p className="text-center text-sm text-[#666660]/60 px-4">
              [Image placeholder — Integration grid showing all supported third-party tools]
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
