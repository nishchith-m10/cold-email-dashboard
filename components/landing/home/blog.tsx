'use client'

import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, ChevronRight } from 'lucide-react'
import { Reveal } from '@/components/landing/reveal'
import { SectionLabel } from '@/components/landing/section-label'

const articles = [
  {
    category: 'Stories',
    title: 'Code collaboration and best practices for seamless teamwork',
    date: 'Jan 9, 2025',
    image: 'https://framerusercontent.com/images/eNaeUEIeYDKYQGSaCHTmGAkcXc8.jpg',
  },
  {
    category: 'Business',
    title: 'Tips for optimizing your platform\'s performance and speed',
    date: 'Jan 8, 2025',
    image: 'https://framerusercontent.com/images/9NAWT5MZR8ypbUZnuDfaugVcUv8.png',
  },
  {
    category: 'Insights',
    title: 'Building brand loyalty through exceptional customer support',
    date: 'Jan 7, 2025',
    image: 'https://framerusercontent.com/images/Pdj85gxEUNS2jv0lUSR2j2V3DeQ.png',
  },
]

export function Blog() {
  return (
    <section className="bg-[#F5F5F3] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="text-center">
            <SectionLabel icon={BookOpen} text="Resources" />
            <h2
              className="mt-4 text-4xl text-[#0C0C0C] md:text-5xl"
              style={{ fontFamily: 'var(--font-display), serif' }}
            >
              The latest insights
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#666660]">
              Explore a curated collection of guides and insights to get the most out of our platform.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {articles.map((article, i) => (
            <Reveal key={article.title} delay={i * 0.1}>
              <Link href="#" className="group block">
                <div className="overflow-hidden rounded-2xl border border-[#E4E4DF] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                  <div className="overflow-hidden">
                    <Image
                      src={article.image}
                      alt={article.title}
                      width={400}
                      height={240}
                      className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <span className="inline-flex items-center rounded-full bg-[#EAEFE8] px-2.5 py-0.5 text-xs font-medium text-[#3A6B35]">
                      {article.category}
                    </span>
                    <h3
                      className="mt-3 text-lg text-[#0C0C0C]"
                      style={{ fontFamily: 'var(--font-display), serif' }}
                    >
                      {article.title}
                    </h3>
                    <p className="mt-2 text-[13px] text-[#666660]">{article.date}</p>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-10 text-center">
            <Link
              href="#"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E4DF] bg-transparent px-5 py-2.5 text-sm font-medium text-[#0C0C0C] transition-colors hover:bg-[#0C0C0C] hover:text-white"
            >
              Explore resources <ChevronRight size={16} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
