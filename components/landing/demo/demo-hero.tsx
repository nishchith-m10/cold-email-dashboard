'use client'

import { useState } from 'react'
import { Check, ChevronRight, ChevronDown, Sparkles } from 'lucide-react'
import { Reveal } from '@/components/landing/reveal'
import { SectionLabel } from '@/components/landing/section-label'

const benefits = [
  'Get a live walkthrough of our features.',
  'See how our solution fits your unique challenges.',
  'Ask questions and get real-time answers from our experts.',
]

const titleOptions = [
  'Founder / CEO',
  'VP of Sales',
  'Head of Growth',
  'Marketing Director',
  'SDR / BDR Manager',
  'Other',
]

const employeeOptions = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '500+',
]

export function DemoHero() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    title: '',
    employees: '',
    country: '',
    privacy: false,
  })
  const [titleOpen, setTitleOpen] = useState(false)
  const [empOpen, setEmpOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section className="bg-[#F5F5F3] pb-16 pt-12 md:pb-24 md:pt-20">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:gap-20">
        {/* Left – copy */}
        <Reveal>
          <div>
            <SectionLabel icon={Sparkles} text="Book a demo" />
            <h1
              className="mt-6 text-5xl leading-[1.08] tracking-tight text-[#0C0C0C] md:text-[56px]"
              style={{ fontFamily: 'var(--font-display), serif' }}
            >
              Book a demo
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-[#666660]">
              Schedule a personalized demo with our team to explore how we can meet your needs and transform your workflow.
            </p>

            {/* Benefit list */}
            <ul className="mt-8 flex flex-col gap-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-2.5">
                  <Check size={16} className="mt-0.5 flex-shrink-0 text-[#3A6B35]" />
                  <span className="text-sm text-[#0C0C0C]">{b}</span>
                </li>
              ))}
            </ul>

            {/* Testimonial */}
            <blockquote className="mt-10 border-l-2 border-[#E4E4DF] pl-5">
              <p className="text-lg italic text-[#0C0C0C]">
                {'"Super easy to use, and the customer service really goes above and beyond."'}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#E4E4DF]" />
                <div>
                  <p className="text-sm font-medium text-[#0C0C0C]">Diana Mounter</p>
                  <p className="text-xs text-[#666660]">Head of Product, Luminous</p>
                </div>
              </div>
            </blockquote>

            {/* Trust logos */}
            <div className="mt-10">
              <p className="text-xs font-medium uppercase tracking-widest text-[#666660]/60">
                Trusted by the world leaders
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-6">
                {['Springfield', 'Orbitc', 'Cloud', 'Proline'].map((name) => (
                  <span
                    key={name}
                    className="text-base font-semibold text-[#0C0C0C]/25"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* Right – form */}
        <Reveal delay={0.15}>
          {submitted ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E4E4DF] bg-white p-10 text-center shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAEFE8]">
                <Check size={24} className="text-[#3A6B35]" />
              </div>
              <h3
                className="mt-4 text-2xl text-[#0C0C0C]"
                style={{ fontFamily: 'var(--font-display), serif' }}
              >
                {"We'll be in touch!"}
              </h3>
              <p className="mt-2 text-sm text-[#666660]">
                Our team will reach out within 24 hours to schedule your personalized demo.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-[#E4E4DF] bg-white p-8 shadow-sm"
            >
              {/* Name */}
              <label className="mb-1 block text-sm font-medium text-[#0C0C0C]">Name</label>
              <input
                type="text"
                required
                placeholder="Jane Smith"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mb-5 w-full rounded-lg border border-[#E4E4DF] bg-transparent px-4 py-2.5 text-sm text-[#0C0C0C] placeholder:text-[#AAA] outline-none focus:border-[#0C0C0C] transition-colors"
              />

              {/* Email */}
              <label className="mb-1 block text-sm font-medium text-[#0C0C0C]">Email</label>
              <input
                type="email"
                required
                placeholder="jane@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mb-5 w-full rounded-lg border border-[#E4E4DF] bg-transparent px-4 py-2.5 text-sm text-[#0C0C0C] placeholder:text-[#AAA] outline-none focus:border-[#0C0C0C] transition-colors"
              />

              {/* Company */}
              <label className="mb-1 block text-sm font-medium text-[#0C0C0C]">Company</label>
              <input
                type="text"
                required
                placeholder="Acme Inc."
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="mb-5 w-full rounded-lg border border-[#E4E4DF] bg-transparent px-4 py-2.5 text-sm text-[#0C0C0C] placeholder:text-[#AAA] outline-none focus:border-[#0C0C0C] transition-colors"
              />

              {/* Title – custom select */}
              <label className="mb-1 block text-sm font-medium text-[#0C0C0C]">Title</label>
              <div className="relative mb-5">
                <button
                  type="button"
                  onClick={() => { setTitleOpen(!titleOpen); setEmpOpen(false) }}
                  className="flex w-full items-center justify-between rounded-lg border border-[#E4E4DF] bg-transparent px-4 py-2.5 text-sm text-[#0C0C0C] outline-none focus:border-[#0C0C0C] transition-colors"
                >
                  <span className={form.title ? 'text-[#0C0C0C]' : 'text-[#AAA]'}>
                    {form.title || 'Select...'}
                  </span>
                  <ChevronDown size={14} className="text-[#666660]" />
                </button>
                {titleOpen && (
                  <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-lg border border-[#E4E4DF] bg-white py-1 shadow-lg">
                    {titleOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => { setForm({ ...form, title: opt }); setTitleOpen(false) }}
                        className="block w-full px-4 py-2 text-left text-sm text-[#666660] hover:bg-[#F5F5F3] hover:text-[#0C0C0C]"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Employees – custom select */}
              <label className="mb-1 block text-sm font-medium text-[#0C0C0C]">Employees</label>
              <div className="relative mb-5">
                <button
                  type="button"
                  onClick={() => { setEmpOpen(!empOpen); setTitleOpen(false) }}
                  className="flex w-full items-center justify-between rounded-lg border border-[#E4E4DF] bg-transparent px-4 py-2.5 text-sm text-[#0C0C0C] outline-none focus:border-[#0C0C0C] transition-colors"
                >
                  <span className={form.employees ? 'text-[#0C0C0C]' : 'text-[#AAA]'}>
                    {form.employees || 'Select...'}
                  </span>
                  <ChevronDown size={14} className="text-[#666660]" />
                </button>
                {empOpen && (
                  <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-lg border border-[#E4E4DF] bg-white py-1 shadow-lg">
                    {employeeOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => { setForm({ ...form, employees: opt }); setEmpOpen(false) }}
                        className="block w-full px-4 py-2 text-left text-sm text-[#666660] hover:bg-[#F5F5F3] hover:text-[#0C0C0C]"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Country */}
              <label className="mb-1 block text-sm font-medium text-[#0C0C0C]">Country</label>
              <input
                type="text"
                placeholder="United States"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="mb-5 w-full rounded-lg border border-[#E4E4DF] bg-transparent px-4 py-2.5 text-sm text-[#0C0C0C] placeholder:text-[#AAA] outline-none focus:border-[#0C0C0C] transition-colors"
              />

              {/* Privacy checkbox */}
              <label className="mb-6 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={form.privacy}
                  onChange={(e) => setForm({ ...form, privacy: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-[#E4E4DF] accent-[#0C0C0C]"
                />
                <span className="text-sm text-[#666660]">
                  {'I agree to the '}
                  <a href="#" className="underline text-[#0C0C0C]">Privacy Policy</a>
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0C0C0C] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#222]"
              >
                Book a demo <ChevronRight size={16} />
              </button>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  )
}
