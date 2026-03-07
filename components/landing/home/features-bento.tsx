'use client'

import { Settings } from 'lucide-react'
import { Reveal } from '@/components/landing/reveal'
import { SectionLabel } from '@/components/landing/section-label'

export function FeaturesBento() {
  return (
    <section id="features" className="bg-[#F5F5F3] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="text-center">
            <SectionLabel icon={Settings} text="Features" />
            <h2
              className="mt-4 text-4xl text-[#0C0C0C] md:text-5xl"
              style={{ fontFamily: 'var(--font-display), serif' }}
            >
              Features designed to empower<br className="hidden md:block" /> your workflow
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#666660]">
              Stay ahead with tools that prioritize your needs, integrating insights and efficiency into one powerful platform.
            </p>
          </div>
        </Reveal>

        {/* Full-width feature strip */}
        <Reveal>
          <div
            className="mt-12 flex items-center justify-center rounded-2xl border border-dashed border-[#C8C8C0] bg-[#F5F5F3]"
            style={{ minHeight: '200px', width: '100%' }}
          >
            <p className="text-center text-sm text-[#666660]/60 px-4">
              [Image placeholder — Feature overview strip]
            </p>
          </div>
        </Reveal>

        {/* Bento grid */}
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {/* Data insights - spans full width */}
          <Reveal className="md:col-span-2">
            <div className="rounded-2xl border border-[#E4E4DF] bg-white p-8">
              <h3 className="text-lg font-semibold text-[#0C0C0C]">Data insights</h3>
              <p className="mt-1 text-sm text-[#666660]">
                Visualize your outreach performance and track every campaign metric in real time.
              </p>
              <div
                className="mt-6 flex items-center justify-center rounded-xl border border-dashed border-[#C8C8C0] bg-[#F5F5F3]"
                style={{ height: '140px', width: '100%' }}
              >
                <p className="text-center text-sm text-[#666660]/60">
                  [Image placeholder — Scrolling feature preview thumbnails]
                </p>
              </div>
            </div>
          </Reveal>

          {/* Collaborate */}
          <Reveal>
            <div className="rounded-2xl border border-[#E4E4DF] bg-white p-8">
              <h3 className="text-lg font-semibold text-[#0C0C0C]">Collaborate together</h3>
              <p className="mt-1 text-sm text-[#666660]">
                Collaborate with your team, share updates instantly.
              </p>
              <div
                className="mt-6 flex items-center justify-center rounded-xl border border-dashed border-[#C8C8C0] bg-[#F5F5F3]"
                style={{ height: '160px', width: '100%' }}
              >
                <p className="text-center text-sm text-[#666660]/60 px-4">
                  [Image placeholder — Collaboration preview]
                </p>
              </div>
            </div>
          </Reveal>

          {/* Seamless integrations */}
          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-[#E4E4DF] bg-white p-8">
              <h3 className="text-lg font-semibold text-[#0C0C0C]">Seamless integrations</h3>
              <p className="mt-1 text-sm text-[#666660]">
                Connect with the tools you already use. No friction.
              </p>
              <div className="mt-6 flex gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center rounded-lg border border-dashed border-[#C8C8C0] bg-[#F5F5F3]"
                    style={{ height: '56px', width: '80px' }}
                  >
                    <span className="text-[10px] text-[#666660]/50">Logo {i}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
