import { Hero } from '@/components/landing/home/hero'
import { LogoStrip } from '@/components/landing/home/logo-strip'
import { Collaboration } from '@/components/landing/home/collaboration'
import { FeaturesBento } from '@/components/landing/home/features-bento'
import { FeaturesTabs } from '@/components/landing/home/features-tabs'
import { Everything } from '@/components/landing/home/everything'
import { FeaturesAccordion } from '@/components/landing/home/features-accordion'
import { Integrations } from '@/components/landing/home/integrations'
import { Testimonials } from '@/components/landing/home/testimonials'
import { Blog } from '@/components/landing/home/blog'
import { FAQ } from '@/components/landing/faq'

const homeFAQ = [
  {
    question: 'Is my data safe with your platform?',
    answer:
      'Yes. Every client runs on a dedicated sovereign server with isolated credentials. Your lead data, email drafts, and API keys are never shared across tenants.',
  },
  {
    question: 'What kind of customer support do you offer?',
    answer:
      'Growth clients receive email support with a 48-hour response SLA. Scale clients get email + live chat. Premium clients receive a dedicated account manager and priority SLAs.',
  },
  {
    question: 'How does the pricing for your web solution work?',
    answer:
      'You pay a flat monthly retainer based on your lead volume tier. Lead preparation (research + AI email drafting) happens once per lead. Re-sending the same sequence to non-responders costs nothing extra.',
  },
  {
    question: 'Can I cancel my subscription at any time?',
    answer:
      'Yes. No annual contract required on Growth and Scale plans. We want you to stay because it\'s working, not because you\'re locked in.',
  },
  {
    question: 'Can I upgrade or downgrade my subscription plan?',
    answer:
      'Absolutely. You can upgrade at any time and the new tier activates immediately. Downgrades take effect at the next billing cycle.',
  },
]

export default function HomePage() {
  return (
    <>
      <Hero />
      <LogoStrip />
      <Collaboration />
      <FeaturesBento />
      <FeaturesTabs />
      <Everything />
      <FeaturesAccordion />
      <Integrations />
      <Testimonials />
      <Blog />
      <FAQ items={homeFAQ} />
    </>
  )
}
