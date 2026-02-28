import { Video, Sparkles, MonitorPlay, ArrowRight } from 'lucide-react'
import { Reveal, StaggerContainer, StaggerItem } from '@/components/landing/reveal'
import { SectionLabel } from '@/components/landing/section-label'

const steps = [
  {
    icon: Video,
    title: 'Schedule a video call',
    desc: 'Pick a time that works for you and connect with our team.',
  },
  {
    icon: Sparkles,
    title: 'Live demonstration',
    desc: "Watch our product in action! We'll showcase its features.",
  },
  {
    icon: MonitorPlay,
    title: 'Interactive experience',
    desc: 'Explore the product yourself with a guided trial or sandbox environment.',
  },
  {
    icon: ArrowRight,
    title: 'Next steps',
    desc: "After the demo, we'll help you plan the next steps.",
  },
]

export function HowItWorks() {
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <div className="text-center">
            <SectionLabel icon={MonitorPlay} text="How it works" />
            <h2
              className="mt-4 text-4xl text-[#0C0C0C] md:text-5xl"
              style={{ fontFamily: 'var(--font-display), serif' }}
            >
              {"Getting started has"}
              <br />
              {"never been easier"}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-base text-[#666660]">
              Our streamlined demo process is designed to give you a clear and personalized understanding of how our solution can work for you.
            </p>
          </div>
        </Reveal>

        <StaggerContainer className="mt-14 grid gap-8 md:grid-cols-4">
          {steps.map((step) => (
            <StaggerItem key={step.title}>
              <div className="flex flex-col">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAEFE8]">
                  <step.icon size={18} className="text-[#3A6B35]" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-[#0C0C0C]">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#666660]">{step.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
