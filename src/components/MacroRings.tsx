import type { Macros } from '../types'

interface RingProps {
  label: string
  value: number
  target: number
  unit: string
  color: string
}

function Ring({ label, value, target, unit, color }: RingProps) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0
  const r = 26
  const c = 2 * Math.PI * r
  const dash = c * pct
  const over = value > target
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-[68px] w-[68px]">
        <svg viewBox="0 0 68 68" className="h-full w-full -rotate-90">
          <circle cx="34" cy="34" r={r} fill="none" strokeWidth="7" className="stroke-slate-200 dark:stroke-slate-800" />
          <circle
            cx="34"
            cy="34"
            r={r}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            stroke={color}
            strokeDasharray={`${dash} ${c}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold leading-none">{Math.round(value)}</span>
          <span className="text-[9px] text-slate-400">/{target}{unit}</span>
        </div>
      </div>
      <span className={`text-xs font-medium ${over ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`}>
        {label}
      </span>
    </div>
  )
}

export default function MacroRings({ totals, targets }: { totals: Macros; targets: Macros }) {
  return (
    <div className="grid grid-cols-4 gap-1">
      <Ring label="kcal" value={totals.kcal} target={targets.kcal} unit="" color="#f59e0b" />
      <Ring label="eiwit" value={totals.protein} target={targets.protein} unit="g" color="#10b981" />
      <Ring label="koolh" value={totals.carbs} target={targets.carbs} unit="g" color="#3b82f6" />
      <Ring label="vet" value={totals.fat} target={targets.fat} unit="g" color="#ec4899" />
    </div>
  )
}
