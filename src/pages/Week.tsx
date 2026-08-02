import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import RecipePicker from '../components/RecipePicker'
import MacroBadges from '../components/MacroBadges'
import type { Slot, Person } from '../types'
import { macrosForEntry, sumMacros } from '../lib/plan'
import { generateWeekPlan } from '../lib/autoplan'
import {
  SLOTS, SLOT_LABEL, SLOT_CATEGORIES, weekdaysOf, toISODate, isoWeekday,
  weekdayFull, uid,
} from '../lib/util'

export default function Week() {
  const [weekOffset, setWeekOffset] = useState(0)
  const profile = useLiveQuery(() => db.profile.get(1), [])
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])

  const base = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + weekOffset * 7)
    return d
  }, [weekOffset])

  const days = useMemo(() => weekdaysOf(base), [base])
  const firstISO = toISODate(days[0])
  const lastISO = toISODate(days[4])

  const entries = useLiveQuery(
    () => db.planEntries.where('date').between(firstISO, lastISO, true, true).toArray(),
    [firstISO, lastISO],
  )

  const [picker, setPicker] = useState<{ date: string; slot: Slot; office: boolean } | null>(null)

  const recipeMap = useMemo(() => new Map((recipes ?? []).map((r) => [r.id, r])), [recipes])
  const officeDays = profile?.officeDays ?? []

  function entriesFor(date: string, slot: Slot) {
    return (entries ?? []).filter((e) => e.date === date && e.slot === slot)
  }

  function dayTotal(date: string) {
    const list = (entries ?? []).filter((e) => e.date === date)
    return sumMacros(list.map((e) => macrosForEntry(e, recipeMap.get(e.recipeId))))
  }

  async function pickRecipe(recipeId: string) {
    if (!picker) return
    const r = recipeMap.get(recipeId)
    const variant: Person | null = r?.proteinVariants ? 'Jordi' : null
    // vervang bestaande keuze in dit slot
    const existing = entriesFor(picker.date, picker.slot)
    await db.planEntries.bulkDelete(existing.map((e) => e.id))
    await db.planEntries.add({
      id: uid(), date: picker.date, slot: picker.slot, recipeId,
      personVariant: variant, servings: 1, done: false,
    })
    setPicker(null)
  }

  async function generatePlan() {
    if (!recipes || !profile) return
    const existing = entries ?? []
    if (existing.length > 0 &&
        !window.confirm('Er staat al een plan voor deze week. Wil je dit overschrijven met een automatisch plan?')) {
      return
    }
    await db.planEntries.bulkDelete(existing.map((e) => e.id))
    const generated = generateWeekPlan(days, recipes, officeDays, profile.targets)
    await db.planEntries.bulkAdd(generated)
  }

  async function changeServings(id: string, current: number, delta: number) {
    const next = Math.max(1, (current ?? 1) + delta)
    await db.planEntries.update(id, { servings: next })
  }

  async function clearSlot(date: string, slot: Slot) {
    const existing = entriesFor(date, slot)
    await db.planEntries.bulkDelete(existing.map((e) => e.id))
  }

  async function toggleVariant(id: string, current: Person | null) {
    const next: Person = current === 'Frederiek' ? 'Jordi' : 'Frederiek'
    await db.planEntries.update(id, { personVariant: next })
  }

  function pickerRecipes(slot: Slot, office: boolean) {
    let list = (recipes ?? []).filter((r) => SLOT_CATEGORIES[slot].includes(r.category))
    if (slot === 'lunch' && office) list = list.filter((r) => r.isColdPortable)
    return list
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-1">
        <h1 className="text-xl font-bold">Weekplanner 📅</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="btn-ghost px-3 py-1.5 text-sm">←</button>
          <button onClick={() => setWeekOffset(0)} className="btn-ghost px-3 py-1.5 text-sm">Nu</button>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="btn-ghost px-3 py-1.5 text-sm">→</button>
        </div>
      </header>

      <button onClick={generatePlan} className="btn-primary w-full">
        ✨ Genereer weekplan (past bij je macro's)
      </button>
      <p className="text-xs text-slate-400">
        Vult ma–vr automatisch richting {profile?.targets.kcal ?? 2900} kcal / {profile?.targets.protein ?? 165} g eiwit.
        Kantoordagen (koude lunch) staan met 🏢. Weekend blijft vrij. Nog eens tikken = nieuwe variatie.
      </p>

      <div className="space-y-3">
        {days.map((d) => {
          const date = toISODate(d)
          const wd = isoWeekday(d)
          const isOffice = officeDays.includes(wd)
          const total = dayTotal(date)
          const isToday = date === toISODate(new Date())
          return (
            <section key={date} className={`card p-3 ${isToday ? 'ring-2 ring-brand-400' : ''}`}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold capitalize">
                  {weekdayFull(wd)} {isOffice && <span title="kantoordag">🏢</span>}
                </h2>
                <span className="text-xs text-slate-400">{d.getDate()}/{d.getMonth() + 1}</span>
              </div>

              <div className="space-y-1.5">
                {SLOTS.map((slot) => {
                  const items = entriesFor(date, slot)
                  const lockCold = slot === 'lunch' && isOffice
                  return (
                    <div key={slot} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-xs font-medium text-slate-400">
                        {SLOT_LABEL[slot]}
                      </span>
                      {items.length === 0 ? (
                        <button
                          onClick={() => setPicker({ date, slot, office: isOffice })}
                          className="flex-1 rounded-lg border border-dashed border-slate-200 px-2 py-1.5 text-left text-sm text-slate-400 tap dark:border-slate-700"
                        >
                          + kies{lockCold ? ' (koud)' : ''}
                        </button>
                      ) : (
                        items.map((e) => {
                          const r = recipeMap.get(e.recipeId)
                          const coldViolation = lockCold && r && !r.isColdPortable
                          const servings = e.servings ?? 1
                          return (
                            <div
                              key={e.id}
                              className={`flex-1 rounded-lg px-2 py-1.5 text-sm ${
                                coldViolation
                                  ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                                  : 'bg-slate-50 dark:bg-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setPicker({ date, slot, office: isOffice })}
                                  className="min-w-0 flex-1 truncate text-left tap"
                                >
                                  {r?.emoji} {r?.name}
                                  {e.personVariant === 'Frederiek' && ' 🐟'}
                                  {coldViolation && ' ⚠️'}
                                </button>
                                <button onClick={() => clearSlot(date, slot)} className="text-slate-300 tap">✕</button>
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                {r?.proteinVariants && (
                                  <button
                                    onClick={() => toggleVariant(e.id, e.personVariant)}
                                    className="chip bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                                    title="wissel variant"
                                  >
                                    {e.personVariant === 'Frederiek' ? 'Frederiek 🐟' : 'Jordi'}
                                  </button>
                                )}
                                <div className="flex items-center gap-1 rounded-full bg-white px-1 dark:bg-slate-900">
                                  <button
                                    onClick={() => changeServings(e.id, servings, -1)}
                                    className="h-5 w-5 rounded-full text-slate-500 tap"
                                    aria-label="minder porties"
                                  >
                                    −
                                  </button>
                                  <span className="min-w-[38px] text-center text-[11px] text-slate-500">
                                    {servings}× portie
                                  </span>
                                  <button
                                    onClick={() => changeServings(e.id, servings, 1)}
                                    className="h-5 w-5 rounded-full text-slate-500 tap"
                                    aria-label="meer porties"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )
                })}
              </div>

              {total.kcal > 0 && (
                <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                  <p className="mb-1 text-[11px] text-slate-400">
                    Dagtotaal (doel {profile?.targets.kcal ?? 2900} kcal / {profile?.targets.protein ?? 165} g E)
                  </p>
                  <MacroBadges m={total} size="xs" />
                </div>
              )}
            </section>
          )
        })}
      </div>

      <div className="card bg-gradient-to-r from-brand-50 to-emerald-100 p-4 dark:from-slate-800 dark:to-slate-800">
        <p className="font-semibold">Weekend = flexibel 🎉</p>
        <p className="text-sm text-slate-500 dark:text-slate-300">Zaterdag & zondag plan je niet — eet naar behoefte.</p>
      </div>

      {picker && (
        <RecipePicker
          title={`Kies voor ${SLOT_LABEL[picker.slot].toLowerCase()}`}
          note={
            picker.slot === 'lunch' && picker.office
              ? '🏢 Kantoordag: alleen koude, meeneembare lunches.'
              : undefined
          }
          recipes={pickerRecipes(picker.slot, picker.office)}
          onPick={pickRecipe}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}
