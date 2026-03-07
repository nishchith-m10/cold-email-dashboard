import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight } from 'lucide-react'

const BRAND = 'Up Shot'

const footerCols = [
  {
    title: 'Product',
    links: [
      { label: 'Our Product', href: '/product' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Changelog', href: '#' },
      { label: 'Book a demo', href: '/demo' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'Waitlist', href: '#' },
      { label: 'Terms of service', href: '#' },
      { label: 'Privacy policy', href: '#' },
    ],
  },
  {
    title: 'Plans',
    links: [
      { label: 'Growth', href: '/pricing' },
      { label: 'Scale', href: '/pricing' },
      { label: 'Premium', href: '/pricing' },
    ],
  },
]

export function Footer() {
  return (
    <footer>
      {/* CTA Band */}
      <section className="relative overflow-hidden bg-[#0A0A0A]">
        {/* Atmospheric background */}
        <div className="absolute inset-0">
          <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-[rgba(60,90,60,0.3)] blur-[120px]" />
          <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-[rgba(40,50,80,0.25)] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 py-20 md:py-28">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-16 text-center md:px-12 md:py-20">
            <h2 className="font-serif text-4xl text-white md:text-5xl">
              Start your trial today.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-base text-white/60">
              Unlock the potential of your business with our next-level SaaS platform. Transform your workflows and achieve new heights today.
            </p>
            <Link
              href="/sign-in"
              className="mt-8 inline-flex items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-[#0C0C0C] transition-colors hover:bg-white/90"
            >
              Get started <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Grid */}
      <section className="border-t border-white/[0.06] bg-[#0A0A0A] pb-10 pt-16">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 md:grid-cols-5 lg:gap-12">
          {/* Logo col */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Up Shot logo"
                width={28}
                height={28}
                className="rounded-md object-contain brightness-0 invert"
              />
              <span className="text-[17px] font-semibold text-white">{BRAND}</span>
            </div>
          </div>

          {/* Link columns */}
          {footerCols.map((col) => (
            <div key={col.title}>
              <h3 className="mb-4 text-sm font-semibold text-white">{col.title}</h3>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/50 transition-colors hover:text-white/80"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-white/[0.06] px-6 pt-6 text-xs text-white/30 md:flex-row">
          <span>{'© 2025 Up Shot. All rights reserved.'}</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            System Status
          </span>
        </div>
      </section>
    </footer>
  )
}
