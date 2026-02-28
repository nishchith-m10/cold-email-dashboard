import { DM_Serif_Display, Inter } from 'next/font/google'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import type { Metadata } from 'next'

const dmSerifDisplay = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Singularity — The Most Powerful Cold Email Platform',
  description:
    'AI-personalized cold email sequences at scale. LinkedIn scraping, company research, AI email drafting, and autonomous sending for agencies and sales teams.',
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${dmSerifDisplay.variable} ${inter.variable} min-h-screen bg-[#F5F5F3]`}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Force light mode appearance for landing pages */
            .landing-page * { color-scheme: light; }
          `,
        }}
      />
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  )
}
