import Dexie, { type Table } from 'dexie'
import type { Recipe, PlanEntry, Profile } from '../types'
import { seedRecipes, defaultProfile } from './seed'

export interface KV {
  key: string
  value: unknown
}

export class PrepFuelDB extends Dexie {
  recipes!: Table<Recipe, string>
  planEntries!: Table<PlanEntry, string>
  profile!: Table<Profile, number>
  kv!: Table<KV, string>

  constructor() {
    super('prepfuel')
    this.version(1).stores({
      // alleen geïndexeerde velden opgeven
      recipes: 'id, category, isColdPortable',
      planEntries: 'id, date, slot, recipeId',
      profile: 'id',
      kv: 'key',
    })
  }
}

export const db = new PrepFuelDB()

// Vult de database bij de allereerste run met seed-recepten en een profiel.
export async function ensureSeeded() {
  const recipeCount = await db.recipes.count()
  if (recipeCount === 0) {
    await db.recipes.bulkAdd(seedRecipes)
  }
  const profile = await db.profile.get(1)
  if (!profile) {
    await db.profile.add(defaultProfile)
  }
}
