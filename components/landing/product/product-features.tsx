'use client'

import { Reveal } from '@/components/landing/reveal'
import { SectionLabel } from '@/components/landing/section-label'
import { Server, Workflow, Brain, Mail, LayoutDashboard, Check } from 'lucide-react'

const workflows = [
  'Email Preparation (AI research + drafting)',
  'Email 1 — Initial Outreach',
  'Email 2 — First Follow-Up',
  'Email 3 — Final Follow-Up',
  'Reply Tracker',
  'Opt-Out Handler',
  'Research Report Generator',
]

const aiFeatures = [
  'LinkedIn profile + recent post scraping via Relevance AI',
  'Company web research via Google Custom Search',
  'Customer sentiment analysis via Apify review scraping',
  'GDPR-compliant storage: all lead data stored in your isolated Supabase database',
]

const deliveryFeatures = [
  '3–8 Gmail inboxes depending on plan tier',
  'Dedicated sending domains with full SPF, DKIM, and DMARC configuration',
  'Automatic opt-out enforcement — permanently suppressed across all future sequences',
]

const dashboardFeatures = [
  'Live metrics: open rate, click rate, reply rate, opt-out rate',
  'Cost tracking: AI spend per lead, total monthly API cost',
  'Sequence viewer: inspect every drafted email before and after sending',
  'Lead explorer: view full prospect profiles including research notes and AI analysis',
  'Infrastructure health: server status, workflow execution logs, sending queue depth',
]

