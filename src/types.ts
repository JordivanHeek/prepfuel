export type Category = 'ontbijt' | 'lunch-koud' | 'avond' | 'shake' | 'snack'
export type Slot = 'ontbijt' | 'lunch' | 'avond' | 'snack'
export type Person = 'Jordi' | 'Frederiek'

// Schappen voor de boodschappenlijst (volgorde = weergavevolgorde)
export type Aisle =
  | 'Groente & Fruit'
  | 'Vlees & Kip'
  | 'Vis'
  | 'Zuivel & Eieren'
  | 'Brood & Bakkerij'
  | 'Pasta/Rijst/Droogwaren'
  | 'Sauzen & Kruiden'
  | 'Diepvries'
  | 'Overig'

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface Ingredient {
  name: string
  qty: number
  unit: string
  aisle: Aisle
}

export interface ProteinVariant {
  person: Person
  label: string
  extraIngredients: Ingredient[]
  macros: Macros
}

export interface Recipe {
  id: string
  name: string
  category: Category
  emoji: string
  image?: string
  servings: number
  prepTimeMin: number
  fridgeDays: number
  isColdPortable: boolean
  tags: string[]
  macros: Macros // per portie (Jordi's variant bij avondgerechten)
  ingredients: Ingredient[]
  steps: string[]
  proteinVariants?: ProteinVariant[] // alleen bij category 'avond'
  sourceUrl?: string // link naar het originele recept online
  sourceName?: string // bron (bijv. 'FuelYourBody')
}

export interface PlanEntry {
  id: string
  date: string // YYYY-MM-DD
  slot: Slot
  recipeId: string
  personVariant: Person | null
  servings: number // aantal porties/personen (voor boodschappen-schaling)
  done: boolean
}

export interface Profile {
  id: number // altijd 1 (single row)
  weight: number
  goalWeight: number
  targets: Macros
  officeDays: number[] // weekdagnummers 1=ma ... 7=zo (ISO)
  creatineEnabled: boolean
  creatineDoneDates: string[]
  darkMode: boolean
  supermarket: 'Lidl' | 'AH' | 'Hoogvliet'
}
