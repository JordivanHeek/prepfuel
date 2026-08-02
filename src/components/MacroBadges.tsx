import type { Macros } from '../types'

// Compacte macro-weergave (voor kaarten en dagtotalen)
export default function MacroBadges({ m, size = 'sm' }: { m: Macros; size?: 'sm' | 'xs' }) {
  const t = size === 'xs' ? 'text-[10px]' : 'text-xs'
  return (
    <div className={`flex flex-wrap gap-1.5 ${t} font-medium`}>
      <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
        {Math.round(m.kcal)} kcal
      </span>
      <span className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
        {Math.round(m.protein)} E
      </span>
      <span className="chip bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
        {Math.round(m.carbs)} K
      </span>
      <span className="chip bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300">
        {Math.round(m.fat)} V
      </span>
    </div>
  )
}
