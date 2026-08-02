import { Link } from 'react-router-dom'
import type { Recipe } from '../types'

const CATEGORY_LABEL: Record<Recipe['category'], string> = {
  ontbijt: 'Ontbijt',
  'lunch-koud': 'Lunch (koud)',
  avond: 'Avond',
  shake: 'Shake',
  snack: 'Snack',
}

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link to={`/recept/${recipe.id}`} className="card tap block overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-emerald-100 text-4xl dark:from-slate-800 dark:to-slate-800">
          {recipe.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-slate-400">
              {CATEGORY_LABEL[recipe.category]}
            </span>
          </div>
          <h3 className="truncate font-semibold leading-tight">{recipe.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-amber-600 dark:text-amber-400">{recipe.macros.kcal} kcal</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{recipe.macros.protein} g eiwit</span>
            <span>⏱ {recipe.prepTimeMin} min</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {recipe.isColdPortable && (
              <span className="chip bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">❄️ koud & mee</span>
            )}
            {recipe.fridgeDays >= 2 && (
              <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                🗓 {recipe.fridgeDays} dg houdbaar
              </span>
            )}
            {recipe.proteinVariants && (
              <span className="chip bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">🐟 vis-swap</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
