import { useMemo, useState } from 'react'
import type { Recipe } from '../types'

interface Props {
  title: string
  recipes: Recipe[]
  note?: string
  onPick: (recipeId: string) => void
  onClose: () => void
}

// Bottom-sheet selector die uit de bibliotheek put.
export default function RecipePicker({ title, recipes, note, onPick, onClose }: Props) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return recipes
    return recipes.filter((r) => r.name.toLowerCase().includes(s))
  }, [q, recipes])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-md rounded-t-3xl bg-white p-4 shadow-2xl dark:bg-slate-900 safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-sm text-slate-400 tap">Sluiten</button>
        </div>
        {note && <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">{note}</p>}
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Zoek recept…"
          className="input mb-3"
        />
        <ul className="max-h-[55vh] space-y-1.5 overflow-y-auto">
          {filtered.length === 0 && (
            <li className="py-6 text-center text-sm text-slate-400">Geen recepten gevonden.</li>
          )}
          {filtered.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => onPick(r.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-2.5 text-left tap dark:border-slate-800"
              >
                <span className="text-2xl">{r.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.name}</span>
                  <span className="text-xs text-slate-400">
                    {r.macros.kcal} kcal · {r.macros.protein} g E
                    {r.isColdPortable ? ' · ❄️' : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
