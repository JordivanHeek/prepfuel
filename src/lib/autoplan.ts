import type { Recipe, PlanEntry, Macros, Slot } from '../types'
import { emptyMacros, addMacros, toISODate, isoWeekday, uid } from './util'

// Genereert automatisch een weekplan (ma–vr) dat de dagdoelen zo goed
// mogelijk benadert: ontbijt + lunch + avond + aanvullende snacks/shakes.
// Respecteert kantoordagen (koude lunch) en kiest voor avond altijd
// Jordi's niet-vis variant. Weekend blijft flexibel (leeg).
export function generateWeekPlan(
  days: Date[],
  recipes: Recipe[],
  officeDays: number[],
  targets: Macros,
): PlanEntry[] {
  const byCat = (c: Recipe['category']) => recipes.filter((r) => r.category === c)
  const breakfasts = byCat('ontbijt')
  const lunches = byCat('lunch-koud')
  const dinners = byCat('avond')
  const snacks = [...byCat('snack'), ...byCat('shake')]

  if (breakfasts.length === 0 || lunches.length === 0 || dinners.length === 0) return []

  // Willekeurige startpunten zodat "opnieuw genereren" variatie geeft.
  const rnd = (n: number) => Math.floor(Math.random() * n)
  let bi = rnd(breakfasts.length)
  let li = rnd(lunches.length)
  let di = rnd(dinners.length)

  const dinnerMacros = (r: Recipe): Macros => r.macros // = Jordi-variant

  const entries: PlanEntry[] = []

  for (const day of days) {
    const date = toISODate(day)
    const isOffice = officeDays.includes(isoWeekday(day))

    const breakfast = breakfasts[bi % breakfasts.length]
    bi++

    // Lunch: op kantoordagen alleen koud & meeneembaar (lunch-koud is dat).
    const lunchPool = isOffice ? lunches.filter((r) => r.isColdPortable) : lunches
    const pool = lunchPool.length ? lunchPool : lunches
    const lunch = pool[li % pool.length]
    li++

    const dinner = dinners[di % dinners.length]
    di++

    const add = (slot: Slot, recipe: Recipe, isDinner = false) => {
      entries.push({
        id: uid(),
        date,
        slot,
        recipeId: recipe.id,
        personVariant: isDinner && recipe.proteinVariants ? 'Jordi' : null,
        servings: 1,
        done: false,
      })
    }

    add('ontbijt', breakfast)
    add('lunch', lunch)
    add('avond', dinner, true)

    // Lopend dagtotaal
    let total = addMacros(
      addMacros(breakfast.macros, lunch.macros),
      dinnerMacros(dinner),
    )

    // Vul aan met snacks/shakes tot ~dagdoel (max 3).
    let count = 0
    while (count < 3) {
      const kcalGap = targets.kcal - total.kcal
      const proteinGap = targets.protein - total.protein
      if (kcalGap < 220 && proteinGap < 15) break // dichtbij genoeg

      const candidate = pickSnack(snacks, kcalGap, proteinGap)
      if (!candidate) break

      entries.push({
        id: uid(), date, slot: 'snack', recipeId: candidate.id,
        personVariant: null, servings: 1, done: false,
      })
      total = addMacros(total, candidate.macros)
      count++
    }
  }

  return entries
}

// Kiest de snack/shake die het beste past bij het resterende gat.
// Prioriteit op eiwit als daar het grootste tekort zit, anders op kcal-fit.
function pickSnack(snacks: Recipe[], kcalGap: number, proteinGap: number): Recipe | undefined {
  if (snacks.length === 0) return undefined
  const usable = snacks.filter((s) => s.macros.kcal <= kcalGap + 200)
  const pool = usable.length ? usable : snacks

  if (proteinGap > 20) {
    return [...pool].sort((a, b) => b.macros.protein - a.macros.protein)[0]
  }
  // Kies degene wiens kcal het dichtst bij het gat ligt.
  return [...pool].sort(
    (a, b) => Math.abs(a.macros.kcal - kcalGap) - Math.abs(b.macros.kcal - kcalGap),
  )[0]
}

// Dagtotaal ter info (per portie / 1 persoon).
export function planDayMacros(entries: PlanEntry[], recipeMap: Map<string, Recipe>): Macros {
  return entries.reduce((acc, e) => {
    const r = recipeMap.get(e.recipeId)
    if (!r) return acc
    if (r.proteinVariants && e.personVariant) {
      const v = r.proteinVariants.find((pv) => pv.person === e.personVariant)
      if (v) return addMacros(acc, v.macros)
    }
    return addMacros(acc, r.macros)
  }, emptyMacros())
}
