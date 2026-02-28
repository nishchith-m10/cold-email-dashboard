'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, ChevronDown } from 'lucide-react'
import { Reveal } from '@/components/landing/reveal'
import { SectionLabel } from '@/components/landing/section-label'

const items = [
  {
    title: 'Meaningful calendar',
    body: 'Effortlessly manage your time and tasks with our intuitive scheduling calendar. Create, modify, and share events with ease.',
    image: 'https://framerusercontent.com/images/cpeOKiCJkfxm8KSiwrm1wijnpw.png',
  },
  {
    title: 'Insightful analytics',
    body: 'Track key performance indicators, generate reports, and uncover actionable insights to accelerate your outreach.',
    image: 'https://framerusercontent.com/images/jGCAgVOTqmEJcV2hXPwt96TUd6w.png',
  },
  {
    title: 'Seamless integration',
    body: 'Keep everything connected without any limits. Integrate with your favorite tools and maintain a single source of truth.',
    image: 'https://framerusercontent.com/images/20JAL7lVbCM9Tf4H99RslCs17eM.png',
  },
  {
    title: 'Effortless boards',
    body: 'A visual way to organize and track your tasks and projects. Drag, drop, and stay on top of every detail.',
    image: 'https://framerusercontent.com/images/yPZWlmF3vAEd1788LZXY3UHFiDU.png',
  },
]

export function FeaturesAccordion() {
  const [active, setActive] = useState(0)

  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="text-center">
            <SectionLabel icon={Settings} text="Features" />
            <h2
              className="mt-4 text-4xl text-[#0C0C0C] md:text-5xl"
              style={{ fontFamily: 'var(--font-display), serif' }}
            >
              Explore our most powerful features
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#666660]">
              Each feature is crafted to provide seamless integration and performance.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid items-start gap-12 md:grid-cols-2">
          {/* Accordion list */}
          <div className="flex flex-col">
            {items.map((item, i) => (
              <button
                key={item.title}
                onClick={() => setActive(i)}
                className={`w-full border-b border-[#E4E4DF] px-4 py-5 text-left transition-colors ${
                  active === i ? 'bg-[#F5F5F3]/50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-base font-semibold ${active === i ? 'text-[#0C0C0C]' : 'text-[#666660]'}`}>
                    {item.title}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-[#666660] transition-transform ${active === i ? 'rotate-180' : ''}`}
                  />
                </div>
                <AnimatePresence>
                  {active === i && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-2 text-sm leading-relaxed text-[#666660]"
                    >
                      {item.body}
                    </motion.p>
                  )}
                </AnimatePresence>
              </button>
            ))}
          </div>

          {/* Active image */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden rounded-2xl border border-[#E4E4DF] shadow-sm"
            >
              <Image
                src={items[active].image}
                alt={items[active].title}
                width={600}
                height={400}
                className="w-full"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
