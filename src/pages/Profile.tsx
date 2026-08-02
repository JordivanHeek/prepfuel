import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Profile as ProfileT, Macros } from '../types'
import { weekdayFull } from '../lib/util'

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]
const SUPERMARKETS: ProfileT['supermarket'][] = ['Lidl', 'AH', 'Hoogvliet']

export default function Profile() {
  const profile = useLiveQuery(() => db.profile.get(1), [])
  if (!profile) return <p className="py-10 text-center text-slate-400">Laden…</p>

  const update = (patch: Partial<ProfileT>) => db.profile.update(1, patch)
  const updateTarget = (key: keyof Macros, value: number) =>
    update({ targets: { ...profile.targets, [key]: value } })

  function toggleOfficeDay(wd: number) {
    const set = new Set(profile!.officeDays)
    if (set.has(wd)) set.delete(wd)
    else set.add(wd)
    update({ officeDays: [...set].sort((a, b) => a - b) })
  }

  function toggleCookDay(wd: number) {
    const set = new Set(profile!.cookDays ?? [])
    if (set.has(wd)) set.delete(wd)
    else set.add(wd)
    update({ cookDays: [...set].sort((a, b) => a - b) })
  }

  const macroFields: { key: keyof Macros; label: string; unit: string }[] = [
    { key: 'kcal', label: 'Calorieën', unit: 'kcal' },
    { key: 'protein', label: 'Eiwit', unit: 'g' },
    { key: 'carbs', label: 'Koolhydraten', unit: 'g' },
    { key: 'fat', label: 'Vet', unit: 'g' },
  ]

  return (
    <div className="space-y-4 pb-4">
      <header className="pt-1">
        <h1 className="text-xl font-bold">Profiel ⚙️</h1>
      </header>

      {/* Gewicht */}
      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">Gewicht</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-400">Huidig (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              value={profile.weight}
              onChange={(e) => update({ weight: Number(e.target.value) })}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-400">Streefgewicht (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              value={profile.goalWeight}
              onChange={(e) => update({ goalWeight: Number(e.target.value) })}
              className="input"
            />
          </label>
        </div>
        <p className="text-xs text-slate-400">Lean bulk: streef naar ~0,25–0,5% groei per week.</p>
      </section>

      {/* Macro-doelen */}
      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">Dagelijkse macro-doelen</h2>
        {macroFields.map((f) => (
          <label key={f.key} className="flex items-center justify-between gap-3">
            <span className="text-sm">{f.label}</span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                value={profile.targets[f.key]}
                onChange={(e) => updateTarget(f.key, Number(e.target.value))}
                className="input w-24 text-right"
              />
              <span className="w-8 text-xs text-slate-400">{f.unit}</span>
            </span>
          </label>
        ))}
      </section>

      {/* Kantoordagen */}
      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">Kantoordagen</h2>
        <p className="text-xs text-slate-400">Op deze dagen mag de lunch alleen koud & meeneembaar zijn.</p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((wd) => {
            const active = profile.officeDays.includes(wd)
            return (
              <button
                key={wd}
                onClick={() => toggleOfficeDay(wd)}
                className={`chip px-3 py-1.5 capitalize tap ${
                  active ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {weekdayFull(wd).slice(0, 2)}
              </button>
            )
          })}
        </div>
      </section>

      {/* Kook-/prep-dagen */}
      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">Kook-/prep-dagen</h2>
        <p className="text-xs text-slate-400">
          Op deze dagen bereid je in één keer voor. Het weekplan groepeert de gerechten per sessie.
        </p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((wd) => {
            const active = (profile.cookDays ?? []).includes(wd)
            return (
              <button
                key={wd}
                onClick={() => toggleCookDay(wd)}
                className={`chip px-3 py-1.5 capitalize tap ${
                  active ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {weekdayFull(wd).slice(0, 2)}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-slate-400">
          Samen met {profile.partnerName || 'je partner'}: ontbijt & avondeten (2 porties). Lunch & snacks zijn voor jou alleen.
        </p>
      </section>

      {/* Supermarkt */}
      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">Supermarkt (label boodschappen)</h2>
        <div className="flex gap-2">
          {SUPERMARKETS.map((s) => (
            <button
              key={s}
              onClick={() => update({ supermarket: s })}
              className={`chip flex-1 justify-center px-3 py-2 tap ${
                profile.supermarket === s ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* Toggles */}
      <section className="card divide-y divide-slate-100 dark:divide-slate-800">
        <Toggle
          label="Creatine-reminder"
          desc="3–5 g monohydraat per dag"
          on={profile.creatineEnabled}
          onToggle={() => update({ creatineEnabled: !profile.creatineEnabled })}
        />
        <Toggle
          label="Donkere modus"
          desc="Fijn voor 's avonds"
          on={profile.darkMode}
          onToggle={() => update({ darkMode: !profile.darkMode })}
        />
      </section>

      <p className="text-center text-[11px] text-slate-400">
        Alle data staat lokaal op je telefoon (IndexedDB). Niks gaat naar een server.
      </p>
    </div>
  )
}

function Toggle({
  label, desc, on, onToggle,
}: { label: string; desc: string; on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex w-full items-center justify-between p-4 text-left tap">
      <span>
        <span className="block font-medium">{label}</span>
        <span className="text-xs text-slate-400">{desc}</span>
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          on ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
            on ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}
