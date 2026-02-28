'use client'

const logos = ['Springfield', 'Orbitc', 'Cloud', 'Proline', 'Luminous', 'Meridian']

export function LogoStrip() {
  return (
    <section className="border-y border-[#E4E4DF] bg-[#F5F5F3] py-10">
      <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-[#666660]/60">
        Trusted by the world leaders
      </p>
      <div className="overflow-hidden">
        <div
          className="flex gap-16 whitespace-nowrap"
          style={{ animation: 'marquee 30s linear infinite' }}
        >
          {[...logos, ...logos].map((name, i) => (
            <span
              key={i}
              className="text-lg font-semibold text-[#0C0C0C]/25 transition-colors hover:text-[#0C0C0C]/50"
              style={{ fontFamily: 'var(--font-body), sans-serif' }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
