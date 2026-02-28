import type { LucideIcon } from 'lucide-react'

interface SectionLabelProps {
  icon: LucideIcon
  text: string
}

export function SectionLabel({ icon: Icon, text }: SectionLabelProps) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAEFE8] text-[#3A6B35] text-xs font-medium tracking-wide">
      <Icon size={12} />
      <span>{text}</span>
    </div>
  )
}
