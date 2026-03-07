import { ProductHero } from '@/components/landing/product/product-hero'
import { ProductFeatures } from '@/components/landing/product/product-features'
import { ProductDashboard } from '@/components/landing/product/product-dashboard'
import { FAQ } from '@/components/landing/faq'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Our Product — Up Shot',
  description:
    'Dedicated cloud infrastructure, AI-powered lead research, and autonomous email sequences — everything you need to scale outreach from one platform.',
}

const productFAQ = [
  {
    question: 'Do I need technical knowledge to set up the platform?',
    answer:
      'No. Our team handles all infrastructure provisioning, workflow deployment, DNS configuration, and inbox setup. You receive a fully operational system on day one.',
  },
  {
    question: 'What makes your email sequences different from template-based tools?',
    answer:
      'Every email is written from scratch by AI that has already researched the individual prospect — their LinkedIn activity, company pain points, and recent news. No templates, no merge tags, genuine personalization at scale.',
  },
  {
    question: 'Is the platform GDPR compliant?',
    answer:
      'Yes. All prospect data is stored in an isolated, tenant-specific database. Opt-out requests are processed immediately and permanently suppressed across all future sequences.',
  },
  {
    question: 'How many inboxes can I use per sequence?',
    answer:
      'As many as your plan includes. Each inbox rotates sends intelligently to protect deliverability. Growth plans include 3 inboxes, Scale 5, and Premium 8 — all configurable across any sequence.',
  },
  {
    question: 'What does the dashboard show me?',
    answer:
      'Live metrics including open rates, click rates, reply rates, opt-outs, and AI cost per lead. You can inspect every drafted email, view the full contents of each lead, and monitor the health of your sending infrastructure — all in one place.',
  },
]

export default function ProductPage() {
  return (
    <>
      <ProductHero />
      <ProductFeatures />
      <ProductDashboard />
      <FAQ items={productFAQ} />
    </>
  )
}
