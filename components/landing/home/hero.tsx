'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

const BRAND = 'Singularity'

const words = ['The', 'most', 'powerful', 'cold', 'email', 'platform.']

export function Hero() {
  return (
    <section className="bg-[#F5F5F3] pb-12 pt-20 md:pb-24 md:pt-32">
      <div className="mx-auto max-w-4xl px-6 text-center">
        {/* Announcement pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link href="#">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E4E4DF] bg-white px-3 py-1.5 text-xs font-medium text-[#0C0C0C] shadow-sm transition-shadow hover:shadow">
              <span className="rounded-full bg-[#3A6B35] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                NEW
              </span>
              <span className="text-[#666660]">{`Announcing ${BRAND} V3.5 — AI Research Reports`}</span>
            </div>
          </Link>
        </motion.div>

        {/* Heading */}
        <h1 className="mt-8 text-[42px] font-normal leading-[1.04] tracking-[-0.02em] text-[#0C0C0C] md:text-[72px]" style={{ fontFamily: 'var(--font-display), serif' }}>
          <span className="sr-only">The most powerful cold email platform.</span>
          <span aria-hidden="true">
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                className={`inline-block ${i > 0 ? 'ml-[0.3em]' : ''} ${i >= 3 ? 'italic' : ''}`}
              >
                {word}
              </motion.span>
            ))}
          </span>
        </h1>

        {/* Sub-copy */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mx-auto mt-6 max-w-[520px] text-lg leading-relaxed text-[#666660]"
          style={{ fontFamily: 'var(--font-body), sans-serif' }}
        >
          Unlock the potential of your outreach with our next-level AI platform. Transform your workflows and achieve new pipeline heights today.
        </motion.p>

        {/* Button row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0C0C0C] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#222]"
          >
            Get started <ChevronRight size={16} />
          </Link>
          <Link
            href="#features"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E4DF] bg-transparent px-5 py-2.5 text-sm font-medium text-[#0C0C0C] transition-colors hover:bg-[#0C0C0C] hover:text-white"
          >
            Learn more <ChevronRight size={16} />
          </Link>
        </motion.div>

        {/* Dashboard product image */}
        <motion.div
          initial={{ opacity: 0, y: 48, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 3 }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
          className="relative mx-auto mt-16 max-w-5xl"
        >
          <div
            className="overflow-hidden rounded-2xl border border-[#E4E4DF] shadow-2xl"
            style={{
              transform: 'perspective(1200px) rotateX(3deg)',
              transformOrigin: 'top center',
            }}
          >
            <Image
              src="https://framerusercontent.com/images/ixkKzTb9JFjaMw018haF9zgwgQ.png"
              alt={`${BRAND} dashboard showing revenue, expenses, customers and analytics`}
              width={1200}
              height={750}
              className="w-full"
              priority
            />
          </div>
          {/* Gradient fade at bottom */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#F5F5F3] to-transparent" />
        </motion.div>
      </div>
    </section>
  )
}
