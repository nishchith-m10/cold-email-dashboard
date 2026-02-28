import { BarChart3, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Reveal } from '@/components/landing/reveal'
import { SectionLabel } from '@/components/landing/section-label'

export function CaseStudies() {
  return (
    <section className="bg-[#F5F5F3] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <div className="text-center">
            <SectionLabel icon={BarChart3} text="Case studies" />
            <h2
              className="mt-4 text-4xl text-[#0C0C0C] md:text-5xl"
              style={{ fontFamily: 'var(--font-display), serif' }}
            >
              {"Meet the companies"}
              <br />
              {"working more efficiently"}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-base text-[#666660]">
              Explore how our innovative solutions have empowered businesses worldwide to achieve their ambitious goals.
            </p>
          </div>
        </Reveal>

        {/* Case study card */}
        <Reveal>
          <div className="relative mt-14 overflow-hidden rounded-2xl bg-[#1A1A18]">
            {/* Warm overlay / atmosphere */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-900/30 via-transparent to-transparent" />
            <div className="relative flex flex-col gap-6 p-8 md:p-12">
              {/* Company logo */}
              <span className="flex items-center gap-1.5 text-sm font-semibold text-white/80">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-white/20 text-[10px] font-bold text-white">
                  L
                </span>
                luminous
              </span>

              {/* Quote */}
              <p
                className="max-w-sm text-2xl leading-snug text-white md:text-3xl"
                style={{ fontFamily: 'var(--font-display), serif' }}
              >
                {'"Elevating our brand visibility like never before"'}
              </p>

              {/* Stats */}
              <div className="flex gap-10">
                <div>
                  <p className="text-3xl font-bold text-white">+50%</p>
                  <p className="text-sm text-white/50">Conversion</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">320%</p>
                  <p className="text-sm text-white/50">ROI</p>
                </div>
              </div>

              {/* CTA */}
              <Link
                href="#"
                className="mt-2 inline-flex items-center gap-1.5 self-end text-sm font-medium text-white/80 transition-colors hover:text-white"
              >
                Read case study <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </Reveal>

        {/* Logos */}
        <Reveal>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-10">
            {['luminous', 'Proline', 'Cloud', 'Springfield'].map((name) => (
              <span
                key={name}
                className="text-base font-semibold text-[#0C0C0C]/25"
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
