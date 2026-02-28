'use client'

import Image from 'next/image'
import { Settings } from 'lucide-react'
import { Reveal } from '@/components/landing/reveal'
import { SectionLabel } from '@/components/landing/section-label'

const thumbnails = [
  'https://framerusercontent.com/images/nxTZEDT1LJB9gaBWaCwMQao5GU.png',
  'https://framerusercontent.com/images/mRRmHyGLMnT7ujxy7S132EHSiM.png',
  'https://framerusercontent.com/images/19s71fI9671RomIEVBloQcsprw.png',
  'https://framerusercontent.com/images/D311so81eAYd5mBZVKaHbOiEz0.png',
  'https://framerusercontent.com/images/pCHXMWCJWPBI98peTkPSWUfvyS8.png',
]

const integrationLogos = [
  'https://framerusercontent.com/images/gAhsGmL9ihCFvD2rXRdje9nUAfg.png',
  'https://framerusercontent.com/images/3PwGTnAVDSTaDTqKqs9iEs577Ck.png',
  'https://framerusercontent.com/images/Ns76trsFg5DIlEwAENtDoi62Xy8.png',
]

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
          <div className="mt-12 overflow-hidden rounded-2xl border border-[#E4E4DF] shadow-sm">
            <Image
              src="https://framerusercontent.com/images/clHUntYDxl1DHojTDvKUTUCBQ.png"
              alt="Feature overview strip"
              width={1200}
              height={400}
              className="w-full"
            />
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
              <div className="mt-6 flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {thumbnails.map((src, i) => (
                  <Image
                    key={i}
                    src={src}
                    alt={`Data insight thumbnail ${i + 1}`}
                    width={200}
                    height={120}
                    className="flex-shrink-0 rounded-xl border border-[#E4E4DF]"
                  />
                ))}
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
              <div className="mt-6 overflow-hidden rounded-xl border border-[#E4E4DF]">
                <Image
                  src="https://framerusercontent.com/images/w3hm0D2z0n8aJmqj5gMIcD1rA.png"
                  alt="Collaboration preview"
                  width={400}
                  height={250}
                  className="w-full"
                />
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
              <div className="mt-6 flex items-center gap-4">
                {integrationLogos.map((src, i) => (
                  <Image
                    key={i}
                    src={src}
                    alt={`Integration logo ${i + 1}`}
                    width={80}
                    height={80}
                    className="rounded-xl border border-[#E4E4DF]"
                  />
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
