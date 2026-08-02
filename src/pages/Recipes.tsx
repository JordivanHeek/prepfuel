import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import RecipeCard from '../components/RecipeCard'
import type { Category } from '../types'

const CATEGORIES: { key: Category | 'alle'; label: string }[] = [
  { key: 'alle', label: 'Alle' },
  { key: 'ontbijt', label: 'Ontbijt' },
  { key: 'lunch-koud', label: 'Lunch' },
  { key: 'avond', label: 'Avond' },
  { key: 'shake', label: 'Shakes' },
  { key: 'snack', label: 'Snacks' },
]

export default function Recipes() {
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  const [cat, setCat] = useState<Category | 'alle'>('alle')
  const [q, setQ] = useState('')
  const [coldOnly, setColdOnly] = useState(false)
  const [proteinOnly, setProteinOnly] = useState(false)

  const filtered = useMemo(() => {
    let list = recipes ?? []
    if (cat !== 'alle') list = list.filter((r) => r.category === cat)
    if (coldOnly) list = list.filter((r) => r.isColdPortable)
    if (proteinOnly) list = list.filter((r) => r.macros.protein >= 30)
    const s = q.trim().toLowerCase()
    if (s) list = list.filter((r) => r.name.toLowerCase().includes(s) || r.tags.some((t) => t.includes(s)))
    return list
  }, [recipes, cat, coldOnly, proteinOnly, q])

  return (
    <div className="space-y-3">
      <header className="pt-1">
        <h1 className="text-xl font-bold">Recepten 📖</h1>
        <p className="text-sm text-slate-400">{recipes?.length ?? 0} recepten in je bibliotheek</p>
      </header>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Zoek op naam of tag…"
        className="input"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={`chip whitespace-nowrap px-3 py-1.5 tap ${
              cat === c.key
                ? 'bg-brand-500 text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setColdOnly((v) => !v)}
          className={`chip px-3 py-1.5 tap ${
            coldOnly ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          ❄️ Koud & mee
        </button>
        <button
          onClick={() => setProteinOnly((v) => !v)}
          className={`chip px-3 py-1.5 tap ${
            proteinOnly ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          💪 Eiwitrijk
        </button>
      </div>

      <div className="space-y-2.5">
        {filtered.map((r) => (
          <RecipeCard key={r.id} recipe={r} />
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">Geen recepten gevonden.</p>
        )}
      </div>
    </div>
  )
}
