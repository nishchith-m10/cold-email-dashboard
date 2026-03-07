import { Reveal } from '@/components/landing/reveal'
import { SectionLabel } from '@/components/landing/section-label'
import { Zap, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export function ProductHero() {
  return (
    <section className="bg-[#F5F5F3] py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          <SectionLabel icon={Zap} text="What you get" />
          <h1
            className="mt-6 text-[42px] leading-[1.06] tracking-[-0.02em] text-[#0C0C0C] md:text-[64px]"
            style={{ fontFamily: 'var(--font-display), serif' }}
          >
            Everything you need to scale outreach.{' '}
            <span className="italic">Nothing you don't.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[560px] text-lg leading-relaxed text-[#666660]">
            Up Shot gives you dedicated cloud infrastructure, autonomous AI research, 
            personalized email sequences, and a real-time performance dashboard — 
            all managed for you, all under one roof.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0C0C0C] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#222]"
            >
              Get started <ChevronRight size={16} />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E4DF] bg-transparent px-5 py-2.5 text-sm font-medium text-[#0C0C0C] transition-colors hover:bg-[#0C0C0C] hover:text-white"
            >
              Book a demo <ChevronRight size={16} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
