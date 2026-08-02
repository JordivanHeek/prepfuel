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
  // Aanvul-pool: snacks + shakes, maar nooit de mass gainer, en geen
  // bak-batches (tag 'bakken') — die plan je liever bewust met Fre.
  const snacks = [...byCat('snack'), ...byCat('shake')].filter(
    (r) => r.id !== 'mass-gainer-shake' && !r.tags.includes('bakken'),
  )

  if (breakfasts.length === 0 || lunches.length === 0 || dinners.length === 0) return []

  const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5)
  const byFridgeDesc = (a: Recipe, b: Recipe) => b.fridgeDays - a.fridgeDays

  // Meal-prep aanpak: kies weinig gerechten en verdeel ze in blokken over
  // de week (één keer koken, meerdere dagen eten). Gerechten die langer
  // houdbaar zijn krijgen het grootste blok (de eerste dagen).
  // Zit er een kantoordag in deze week? Dan alleen koude, meeneembare lunches.
  const anyOffice = days.some((d) => officeDays.includes(isoWeekday(d)))
  const lunchPool = anyOffice ? lunches.filter((r) => r.isColdPortable) : lunches
  const usableLunches = lunchPool.length ? lunchPool : lunches

  const breakfastChoices = shuffle(breakfasts).slice(0, Math.min(2, breakfasts.length)).sort(byFridgeDesc)
  const lunchChoices = shuffle(usableLunches).slice(0, Math.min(2, usableLunches.length)).sort(byFridgeDesc)
  const dinnerChoices = shuffle(dinners).slice(0, Math.min(3, dinners.length)).sort(byFridgeDesc)
  const snackSet = shuffle(snacks).slice(0, Math.min(4, snacks.length))

  const bBlocks = blockIndexForDays(days.length, breakfastChoices.length)
  const lBlocks = blockIndexForDays(days.length, lunchChoices.length)
  const dBlocks = blockIndexForDays(days.length, dinnerChoices.length)

  const dinnerMacros = (r: Recipe): Macros => r.macros // = Jordi-variant
  const entries: PlanEntry[] = []

  days.forEach((day, i) => {
    const date = toISODate(day)

    const breakfast = breakfastChoices[bBlocks[i]]
    const lunch = lunchChoices[lBlocks[i]]
    const dinner = dinnerChoices[dBlocks[i]]

    const add = (slot: Slot, recipe: Recipe, isDinner = false) => {
      entries.push({
        id: uid(), date, slot, recipeId: recipe.id,
        personVariant: isDinner && recipe.proteinVariants ? 'Jordi' : null,
        servings: 1, done: false,
      })
    }

    add('ontbijt', breakfast)
    add('lunch', lunch)
    add('avond', dinner, true)

    let total = addMacros(addMacros(breakfast.macros, lunch.macros), dinnerMacros(dinner))

    // Vul aan met snacks tot ~dagdoel (max 4 items, hoogstens 1 shake).
    let count = 0
    let shakeCount = 0
    while (count < 4) {
      const kcalGap = targets.kcal - total.kcal
      const proteinGap = targets.protein - total.protein
      if (kcalGap < 220 && proteinGap < 15) break

      const pool = shakeCount >= 1 ? snackSet.filter((s) => s.category !== 'shake') : snackSet
      const candidate = pickSnack(pool, kcalGap, proteinGap)
      if (!candidate) break

      entries.push({
        id: uid(), date, slot: 'snack', recipeId: candidate.id,
        personVariant: null, servings: 1, done: false,
      })
      total = addMacros(total, candidate.macros)
      if (candidate.category === 'shake') shakeCount++
      count++
    }
  })

  return entries
}

// Verdeelt `nDays` dagen over `nParts` gerechten in aaneengesloten blokken,
// grootste blok eerst. Bijv. 5 dagen / 2 gerechten -> [0,0,0,1,1].
function blockIndexForDays(nDays: number, nParts: number): number[] {
  if (nParts <= 1) return Array(nDays).fill(0)
  const base = Math.floor(nDays / nParts)
  const rem = nDays % nParts
  const res: number[] = []
  for (let p = 0; p < nParts; p++) {
    const size = base + (p < rem ? 1 : 0)
    for (let k = 0; k < size; k++) res.push(p)
  }
  return res
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
