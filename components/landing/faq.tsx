'use client'

import Link from 'next/link'
import { MessageSquare, ChevronRight, Plus, Minus } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Reveal } from '@/components/landing/reveal'
import { SectionLabel } from '@/components/landing/section-label'

interface FAQItem {
  question: string
  answer: string
}

interface FAQProps {
  items: FAQItem[]
  heading?: string
  bg?: string
}

export function FAQ({
  items,
  heading = 'In case you missed anything',
  bg = 'bg-white',
}: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className={`${bg} py-24 md:py-32`}>
      <div className="mx-auto max-w-2xl px-6">
        <Reveal>
          <div className="text-center">
            <SectionLabel icon={MessageSquare} text="FAQ" />
            <h2
              className="mt-4 text-4xl text-[#0C0C0C] md:text-5xl"
              style={{ fontFamily: 'var(--font-display), serif' }}
            >
              {heading}
            </h2>
            <p className="mt-3 text-base text-[#666660]">
              {"We're here to answer all your questions."}
            </p>
            <Link
              href="#"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#0C0C0C] hover:underline"
            >
              Contact support <ChevronRight size={14} />
            </Link>
          </div>
        </Reveal>

        <div className="mt-10 flex flex-col">
          {items.map((item, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <div className="border-b border-[#E4E4DF]">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="flex w-full items-center justify-between py-5 text-left"
                >
                  <span className="pr-4 text-sm font-medium text-[#0C0C0C]">{item.question}</span>
                  {openIndex === i ? (
                    <Minus size={18} className="flex-shrink-0 text-[#666660]" />
                  ) : (
                    <Plus size={18} className="flex-shrink-0 text-[#666660]" />
                  )}
                </button>
                <AnimatePresence>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 text-sm leading-relaxed text-[#666660]">{item.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
