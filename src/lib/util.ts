import type { Macros, Slot, Aisle } from '../types'

export const SLOTS: Slot[] = ['ontbijt', 'lunch', 'avond', 'snack']

export const SLOT_LABEL: Record<Slot, string> = {
  ontbijt: 'Ontbijt',
  lunch: 'Lunch',
  avond: 'Avond',
  snack: 'Snack',
}

// Welke receptcategorieën passen bij welk slot
export const SLOT_CATEGORIES: Record<Slot, string[]> = {
  ontbijt: ['ontbijt', 'shake'],
  lunch: ['lunch-koud', 'shake', 'snack'],
  avond: ['avond'],
  snack: ['snack', 'shake'],
}

export const AISLE_ORDER: Aisle[] = [
  'Groente & Fruit',
  'Vlees & Kip',
  'Vis',
  'Zuivel & Eieren',
  'Brood & Bakkerij',
  'Pasta/Rijst/Droogwaren',
  'Sauzen & Kruiden',
  'Diepvries',
  'Overig',
]

export const emptyMacros = (): Macros => ({ kcal: 0, protein: 0, carbs: 0, fat: 0 })

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ── Datums (lokaal, geen tijdzone-verrassingen) ────────────────────
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

// ISO weekdag: 1 = maandag ... 7 = zondag
export function isoWeekday(d: Date): number {
  const wd = d.getDay() // 0=zo ... 6=za
  return wd === 0 ? 7 : wd
}

export function isWeekend(d: Date): boolean {
  const wd = isoWeekday(d)
  return wd === 6 || wd === 7
}

const WEEKDAY_LABELS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
export function weekdayLabel(isoWd: number): string {
  return WEEKDAY_LABELS[isoWd - 1]
}

const WEEKDAY_FULL = [
  'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag',
]
export function weekdayFull(isoWd: number): string {
  return WEEKDAY_FULL[isoWd - 1]
}

// Maandag van de week waarin `d` valt
export function startOfWeek(d: Date): Date {
  const copy = new Date(d)
  const diff = isoWeekday(copy) - 1
  copy.setDate(copy.getDate() - diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

// De 5 werkdagen (ma–vr) van de week van `d`
export function weekdaysOf(d: Date): Date[] {
  const monday = startOfWeek(d)
  return Array.from({ length: 5 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return day
  })
}

export function formatDateNL(d: Date): string {
  return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Goedenacht'
  if (h < 12) return 'Goedemorgen'
  if (h < 18) return 'Goedemiddag'
  return 'Goedenavond'
}
