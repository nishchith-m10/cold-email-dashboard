'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Menu, X } from 'lucide-react'

const BRAND = 'Up Shot'

const navLinks = [
  { label: 'About', href: '#' },
  { label: 'Our Product', href: '/product' },
  { label: 'Pricing', href: '/pricing' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <nav
      className={`sticky top-0 z-50 w-full border-b transition-all duration-200 ${
        scrolled
          ? 'border-[#E4E4DF] bg-white/80 backdrop-blur-md shadow-sm'
          : 'border-[#E4E4DF] bg-white'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Up Shot logo"
            width={28}
            height={28}
            className="rounded-md object-contain"
          />
          <span className="font-sans text-[17px] font-semibold text-[#0C0C0C]">{BRAND}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/"
            className={`text-sm transition-colors hover:text-[#0C0C0C] ${
              pathname === '/' ? 'text-[#0C0C0C]' : 'text-[#666660]'
            }`}
          >
            Home
          </Link>
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`text-sm transition-colors hover:text-[#0C0C0C] ${
                pathname === link.href ? 'text-[#0C0C0C]' : 'text-[#666660]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/demo"
            className="hidden items-center gap-1.5 rounded-lg border border-[#E4E4DF] bg-transparent px-4 py-2 text-sm font-medium text-[#0C0C0C] transition-colors hover:bg-[#0C0C0C] hover:text-white md:inline-flex"
          >
            Book a demo <ChevronRight size={16} />
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-[#0C0C0C] md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[#E4E4DF] bg-white md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              <Link
                href="/"
                className="rounded-lg px-3 py-2.5 text-sm text-[#666660] transition-colors hover:bg-[#F5F5F3] hover:text-[#0C0C0C]"
              >
                Home
              </Link>
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="rounded-lg px-3 py-2.5 text-sm text-[#666660] transition-colors hover:bg-[#F5F5F3] hover:text-[#0C0C0C]"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/demo"
                className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-[#0C0C0C] px-4 py-2.5 text-sm font-medium text-white"
              >
                Book a demo <ChevronRight size={16} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
