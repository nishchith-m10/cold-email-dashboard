'use client'

import { useState } from 'react'
import { MessageSquare, Star } from 'lucide-react'
import { Reveal } from '@/components/landing/reveal'
import { SectionLabel } from '@/components/landing/section-label'

const testimonials = [
  {
    quote: 'Using this product has been such a smooth experience. It\'s clear that a lot of thought went into making it user-friendly.',
    name: 'Diana Mounter',
    title: 'Head of Product, Cloud',
    initials: 'DM',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    quote: 'I\'ve tried countless products over the years, but nothing comes close to this. The design is incredibly user-friendly, and it works flawlessly every time.',
    name: 'James Anderson',
    title: 'Founder, Aura',
    initials: 'JA',
    color: 'bg-amber-100 text-amber-700',
  },
  {
    quote: 'I was surprised at how easy this was to set up and use. It\'s clearly made with the user in mind, and it performs beautifully.',
    name: 'Matthew Brooks',
    title: 'Co-Founder, Amsterdam',
    initials: 'MB',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    quote: 'I didn\'t realize how much I needed this product until I started using it. It\'s so well-made and easy to use, and it saves me so much time and effort.',
    name: 'Paul Smith',
    title: 'Creative Director, Luminous',
    initials: 'PS',
    color: 'bg-purple-100 text-purple-700',
  },
  {
    quote: 'It\'s rare to find a product that\'s both simple and powerful, but this one nails it. It\'s become an essential tool for me.',
    name: 'David Mitchell',
    title: 'VP of Sales, ProLine',
    initials: 'DM',
    color: 'bg-rose-100 text-rose-700',
  },
  {
    quote: 'This is exactly what I was looking for. It\'s straightforward, efficient, and beautifully designed. Highly recommend it!',
    name: 'William Scott',
    title: 'Head of Product, Atlantic',
    initials: 'WS',
    color: 'bg-teal-100 text-teal-700',
  },
  {
    quote: 'This product does everything I hoped for and more. The design is so intuitive.',
    name: 'Tim Williams',
    title: 'Founder, Orbitc',
    initials: 'TW',
    color: 'bg-orange-100 text-orange-700',
  },
  {
    quote: 'I\'m genuinely impressed with how well this works. It\'s easy to integrate and the results are consistently amazing.',
    name: 'Benjamin Miller',
    title: 'Product Manager, Hamilton',
    initials: 'BM',
    color: 'bg-cyan-100 text-cyan-700',
  },
  {
    quote: 'This has exceeded all my expectations. Incredibly simple to use, yet so effective.',
    name: 'John Parker',
    title: 'Marketing Director, Manila',
    initials: 'JP',
    color: 'bg-indigo-100 text-indigo-700',
  },
]

export function Testimonials() {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? testimonials : testimonials.slice(0, 6)

  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="text-center">
            <SectionLabel icon={MessageSquare} text="Testimonials" />
            <h2
              className="mt-4 text-4xl text-[#0C0C0C] md:text-5xl"
              style={{ fontFamily: 'var(--font-display), serif' }}
            >
              Trusted by the best in your industry
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#666660]">
              Find out why our solution is the top choice for fast-growing outreach teams.
            </p>
          </div>
        </Reveal>

        {/* Masonry grid */}
        <div className="mt-14 columns-1 gap-5 md:columns-2 lg:columns-3">
          {visible.map((t, i) => (
            <Reveal key={t.name} delay={(i % 3) * 0.05}>
              <div className="mb-5 break-inside-avoid rounded-xl border border-[#E4E4DF] bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                {/* Stars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} size={14} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="mt-3 text-sm italic leading-relaxed text-[#666660]">{`"${t.quote}"`}</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${t.color}`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0C0C0C]">{t.name}</p>
                    <p className="text-[13px] text-[#666660]">{t.title}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {!showAll && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setShowAll(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E4DF] bg-transparent px-5 py-2.5 text-sm font-medium text-[#0C0C0C] transition-colors hover:bg-[#0C0C0C] hover:text-white"
            >
              Show more
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
