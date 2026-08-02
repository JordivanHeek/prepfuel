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

// Vult de database bij de eerste run, en houdt de receptenbibliotheek
// gesynchroniseerd met de seed (nieuwe recepten verschijnen ook voor
// bestaande installaties). Recept-bewerken bestaat nog niet, dus overschrijven
// is veilig.
export async function ensureSeeded() {
  await db.recipes.bulkPut(seedRecipes)
  const profile = await db.profile.get(1)
  if (!profile) {
    await db.profile.add(defaultProfile)
  }
}
