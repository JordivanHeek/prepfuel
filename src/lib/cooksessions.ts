import type { Slot } from '../types'
import { weekdayFull, isoWeekday } from './util'

// Tijd-as binnen de werkweek. Zondag-prep telt als "voor maandag" (0).
// Een prep op weekdag c (bijv. donderdag=4) gebeurt 's AVONDS -> c + 0.5.
function sessionTime(cookDay: number): number {
  return cookDay === 7 ? 0 : cookDay + 0.5
}

// Tijdstip van een maaltijd: avondeten 's avonds (d+0.5), rest overdag (d).
function mealTime(weekday: number, slot: Slot): number {
  return slot === 'avond' ? weekday + 0.5 : weekday
}

// Welke kook-/prep-sessie bereidt deze maaltijd voor? Geeft de kookdag terug
// (bijv. 7 = zondag) waarvan de sessie het laatst vóór de maaltijd valt.
export function sessionForMeal(weekday: number, slot: Slot, cookDays: number[]): number {
  const sorted = [...cookDays].map((c) => ({ c, t: sessionTime(c) })).sort((a, b) => a.t - b.t)
  const mt = mealTime(weekday, slot)
  let chosen = sorted[0]?.c ?? 7
  for (const s of sorted) if (s.t <= mt) chosen = s.c
  return chosen
}

export function sessionForDateStr(date: string, slot: Slot, cookDays: number[]): number {
  const wd = isoWeekday(new Date(date + 'T12:00:00'))
  return sessionForMeal(wd, slot, cookDays)
}

const CAP = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Label voor een prep-sessie, bijv. "Zondag voorbereiden".
export function cookSessionLabel(cookDay: number): string {
  return `${CAP(weekdayFull(cookDay))} voorbereiden`
}

// Volgorde van sessies zoals ze in de week vallen.
export function orderedCookDays(cookDays: number[]): number[] {
  return [...cookDays].sort((a, b) => sessionTime(a) - sessionTime(b))
}
