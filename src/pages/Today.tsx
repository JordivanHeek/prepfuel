import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import MacroRings from '../components/MacroRings'
import RecipePicker from '../components/RecipePicker'
import type { Slot } from '../types'
import { macrosForEntry, sumMacros } from '../lib/plan'
import {
  SLOTS, SLOT_LABEL, todayISO, formatDateNL, greeting, isWeekend, emptyMacros, uid,
} from '../lib/util'

export default function Today() {
  const date = todayISO()
  const today = new Date()
  const weekend = isWeekend(today)

  const profile = useLiveQuery(() => db.profile.get(1), [])
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  const entries = useLiveQuery(() => db.planEntries.where('date').equals(date).toArray(), [date])

  const [picking, setPicking] = useState(false)

  const recipeMap = useMemo(
    () => new Map((recipes ?? []).map((r) => [r.id, r])),
    [recipes],
  )

  const totals = useMemo(() => {
    if (!entries) return emptyMacros()
    return sumMacros(
      entries.filter((e) => e.done).map((e) => macrosForEntry(e, recipeMap.get(e.recipeId))),
    )
  }, [entries, recipeMap])

  const targets = profile?.targets ?? { kcal: 2900, protein: 165, carbs: 380, fat: 80 }
  const creatineDone = profile?.creatineDoneDates.includes(date) ?? false

  async function toggleDone(id: string, done: boolean) {
    await db.planEntries.update(id, { done: !done })
  }

  async function removeEntry(id: string) {
    await db.planEntries.delete(id)
  }

  async function toggleCreatine() {
    if (!profile) return
    const set = new Set(profile.creatineDoneDates)
    if (set.has(date)) set.delete(date)
    else set.add(date)
    await db.profile.update(1, { creatineDoneDates: [...set] })
  }

  async function quickAdd(recipeId: string) {
    await db.planEntries.add({
      id: uid(), date, slot: 'snack', recipeId, personVariant: null, servings: 1, done: true,
    })
    setPicking(false)
  }

  const bySlot = (slot: Slot) => (entries ?? []).filter((e) => e.slot === slot)

  const quickRecipes = (recipes ?? []).filter((r) => r.category === 'snack' || r.category === 'shake')

  return (
    <div className="space-y-4">
      <header className="pt-1">
        <p className="text-sm text-slate-400">{greeting()}, Jordi 💪</p>
        <h1 className="text-xl font-bold capitalize">{formatDateNL(today)}</h1>
      </header>

      {/* Macro-voortgang */}
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Vandaag gegeten</h2>
          <span className="text-xs text-slate-400">van dagdoel</span>
        </div>
        <MacroRings totals={totals} targets={targets} />
      </section>

      {/* Creatine reminder */}
      {profile?.creatineEnabled && (
        <button
          onClick={toggleCreatine}
          className={`card flex w-full items-center gap-3 p-4 text-left tap ${
            creatineDone ? 'ring-2 ring-brand-400' : ''
          }`}
        >
          <span className="text-2xl">💊</span>
          <span className="flex-1">
            <span className="block font-semibold">Creatine</span>
            <span className="text-xs text-slate-400">3–5 g monohydraat · moment maakt niet uit</span>
          </span>
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
              creatineDone ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 dark:border-slate-600'
            }`}
          >
            {creatineDone ? '✓' : ''}
          </span>
        </button>
      )}

      {weekend && (
        <div className="card bg-gradient-to-r from-brand-50 to-emerald-100 p-4 dark:from-slate-800 dark:to-slate-800">
          <p className="font-semibold">Weekend = flexibel 🎉</p>
          <p className="text-sm text-slate-500 dark:text-slate-300">Geen verplicht plan. Eet lekker en geniet.</p>
        </div>
      )}

      {/* Maaltijden per slot */}
      <section className="space-y-3">
        {SLOTS.map((slot) => {
          const items = bySlot(slot)
          return (
            <div key={slot}>
              <h3 className="mb-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                {SLOT_LABEL[slot]}
              </h3>
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-sm text-slate-400 dark:border-slate-800">
                  Niets gepland
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {items.map((e) => {
                    const r = recipeMap.get(e.recipeId)
                    const m = macrosForEntry(e, r)
                    return (
                      <li key={e.id} className="card flex items-center gap-3 p-3">
                        <button
                          onClick={() => toggleDone(e.id, e.done)}
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 tap ${
                            e.done
                              ? 'border-brand-500 bg-brand-500 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                          aria-label="gegeten"
                        >
                          {e.done ? '✓' : ''}
                        </button>
                        <Link to={`/recept/${e.recipeId}`} className="min-w-0 flex-1 tap">
                          <p className={`truncate font-medium ${e.done ? 'line-through text-slate-400' : ''}`}>
                            {r?.emoji} {r?.name ?? 'Onbekend recept'}
                            {e.personVariant === 'Frederiek' && ' 🐟'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {m.kcal} kcal · {m.protein} g eiwit · bekijk recept ›
                          </p>
                        </Link>
                        <button onClick={() => removeEntry(e.id)} className="text-slate-300 tap" aria-label="verwijder">
                          ✕
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </section>

      <button onClick={() => setPicking(true)} className="btn-primary w-full">
        + snack / shake toevoegen
      </button>

      <p className="pb-2 text-center text-[11px] text-slate-400">
        Macro's zijn richtwaarden — pas ze aan per recept.
      </p>

      {picking && (
        <RecipePicker
          title="Snel loggen op vandaag"
          recipes={quickRecipes}
          onPick={quickAdd}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  )
}
