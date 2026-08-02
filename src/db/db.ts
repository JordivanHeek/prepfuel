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
  // Ruim recepten op die niet meer in de seed staan (bijv. hernoemde id's),
  // zodat de bibliotheek schoon blijft. Er is geen eigen-recept-functie,
  // dus alle recepten komen uit de seed.
  const seedIds = new Set(seedRecipes.map((r) => r.id))
  const stale = (await db.recipes.toArray()).filter((r) => !seedIds.has(r.id)).map((r) => r.id)
  if (stale.length) await db.recipes.bulkDelete(stale)

  const profile = await db.profile.get(1)
  if (!profile) {
    await db.profile.add(defaultProfile)
  } else {
    // Vul nieuwe velden aan voor bestaande installaties.
    const patch: Partial<typeof defaultProfile> = {}
    if (profile.cookDays === undefined) patch.cookDays = defaultProfile.cookDays
    if (profile.sharedSlots === undefined) patch.sharedSlots = defaultProfile.sharedSlots
    if (profile.partnerName === undefined) patch.partnerName = defaultProfile.partnerName
    if (Object.keys(patch).length) await db.profile.update(1, patch)
  }
}
