import type { Recipe, PlanEntry, Macros, Ingredient, Person } from '../types'
import { emptyMacros, addMacros } from './util'

// Macro's van één geplande maaltijd, rekening houdend met de gekozen
// persoonsvariant bij avondgerechten.
export function macrosForEntry(entry: PlanEntry, recipe: Recipe | undefined): Macros {
  if (!recipe) return emptyMacros()
  if (recipe.proteinVariants && entry.personVariant) {
    const v = recipe.proteinVariants.find((pv) => pv.person === entry.personVariant)
    if (v) return v.macros
  }
  return recipe.macros
}

// Volledige ingrediëntenlijst voor een recept + gekozen variant.
export function ingredientsForVariant(recipe: Recipe, person: Person | null): Ingredient[] {
  const base = [...recipe.ingredients]
  if (recipe.proteinVariants) {
    const v = recipe.proteinVariants.find((pv) => pv.person === (person ?? 'Jordi'))
    if (v) base.push(...v.extraIngredients)
  }
  return base
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce((acc, m) => addMacros(acc, m), emptyMacros())
}

export function scaleMacros(m: Macros, n: number): Macros {
  return { kcal: m.kcal * n, protein: m.protein * n, carbs: m.carbs * n, fat: m.fat * n }
}

export function scaleIngredients(list: Ingredient[], n: number): Ingredient[] {
  return list.map((i) => ({ ...i, qty: i.qty * n }))
}