export function ProductFeatures() {
  return (
    <>
      {/* Pillar 1 — Dedicated Cloud Infrastructure */}
      <section className="bg-white py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-16 md:grid-cols-2">
            <Reveal>
              <div className="max-w-lg">
                <SectionLabel icon={Server} text="Your own infrastructure" />
                <h2
                  className="mt-4 text-3xl text-[#0C0C0C] md:text-4xl"
                  style={{ fontFamily: 'var(--font-display), serif' }}
                >
                  A dedicated server, built for your outreach.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#666660]">
                  Every Up Shot client receives their own isolated DigitalOcean Droplet — a private cloud server provisioned in the region of your choice. There are no shared resources, no noisy neighbors, and no risk of one client's activity affecting another. Your server is yours: always on, always isolated, always under your control.
                </p>
                <p className="mt-4 text-sm text-[#666660]/80">
                  Choose your deployment region to minimize latency and meet data residency requirements.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="flex items-center justify-center rounded-2xl border border-[#E4E4DF] bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.05)]" style={{ minHeight: '280px' }}>
                <div className="flex w-full flex-col gap-3">
                  <div className="rounded-lg border border-[#E4E4DF] bg-[#F5F5F3] p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-[#666660]">Droplet: nyc3-upshot-client</span>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-xs font-medium text-green-600">Running</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#E4E4DF] bg-[#F5F5F3] p-4">
                    <p className="mb-2 text-xs font-medium text-[#0C0C0C]">Region</p>
                    <div className="flex gap-2">
                      <span className="rounded-full bg-[#0C0C0C] px-3 py-1 text-xs font-medium text-white">US East</span>
                      <span className="rounded-full border border-[#E4E4DF] bg-white px-3 py-1 text-xs text-[#666660]">EU West</span>
                      <span className="rounded-full border border-[#E4E4DF] bg-white px-3 py-1 text-xs text-[#666660]">Asia Pacific</span>
                    </div>
                  </div>
                  <div className="text-center text-xs text-[#666660]/40 mt-2">[Image placeholder — to be replaced]</div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Pillar 2 — N8N Automation Engine */}
      <section className="bg-[#F5F5F3] py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-16 md:grid-cols-2">
            <Reveal delay={0.15} className="order-2 md:order-1">
              <div className="flex items-center justify-center rounded-2xl border border-[#E4E4DF] bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.05)]" style={{ minHeight: '280px' }}>
                <div className="flex w-full flex-col gap-3">
                  <div className="flex items-center justify-between rounded-lg border border-[#E4E4DF] bg-[#F5F5F3] p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#3A6B35]" />
                      <span className="text-xs font-medium text-[#0C0C0C]">7 Active Workflows</span>
                    </div>
                    <span className="text-xs text-[#666660]">n8n</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {workflows.map((wf, i) => (
                      <div key={i} className="flex items-center gap-1.5 rounded-md border border-[#E4E4DF] bg-white px-2 py-1.5">
                        <Check size={12} className="text-[#3A6B35]" />
                        <span className="text-[10px] text-[#666660] truncate">{wf}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-center text-xs text-[#666660]/40 mt-2">[Image placeholder — to be replaced]</div>
                </div>
              </div>
            </Reveal>
            <Reveal className="order-1 md:order-2">
              <div className="max-w-lg">
                <SectionLabel icon={Workflow} text="Intelligent automation" />
                <h2
                  className="mt-4 text-3xl text-[#0C0C0C] md:text-4xl"
                  style={{ fontFamily: 'var(--font-display), serif' }}
                >
                  Seven production-ready workflows, deployed on day one.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#666660]">
                  Your Droplet comes pre-loaded with a private N8N automation instance and seven highly optimized workflows that handle every stage of the cold email process — from prospect research to reply tracking to opt-out enforcement. These aren't starter templates; they are the same workflows powering active outreach operations.
                </p>
                <p className="mt-4 text-sm text-[#666660]/80">
                  Accessible via a secure HTTPS/TLS public URL bound to your Droplet — no VPN, no complex networking required.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Pillar 3 — AI Lead Preparation */}
      <section className="bg-white py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-16 md:grid-cols-2">
            <Reveal>
              <div className="max-w-lg">
                <SectionLabel icon={Brain} text="AI-powered research" />
                <h2
                  className="mt-4 text-3xl text-[#0C0C0C] md:text-4xl"
                  style={{ fontFamily: 'var(--font-display), serif' }}
                >
                  Every prospect researched. Every email written from scratch.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#666660]">
                  Before a single email is sent, Up Shot's lead preparation system goes to work. It scrapes the prospect's LinkedIn profile and recent activity, cross-references their company website, and pulls in third-party signals like customer review sentiment. Claude AI then synthesizes this research into a complete prospect profile and writes three fully personalized emails — one for each stage of the sequence.
                </p>
                <ul className="mt-4 flex flex-col gap-2">
                  {aiFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 flex-shrink-0 text-[#3A6B35]" />
                      <span className="text-sm text-[#0C0C0C]">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 rounded-xl bg-[#EAEFE8] border border-[#C5DCC2] p-4">
                  <p className="text-sm text-[#0C0C0C]">
                    Lead preparation is the only billable event. Once a prospect is researched and their three emails are drafted, re-sending the sequence to non-responders costs nothing extra.
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="flex items-center justify-center rounded-2xl border border-[#E4E4DF] bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.05)]" style={{ minHeight: '280px' }}>
                <div className="flex w-full flex-col gap-3">
                  <div className="rounded-lg border border-[#E4E4DF] bg-[#F5F5F3] p-4">
                    <p className="text-xs font-medium text-[#0C0C0C] mb-2">Lead Profile</p>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <span className="text-[10px] text-[#666660] w-16">Name</span>
                        <span className="text-[10px] text-[#0C0C0C]">Jane Smith</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[10px] text-[#666660] w-16">Company</span>
                        <span className="text-[10px] text-[#0C0C0C]">Acme Corp</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[10px] text-[#666660] w-16">LinkedIn</span>
                        <span className="text-[10px] text-[#0C0C0C]">VP of Sales</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex-1 rounded-md bg-[#0C0C0C] py-1.5 text-center text-[10px] font-medium text-white">Email 1</span>
                    <span className="flex-1 rounded-md border border-[#E4E4DF] bg-white py-1.5 text-center text-[10px] text-[#666660]">Email 2</span>
                    <span className="flex-1 rounded-md border border-[#E4E4DF] bg-white py-1.5 text-center text-[10px] text-[#666660]">Email 3</span>
                  </div>
                  <div className="text-center text-xs text-[#666660]/40 mt-2">[Image placeholder — to be replaced]</div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Pillar 4 — Multi-Inbox Sequence Delivery */}
      <section className="bg-[#F5F5F3] py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-16 md:grid-cols-2">
            <Reveal delay={0.15} className="order-2 md:order-1">
              <div className="flex items-center justify-center rounded-2xl border border-[#E4E4DF] bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.05)]" style={{ minHeight: '280px' }}>
                <div className="flex w-full flex-col gap-3">
                  {['inbox@domain1.com', 'inbox@domain2.com', 'inbox@domain3.com'].map((email, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-[#E4E4DF] bg-[#F5F5F3] p-3">
                      <span className="font-mono text-xs text-[#0C0C0C]">{email}</span>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">Active</span>
                        <span className="text-[10px] text-[#666660]">Sending</span>
                      </div>
                    </div>
                  ))}
                  <div className="text-center text-xs text-[#666660]/40 mt-2">[Image placeholder — to be replaced]</div>
                </div>
              </div>
            </Reveal>
            <Reveal className="order-1 md:order-2">
              <div className="max-w-lg">
                <SectionLabel icon={Mail} text="Sequence delivery" />
                <h2
                  className="mt-4 text-3xl text-[#0C0C0C] md:text-4xl"
                  style={{ fontFamily: 'var(--font-display), serif' }}
                >
                  Three-email sequences, across as many inboxes as you need.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#666660]">
                  Your drafted sequences are delivered through dedicated Gmail inboxes connected to properly warmed sending domains. Each sequence rotates sends intelligently across your inboxes to protect deliverability, spread sending volume, and maximize inbox placement. Opt-outs are captured and permanently suppressed in real-time — never re-contacted, never re-queued.
                </p>
                <ul className="mt-4 flex flex-col gap-2">
                  {deliveryFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 flex-shrink-0 text-[#3A6B35]" />
                      <span className="text-sm text-[#0C0C0C]">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Pillar 5 — Performance Dashboard */}
      <section className="bg-white py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-16 md:grid-cols-2">
            <Reveal>
              <div className="max-w-lg">
                <SectionLabel icon={LayoutDashboard} text="Real-time visibility" />
                <h2
                  className="mt-4 text-3xl text-[#0C0C0C] md:text-4xl"
                  style={{ fontFamily: 'var(--font-display), serif' }}
                >
                  Your outreach, fully visible. Always.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#666660]">
                  The Up Shot dashboard gives you live visibility into every dimension of your outreach operation. Track what's working, inspect what's been sent, and understand your cost per outcome — all without leaving the platform.
                </p>
                <ul className="mt-4 flex flex-col gap-2">
                  {dashboardFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 flex-shrink-0 text-[#3A6B35]" />
                      <span className="text-sm text-[#0C0C0C]">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="flex items-center justify-center rounded-2xl border border-[#E4E4DF] bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.05)]" style={{ minHeight: '280px' }}>
                <div className="flex w-full flex-col gap-3">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="rounded-lg border border-[#E4E4DF] bg-[#F5F5F3] p-2 text-center">
                      <p className="text-lg font-semibold text-[#0C0C0C]">42%</p>
                      <p className="text-[9px] text-[#666660]">Opens</p>
                    </div>
                    <div className="rounded-lg border border-[#E4E4DF] bg-[#F5F5F3] p-2 text-center">
                      <p className="text-lg font-semibold text-[#0C0C0C]">8.3%</p>
                      <p className="text-[9px] text-[#666660]">Replies</p>
                    </div>
                    <div className="rounded-lg border border-[#E4E4DF] bg-[#F5F5F3] p-2 text-center">
                      <p className="text-lg font-semibold text-[#0C0C0C]">1.2%</p>
                      <p className="text-[9px] text-[#666660]">Opt-Outs</p>
                    </div>
                    <div className="rounded-lg border border-[#E4E4DF] bg-[#F5F5F3] p-2 text-center">
                      <p className="text-lg font-semibold text-[#0C0C0C]">$0.15</p>
                      <p className="text-[9px] text-[#666660]">Cost/Lead</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#E4E4DF] bg-[#F5F5F3] p-3">
                    <div className="flex items-end gap-1 h-12">
                      <div className="flex-1 bg-[#3A6B35]/20 rounded-t" style={{ height: '40%' }} />
                      <div className="flex-1 bg-[#3A6B35]/40 rounded-t" style={{ height: '60%' }} />
                      <div className="flex-1 bg-[#3A6B35]/60 rounded-t" style={{ height: '80%' }} />
                      <div className="flex-1 bg-[#3A6B35] rounded-t" style={{ height: '100%' }} />
                      <div className="flex-1 bg-[#3A6B35]/80 rounded-t" style={{ height: '70%' }} />
                      <div className="flex-1 bg-[#3A6B35]/50 rounded-t" style={{ height: '50%' }} />
                    </div>
                  </div>
                  <div className="text-center text-xs text-[#666660]/40 mt-2">[Image placeholder — to be replaced]</div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
