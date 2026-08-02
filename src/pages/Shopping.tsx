import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Person, Ingredient, Aisle, PlanEntry } from '../types'
import { ingredientsForVariant } from '../lib/plan'
import { AISLE_ORDER, weekdaysOf, toISODate } from '../lib/util'

type Source = 'weekNow' | 'weekNext' | 'loose'
type LooseItem = { recipeId: string; person: Person | null; servings?: number }
type Aggregated = { key: string; name: string; unit: string; qty: number; aisle: Aisle }

function itemKey(i: Ingredient): string {
  return `${i.name.toLowerCase()}|${i.unit.toLowerCase()}`
}

export default function Shopping() {
  const [source, setSource] = useState<Source>('weekNow')
  const profile = useLiveQuery(() => db.profile.get(1), [])
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  const looseRow = useLiveQuery(() => db.kv.get('shoppingLoose'), [])
  const checkedRow = useLiveQuery(() => db.kv.get('shoppingChecked'), [])

  const recipeMap = useMemo(() => new Map((recipes ?? []).map((r) => [r.id, r])), [recipes])
  const checked = (checkedRow?.value as Record<string, boolean> | undefined) ?? {}
  const loose = (looseRow?.value as LooseItem[] | undefined) ?? []

  // Plan entries voor week-bronnen
  const weekDays = useMemo(() => {
    const offset = source === 'weekNext' ? 1 : 0
    const d = new Date()
    d.setDate(d.getDate() + offset * 7)
    return weekdaysOf(d).map(toISODate)
  }, [source])

  const planEntriesCache = useLiveQuery(
    () =>
      source === 'loose'
        ? Promise.resolve([] as PlanEntry[])
        : db.planEntries.where('date').between(weekDays[0], weekDays[4], true, true).toArray(),
    [source, weekDays[0], weekDays[4]],
  )

  // Echte picks (met plan entries geladen). Gedeelde maaltijden tellen ook
  // de porties van de partner mee (evt. met zijn eigen vis-variant).
  const effectivePicks: LooseItem[] = useMemo(() => {
    if (source === 'loose') return loose
    return (planEntriesCache ?? []).flatMap((e) => {
      const picks: LooseItem[] = [
        { recipeId: e.recipeId, person: e.personVariant, servings: e.servings ?? 1 },
      ]
      if ((e.partnerServings ?? 0) > 0) {
        picks.push({ recipeId: e.recipeId, person: e.partnerVariant ?? null, servings: e.partnerServings })
      }
      return picks
    })
  }, [source, loose, planEntriesCache])

  // Aggregatie per ingrediënt (naam + eenheid), gegroepeerd per schap
  const grouped = useMemo(() => {
    const map = new Map<string, Aggregated>()
    for (const p of effectivePicks) {
      const r = recipeMap.get(p.recipeId)
      if (!r) continue
      const mult = p.servings ?? 1
      for (const ing of ingredientsForVariant(r, p.person)) {
        const key = itemKey(ing)
        const qty = ing.qty * mult
        const cur = map.get(key)
        if (cur) cur.qty += qty
        else map.set(key, { key, name: ing.name, unit: ing.unit, qty, aisle: ing.aisle })
      }
    }
    const byAisle = new Map<Aisle, Aggregated[]>()
    for (const item of map.values()) {
      const arr = byAisle.get(item.aisle) ?? []
      arr.push(item)
      byAisle.set(item.aisle, arr)
    }
    return AISLE_ORDER
      .filter((a) => byAisle.has(a))
      .map((a) => ({ aisle: a, items: byAisle.get(a)!.sort((x, y) => x.name.localeCompare(y.name)) }))
  }, [effectivePicks, recipeMap])

  const totalItems = grouped.reduce((n, g) => n + g.items.length, 0)
  const checkedCount = grouped.reduce(
    (n, g) => n + g.items.filter((i) => checked[i.key]).length, 0,
  )

  async function toggle(key: string) {
    const next = { ...checked, [key]: !checked[key] }
    await db.kv.put({ key: 'shoppingChecked', value: next })
  }

  async function resetChecks() {
    await db.kv.put({ key: 'shoppingChecked', value: {} })
  }

  async function clearLoose() {
    await db.kv.put({ key: 'shoppingLoose', value: [] })
  }

  function buildText(): string {
    const lines = [`Boodschappen (${profile?.supermarket ?? 'Lidl'})`, '']
    for (const g of grouped) {
      lines.push(`— ${g.aisle} —`)
      for (const i of g.items) lines.push(`[ ] ${i.name} — ${round(i.qty)} ${i.unit}`)
      lines.push('')
    }
    return lines.join('\n')
  }

  async function share() {
    const text = buildText()
    try {
      if (navigator.share) await navigator.share({ title: 'Boodschappen', text })
      else {
        await navigator.clipboard.writeText(text)
        alert('Lijst gekopieerd naar klembord ✓')
      }
    } catch {
      /* gebruiker annuleerde */
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(buildText())
    alert('Lijst gekopieerd ✓')
  }

  const sources: { key: Source; label: string }[] = [
    { key: 'weekNow', label: 'Deze week' },
    { key: 'weekNext', label: 'Volgende week' },
    { key: 'loose', label: `Losse selectie (${loose.length})` },
  ]

  return (
    <div className="space-y-4">
      <header className="pt-1">
        <h1 className="text-xl font-bold">Boodschappen 🛒</h1>
        <p className="text-sm text-slate-400">
          Supermarkt: <span className="font-medium text-slate-600 dark:text-slate-300">{profile?.supermarket ?? 'Lidl'}</span>
          {' · '}indeling per schap
        </p>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {sources.map((s) => (
          <button
            key={s.key}
            onClick={() => setSource(s.key)}
            className={`chip whitespace-nowrap px-3 py-1.5 tap ${
              source === s.key ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {totalItems > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">{checkedCount}/{totalItems} afgevinkt</span>
          <div className="flex gap-2">
            <button onClick={copy} className="text-brand-600 dark:text-brand-400 tap">Kopieer</button>
            <button onClick={share} className="text-brand-600 dark:text-brand-400 tap">Deel</button>
            <button onClick={() => window.print()} className="text-brand-600 dark:text-brand-400 tap">Print</button>
          </div>
        </div>
      )}

      {totalItems === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-400">
          {source === 'loose'
            ? 'Nog geen losse recepten toegevoegd. Voeg ze toe vanuit een recept.'
            : 'Geen geplande maaltijden in deze week. Plan eerst je week in.'}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((g) => (
            <section key={g.aisle} className="card overflow-hidden">
              <h2 className="bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {g.aisle}
              </h2>
              <ul>
                {g.items.map((i) => {
                  const isChecked = !!checked[i.key]
                  return (
                    <li key={i.key} className="border-t border-slate-100 first:border-0 dark:border-slate-800">
                      <button
                        onClick={() => toggle(i.key)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left tap"
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                            isChecked ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isChecked ? '✓' : ''}
                        </span>
                        <span className={`flex-1 ${isChecked ? 'text-slate-400 line-through' : ''}`}>{i.name}</span>
                        <span className={`text-sm ${isChecked ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                          {round(i.qty)} {i.unit}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {totalItems > 0 && (
        <div className="flex gap-2">
          <button onClick={resetChecks} className="btn-ghost flex-1">Vinkjes resetten</button>
          {source === 'loose' && (
            <button onClick={clearLoose} className="btn-ghost flex-1">Selectie wissen</button>
          )}
        </div>
      )}
    </div>
  )
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
