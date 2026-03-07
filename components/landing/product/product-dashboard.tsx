import { Reveal } from '@/components/landing/reveal'
import { SectionLabel } from '@/components/landing/section-label'
import { BarChart3, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export function ProductDashboard() {
  return (
    <section className="bg-[#F5F5F3] py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          <SectionLabel icon={BarChart3} text="Ready to see it live?" />
          <h2
            className="mt-4 text-4xl text-[#0C0C0C] md:text-5xl"
            style={{ fontFamily: 'var(--font-display), serif' }}
          >
            See the full platform in action.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#666660]">
            Book a personalized walkthrough and we'll show you exactly how Up Shot 
            would be configured for your ICP, your offer, and your pipeline goals.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0C0C0C] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#222]"
            >
              Book a demo <ChevronRight size={16} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E4DF] bg-transparent px-5 py-2.5 text-sm font-medium text-[#0C0C0C] transition-colors hover:bg-[#0C0C0C] hover:text-white"
            >
              View pricing <ChevronRight size={16} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
