'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Users, PenLine, MessageSquare, Calendar, BarChart2, ChevronRight, Zap } from 'lucide-react'
import { Reveal } from '@/components/landing/reveal'
import { SectionLabel } from '@/components/landing/section-label'

const cards = [
  {
    image: 'https://framerusercontent.com/images/R9MaiyXC5GfHNgvCodBmHhAOJI.png',
    icon: Users,
    title: 'Invite members',
    body: 'Share, edit, and manage projects in real-time, ensuring everyone stays aligned and productive.',
  },
  {
    image: 'https://framerusercontent.com/images/1Uumbz60XarPLaepVBJKRwZPw.png',
    icon: PenLine,
    title: 'Edit together',
    body: 'Work smarter with collaborative editing tools that keep everyone on the same page.',
  },
  {
    image: 'https://framerusercontent.com/images/96N9BJB6B6KPgd2T8rz9P3tdpwE.png',
    icon: MessageSquare,
    title: 'Instant feedback',
    body: 'Easily share thoughts, ask questions, and provide feedback directly within your files.',
  },
]

export function Collaboration() {
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <Reveal>
          <div className="text-center">
            <SectionLabel icon={Zap} text="Seamless collaboration" />
            <h2
              className="mt-4 text-4xl text-[#0C0C0C] md:text-5xl"
              style={{ fontFamily: 'var(--font-display), serif' }}
            >
              Powering teamwork to<br />simplify workflows
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#666660]">
              Say goodbye to version chaos and embrace a smoother workflow designed to help your team achieve more, together.
            </p>
          </div>
        </Reveal>

        {/* 3-card grid */}
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {cards.map((card, i) => (
            <Reveal key={card.title} delay={i * 0.1}>
              <div className="flex flex-col gap-4 rounded-2xl border border-[#E4E4DF] bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                <div className="overflow-hidden rounded-xl">
                  <Image
                    src={card.image}
                    alt={card.title}
                    width={400}
                    height={240}
                    className="aspect-video w-full object-cover"
                  />
                </div>
                <card.icon size={18} className="text-[#3A6B35]" />
                <h3 className="font-semibold text-[#0C0C0C]">{card.title}</h3>
                <p className="text-sm leading-relaxed text-[#666660]">{card.body}</p>
                <Link
                  href="#"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#3A6B35] hover:underline"
                >
                  Learn more <ChevronRight size={14} />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Dynamic planner */}
        <div className="mt-24 grid items-center gap-16 md:grid-cols-2">
          <Reveal>
            <div>
              <SectionLabel icon={Calendar} text="Meaningful calendar" />
              <h3
                className="mt-4 text-3xl text-[#0C0C0C] md:text-4xl"
                style={{ fontFamily: 'var(--font-display), serif' }}
              >
                Dynamic planner that keeps you ahead
              </h3>
              <p className="mt-4 text-base leading-relaxed text-[#666660]">
                Stay one step ahead with a calendar that grows with your schedule. Adapt quickly to changes, manage priorities effectively, and achieve your goals with ease.
              </p>
              <Link
                href="#"
                className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-[#E4E4DF] bg-transparent px-5 py-2.5 text-sm font-medium text-[#0C0C0C] transition-colors hover:bg-[#0C0C0C] hover:text-white"
              >
                Learn more <ChevronRight size={16} />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="overflow-hidden rounded-2xl border border-[#E4E4DF] shadow-sm">
              <Image
                src="https://framerusercontent.com/images/cpeOKiCJkfxm8KSiwrm1wijnpw.png"
                alt="Calendar feature preview"
                width={600}
                height={400}
                className="w-full"
              />
            </div>
          </Reveal>
        </div>

        {/* Analytics */}
        <div className="mt-24 grid items-center gap-16 md:grid-cols-2">
          <Reveal className="order-2 md:order-1">
            <div className="overflow-hidden rounded-2xl border border-[#E4E4DF] shadow-sm">
              <Image
                src="https://framerusercontent.com/images/PUht1sYAHXeN5y3QqkzQVJyHQY.png"
                alt="Analytics dashboard preview"
                width={600}
                height={400}
                className="w-full"
              />
            </div>
          </Reveal>
          <Reveal delay={0.1} className="order-1 md:order-2">
            <div>
              <SectionLabel icon={BarChart2} text="Insightful analytics" />
              <h3
                className="mt-4 text-3xl text-[#0C0C0C] md:text-4xl"
                style={{ fontFamily: 'var(--font-display), serif' }}
              >
                Analytics that power smarter decisions
              </h3>
              <p className="mt-4 text-base leading-relaxed text-[#666660]">
                Our cutting-edge analytics deliver detailed trends, patterns, and actionable intelligence to help you make informed decisions and stay ahead of the competition.
              </p>
              <Link
                href="#"
                className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-[#E4E4DF] bg-transparent px-5 py-2.5 text-sm font-medium text-[#0C0C0C] transition-colors hover:bg-[#0C0C0C] hover:text-white"
              >
                Learn more <ChevronRight size={16} />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
