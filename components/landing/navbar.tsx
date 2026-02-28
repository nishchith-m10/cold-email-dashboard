'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronDown, Menu, X } from 'lucide-react'

const BRAND = 'Singularity'

const navLinks = [
  { label: 'About', href: '#' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Integrations', href: '#' },
  { label: 'Blog', href: '#' },
]

const pagesDropdown = [
  { label: 'Home', href: '/' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Book a Demo', href: '/demo' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [pagesOpen, setPagesOpen] = useState(false)
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
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="12" height="12" rx="2" fill="#0C0C0C" />
            <rect x="8" y="8" width="12" height="12" rx="2" fill="#0C0C0C" fillOpacity="0.5" />
          </svg>
          <span className="font-sans text-[17px] font-semibold text-[#0C0C0C]">{BRAND}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          {/* Pages dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setPagesOpen(true)}
            onMouseLeave={() => setPagesOpen(false)}
          >
            <button className="flex items-center gap-1 text-sm text-[#666660] transition-colors hover:text-[#0C0C0C]">
              Pages <ChevronDown size={14} />
            </button>
            <AnimatePresence>
              {pagesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-2 w-44 rounded-xl border border-[#E4E4DF] bg-white p-2 shadow-lg"
                >
                  {pagesDropdown.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block rounded-lg px-3 py-2 text-sm text-[#666660] transition-colors hover:bg-[#F5F5F3] hover:text-[#0C0C0C]"
                    >
                      {item.label}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
              {pagesDropdown.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2.5 text-sm text-[#666660] transition-colors hover:bg-[#F5F5F3] hover:text-[#0C0C0C]"
                >
                  {item.label}
                </Link>
              ))}
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
