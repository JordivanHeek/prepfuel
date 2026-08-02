import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import MacroBadges from '../components/MacroBadges'
import type { Person, Slot, Category } from '../types'
import { ingredientsForVariant, scaleMacros, scaleIngredients } from '../lib/plan'
import { todayISO, uid } from '../lib/util'

const SLOT_FOR_CATEGORY: Record<Category, Slot> = {
  ontbijt: 'ontbijt',
  'lunch-koud': 'lunch',
  avond: 'avond',
  shake: 'snack',
  snack: 'snack',
}

type LooseItem = { recipeId: string; person: Person | null; servings?: number }

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const recipe = useLiveQuery(() => (id ? db.recipes.get(id) : undefined), [id])
  const [person, setPerson] = useState<Person>('Jordi')
  const [servings, setServings] = useState(1)
  const [toast, setToast] = useState<string | null>(null)

  // Reset variant + porties wanneer je naar een ander recept navigeert
  // (React Router hergebruikt dit component, dus state blijft anders hangen).
  useEffect(() => {
    setPerson('Jordi')
    setServings(1)
  }, [id])

  if (recipe === undefined) return <p className="py-10 text-center text-slate-400">Laden…</p>
  if (recipe === null) return <p className="py-10 text-center text-slate-400">Recept niet gevonden.</p>

  const hasVariants = !!recipe.proteinVariants
  const activeVariant = hasVariants
    ? recipe.proteinVariants!.find((v) => v.person === person)
    : undefined
  const baseMacros = activeVariant?.macros ?? recipe.macros
  const macros = scaleMacros(baseMacros, servings)
  const ingredients = scaleIngredients(
    ingredientsForVariant(recipe, hasVariants ? person : null),
    servings,
  )

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 1800)
  }

  async function addToToday() {
    if (!recipe) return
    await db.planEntries.add({
      id: uid(),
      date: todayISO(),
      slot: SLOT_FOR_CATEGORY[recipe.category],
      recipeId: recipe.id,
      personVariant: hasVariants ? person : null,
      servings,
      done: false,
    })
    flash('Toegevoegd aan vandaag ✓')
  }

  async function addToShopping() {
    if (!recipe) return
    const row = await db.kv.get('shoppingLoose')
    const list = (row?.value as LooseItem[] | undefined) ?? []
    list.push({ recipeId: recipe.id, person: hasVariants ? person : null, servings })
    await db.kv.put({ key: 'shoppingLoose', value: list })
    flash('Toegevoegd aan boodschappen 🛒')
  }

  return (
    <div className="space-y-4 pb-4">
      <button onClick={() => navigate(-1)} className="text-sm text-slate-400 tap">← Terug</button>

      {/* Header */}
      <div className="card overflow-hidden">
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-brand-50 to-emerald-100 text-7xl dark:from-slate-800 dark:to-slate-900">
          {recipe.emoji}
        </div>
        <div className="p-4">
          <h1 className="text-xl font-bold">{recipe.name}</h1>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span>⏱ {recipe.prepTimeMin} min</span>
            <span>🗓 {recipe.fridgeDays} dg houdbaar</span>
            {recipe.isColdPortable && <span>❄️ koud & meeneembaar</span>}
          </div>
        </div>
      </div>

      {/* Variant-switch */}
      {hasVariants && (
        <div className="card p-3">
          <p className="mb-2 text-sm font-semibold">Variant</p>
          <div className="grid grid-cols-2 gap-2">
            {recipe.proteinVariants!.map((v) => (
              <button
                key={v.person}
                onClick={() => setPerson(v.person)}
                className={`rounded-xl border-2 px-3 py-2 text-left tap ${
                  person === v.person
                    ? 'border-brand-500 bg-brand-50 dark:bg-slate-800'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <span className="block text-sm font-semibold">
                  {v.person}{v.person === 'Frederiek' ? ' 🐟' : ''}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{v.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Porties / personen */}
      <div className="card flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-semibold">Porties / personen</p>
          <p className="text-xs text-slate-400">Schaalt ingrediënten & boodschappen</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setServings((s) => Math.max(1, s - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg font-bold tap dark:bg-slate-800"
            aria-label="minder porties"
          >
            −
          </button>
          <span className="w-6 text-center text-lg font-bold">{servings}</span>
          <button
            onClick={() => setServings((s) => s + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-white tap"
            aria-label="meer porties"
          >
            +
          </button>
        </div>
      </div>

      {/* Macro's */}
      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold">
          Macro's {servings > 1 ? `(${servings} porties samen)` : 'per portie'}
        </p>
        <MacroBadges m={macros} />
        <p className="mt-2 text-[11px] text-slate-400">Richtwaarden — bewerkbaar per recept.</p>
      </div>

      {/* Ingrediënten */}
      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold">Ingrediënten</p>
        <ul className="space-y-1.5">
          {ingredients.map((ing, i) => (
            <li key={i} className="flex justify-between text-sm">
              <span>{ing.name}</span>
              <span className="text-slate-400">
                {ing.qty} {ing.unit}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Stappen */}
      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold">Bereiding</p>
        <ol className="space-y-2">
          {recipe.steps.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Bron / originele recept */}
      {recipe.sourceUrl && (
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="card flex items-center justify-between p-4 tap"
        >
          <span>
            <span className="block text-sm font-semibold">🔗 Bekijk het originele recept</span>
            <span className="text-xs text-slate-400">Bron: {recipe.sourceName ?? 'online'}</span>
          </span>
          <span className="text-slate-300">↗</span>
        </a>
      )}

      {/* Acties */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={addToToday} className="btn-primary">+ Vandaag</button>
        <button onClick={addToShopping} className="btn-ghost">+ Boodschappen</button>
      </div>
      <Link to="/week" className="btn-ghost w-full">Inplannen in de week →</Link>

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-white dark:text-slate-900">
          {toast}
        </div>
      )}
    </div>
  )
}
