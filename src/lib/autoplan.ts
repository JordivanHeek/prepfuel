import type { Recipe, PlanEntry, Macros, Slot, Person } from '../types'
import { emptyMacros, addMacros, toISODate, isoWeekday, uid } from './util'
import { sessionForMeal, orderedCookDays } from './cooksessions'

export interface PlanOptions {
  targets: Macros
  cookDays: number[]
  sharedSlots: Slot[]
  officeDays: number[]
  dinnerVariety?: number // aantal verschillende avondgerechten (default 3)
}

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5)

// Cook-session model: kies weinig gerechten en verdeel ze in blokken die
// door één prep-sessie (bijv. zondag of donderdag) worden voorbereid.
// Ontbijt/avond kunnen gedeeld zijn met de partner (2 porties); lunch/snack
// zijn voor Jordi alleen. Bij gedeeld avondeten wisselt per gerecht of de
// partner de vis-variant of hetzelfde eet.
export function generateWeekPlan(days: Date[], recipes: Recipe[], opts: PlanOptions): PlanEntry[] {
  const { targets, cookDays, sharedSlots } = opts
  const byCat = (c: Recipe['category']) => recipes.filter((r) => r.category === c)
  const breakfasts = byCat('ontbijt')
  const lunches = byCat('lunch-koud')
  const dinners = byCat('avond')
  const snacks = [...byCat('snack'), ...byCat('shake')].filter(
    (r) => r.id !== 'mass-gainer-shake' && !r.tags.includes('bakken'),
  )
  if (breakfasts.length === 0 || lunches.length === 0 || dinners.length === 0) return []

  const sharedBreakfast = sharedSlots.includes('ontbijt')
  const sharedDinner = sharedSlots.includes('avond')

  const weekdays = days.map((d, i) => ({ i, date: toISODate(d), wd: isoWeekday(d) }))

  // Groepeer dag-indexen per prep-sessie voor een bepaald slot.
  const groupBySession = (slot: Slot) => {
    const order = orderedCookDays(cookDays)
    return order
      .map((cookDay) => ({
        cookDay,
        dayIdxs: weekdays.filter((w) => sessionForMeal(w.wd, slot, cookDays) === cookDay).map((w) => w.i),
      }))
      .filter((g) => g.dayIdxs.length > 0)
  }

  // Wissel de gekozen recepten om-en-om af over de dagen (ma A, di B, wo A…),
  // zodat je niet meerdere dagen op rij hetzelfde eet — terwijl je nog steeds
  // in één sessie kookt.
  const interleave = (dayIdxs: number[], chosen: Recipe[], out: (Recipe | undefined)[]) => {
    if (chosen.length === 0) return
    dayIdxs.forEach((di, k) => { out[di] = chosen[k % chosen.length] })
  }

  const bfAssign: (Recipe | undefined)[] = []
  const lunchAssign: (Recipe | undefined)[] = []
  const dinnerAssign: (Recipe | undefined)[] = []

  // ── Ontbijt: tot 2 recepten per sessie, afgewisseld ──────────────
  {
    const pool = shuffle(breakfasts)
    let ptr = 0
    for (const g of groupBySession('ontbijt')) {
      const n = Math.min(2, g.dayIdxs.length, pool.length)
      const chosen: Recipe[] = []
      for (let k = 0; k < n; k++) { chosen.push(pool[ptr % pool.length]); ptr++ }
      interleave(g.dayIdxs, chosen, bfAssign)
    }
  }

  // ── Lunch: tot 2 recepten per sessie, afgewisseld ────────────────
  {
    const pool = shuffle(lunches)
    let ptr = 0
    for (const g of groupBySession('lunch')) {
      const n = Math.min(2, g.dayIdxs.length, pool.length)
      const chosen: Recipe[] = []
      for (let k = 0; k < n; k++) { chosen.push(pool[ptr % pool.length]); ptr++ }
      interleave(g.dayIdxs, chosen, lunchAssign)
    }
  }

  // ── Avond: in totaal `dinnerVariety` verschillende gerechten ─────
  const dinnerPartnerVar = new Map<string, Person | null>()
  {
    const nDinners = Math.min(opts.dinnerVariety ?? 3, dinners.length)
    const chosenDinners = shuffle(dinners).slice(0, nDinners)

    // Partner-variant per gerecht: wisselt vis / hetzelfde.
    let visToggle = true
    for (const dn of chosenDinners) {
      if (sharedDinner && dn.proteinVariants) {
        dinnerPartnerVar.set(dn.id, visToggle ? 'Frederiek' : 'Jordi')
        visToggle = !visToggle
      } else {
        dinnerPartnerVar.set(dn.id, null)
      }
    }

    const groups = groupBySession('avond')
    const counts = distributeCounts(nDinners, groups.map((g) => g.dayIdxs.length))
    let offset = 0
    groups.forEach((g, gi) => {
      const slice = chosenDinners.slice(offset, offset + counts[gi])
      offset += counts[gi]
      const use = slice.length ? slice : [chosenDinners[gi % chosenDinners.length]]
      interleave(g.dayIdxs, use, dinnerAssign)
    })
  }

  // ── Bouw entries per dag + vul aan met snacks (solo) ─────────────
  const snackSet = shuffle(snacks).slice(0, Math.min(4, snacks.length))
  const entries: PlanEntry[] = []

  weekdays.forEach(({ i, date }) => {
    const breakfast = bfAssign[i]
    const lunch = lunchAssign[i]
    const dinner = dinnerAssign[i]

    if (breakfast) {
      entries.push({
        id: uid(), date, slot: 'ontbijt', recipeId: breakfast.id,
        personVariant: null, servings: 1,
        partnerServings: sharedBreakfast ? 1 : 0, partnerVariant: null, done: false,
      })
    }
    if (lunch) {
      entries.push({
        id: uid(), date, slot: 'lunch', recipeId: lunch.id,
        personVariant: null, servings: 1, partnerServings: 0, partnerVariant: null, done: false,
      })
    }
    if (dinner) {
      entries.push({
        id: uid(), date, slot: 'avond', recipeId: dinner.id,
        personVariant: dinner.proteinVariants ? 'Jordi' : null, servings: 1,
        partnerServings: sharedDinner ? 1 : 0,
        partnerVariant: dinnerPartnerVar.get(dinner.id) ?? null, done: false,
      })
    }

    // Dagtotaal (Jordi's porties) en snacks aanvullen richting doel.
    let total = emptyMacros()
    if (breakfast) total = addMacros(total, breakfast.macros)
    if (lunch) total = addMacros(total, lunch.macros)
    if (dinner) total = addMacros(total, dinner.macros) // = Jordi-variant

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
        personVariant: null, servings: 1, partnerServings: 0, partnerVariant: null, done: false,
      })
      total = addMacros(total, candidate.macros)
      if (candidate.category === 'shake') shakeCount++
      count++
    }
  })

  return entries
}

// Verdeelt `total` over buckets naar rato van hun gewicht (grootste-rest).
function distributeCounts(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1
  const raw = weights.map((w) => (w / sum) * total)
  const base = raw.map((r) => Math.floor(r))
  let rem = total - base.reduce((a, b) => a + b, 0)
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac)
  for (const o of order) {
    if (rem <= 0) break
    base[o.i]++
    rem--
  }
  return base
}

function pickSnack(snacks: Recipe[], kcalGap: number, proteinGap: number): Recipe | undefined {
  if (snacks.length === 0) return undefined
  const usable = snacks.filter((s) => s.macros.kcal <= kcalGap + 200)
  const pool = usable.length ? usable : snacks
  if (proteinGap > 20) return [...pool].sort((a, b) => b.macros.protein - a.macros.protein)[0]
  return [...pool].sort(
    (a, b) => Math.abs(a.macros.kcal - kcalGap) - Math.abs(b.macros.kcal - kcalGap),
  )[0]
}

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
