# 🥗 PrepFuel — Meal Prep & Macro-tracker

Een **mobile-first Progressive Web App (PWA)** voor meal prep en macro-tracking tijdens een lean bulk. Draait volledig **lokaal op je telefoon** — geen backend, geen login, geen internet nodig na installatie. Alle data blijft bewaard tussen sessies via **IndexedDB**.

Gebouwd voor Jordi (82 kg, lean bulk richting 87,5–90 kg): eet geen vis, partner Frederiek eet mee en lust wél vis (elk avondgerecht heeft een **vis-swap variant**), 2 kantoordagen per week met **koude, meeneembare lunch**, weekend flexibel.

---

## ✨ Functies

- **Vandaag** — dagdashboard met 4 macro-ringen (kcal / eiwit / koolhydraten / vet) die live vullen op basis van afgevinkte maaltijden, plus een afvinkbare **creatine-reminder** en snel loggen van snacks/shakes.
- **Weekplanner** — grid ma–vr met slots ontbijt/lunch/avond/snack, **kantoordagen** waar alleen koude lunches mogen, **vis-swap** per avondgerecht (Jordi ↔ Frederiek) en een mini-dagtotaal van de macro's.
- **Recepten** — bibliotheek met ~19 recepten, filters (categorie, koud & meeneembaar, eiwitrijk, zoeken), detailpagina met ingrediënten, stappen en variant-switch.
- **Boodschappen** — genereert één samengevoegde lijst (hoeveelheden worden opgeteld), **gegroepeerd per schap**, afvinkbaar met behoud van staat, plus kopieer/deel/print.
- **Profiel** — gewicht, streefgewicht, de 4 macro-doelen, kantoordagen, supermarkt-label, creatine- en dark-mode-toggle.

Alle macro's zijn **richtwaarden** en per recept bewerkbaar (aanpasbaar in de seed-data).

---

## 🛠 Tech stack

- React + Vite + TypeScript
- TailwindCSS
- React Router (hash-based, i.v.m. GitHub Pages)
- Dexie.js (IndexedDB wrapper) — lokale persistentie
- vite-plugin-pwa — manifest, service worker, offline & installeerbaar

---

## 🚀 Lokaal draaien

Vereist **Node.js 20+**.

```bash
npm install
npm run dev
```

De dev-server draait op `http://localhost:5173/prepfuel/`.

> Let op: door de `base`-instelling (`/prepfuel/`) opent de app op het pad `/prepfuel/`, niet op `/`.

### Build & preview

```bash
npm run build      # type-check + productie-build naar dist/
npm run preview    # lokaal de gebouwde versie bekijken
```

### App-iconen opnieuw genereren (optioneel)

```bash
node scripts/gen-icons.mjs
```

Genereert `public/pwa-192x192.png`, `public/pwa-512x512.png` en `public/apple-touch-icon.png`.

---

## 📦 Deployen naar GitHub Pages

De repo bevat een kant-en-klare GitHub Actions workflow (`.github/workflows/deploy.yml`) die bij elke push naar `main` bouwt en publiceert.

1. **Maak een GitHub-repo** met exact de naam waarnaar `base` verwijst. Standaard is dat **`prepfuel`**.
   - Wijk je af van die naam? Pas dan `REPO_NAME` bovenaan `vite.config.ts` aan.

2. **Push de code:**

   ```bash
   git init
   git add .
   git commit -m "PrepFuel PWA"
   git branch -M main
   git remote add origin https://github.com/<jouw-gebruikersnaam>/prepfuel.git
   git push -u origin main
   ```

3. **Zet GitHub Pages op "GitHub Actions":**
   Repo → **Settings** → **Pages** → *Build and deployment* → **Source: GitHub Actions**.

4. Na de eerste geslaagde workflow-run staat de app op:

   ```
   https://<jouw-gebruikersnaam>.github.io/prepfuel/
   ```

---

## 📲 Installeren op je telefoon

1. Open de gepubliceerde URL in **Chrome** (Android) of **Safari** (iOS).
2. **Android:** menu → *App installeren* / *Toevoegen aan startscherm*.
   **iOS:** deel-knop → *Zet op beginscherm*.
3. De app opent nu fullscreen, werkt **offline** en onthoudt al je data.

---

## 🗂 Projectstructuur

```
prepfuel/
├─ .github/workflows/deploy.yml   # GitHub Pages deploy
├─ scripts/gen-icons.mjs          # PNG-iconen genereren
├─ public/                        # favicon + PWA-iconen
├─ src/
│  ├─ db/
│  │  ├─ db.ts                    # Dexie schema + seed-import bij 1e run
│  │  └─ seed.ts                  # 19 seed-recepten + standaardprofiel
│  ├─ lib/                        # datum-, macro- & planhelpers
│  ├─ components/                 # BottomNav, MacroRings, RecipeCard, RecipePicker …
│  ├─ pages/                      # Today, Week, Recipes, RecipeDetail, Shopping, Profile
│  ├─ types.ts                    # datamodel (Recipe, PlanEntry, Profile …)
│  ├─ App.tsx                     # routes + dark mode
│  └─ main.tsx                    # entry + seeding
├─ vite.config.ts                 # base + PWA-manifest
└─ tailwind.config.js
```

---

## 🔄 Data resetten

Alle data staat in IndexedDB (database `prepfuel`) in je browser. Wissen kan via de browserinstellingen (site-data verwijderen) of de DevTools → Application → IndexedDB. Bij de volgende start worden de seed-recepten opnieuw ingeladen.

---

## 📝 Macro-doelen (standaard)

| Macro | Dagdoel |
|---|---|
| Calorieën | 2.900 kcal |
| Eiwit | 165 g |
| Koolhydraten | 380 g |
| Vet | 80 g |

Aanpasbaar in **Profiel**. Creatine: 3–5 g monohydraat per dag (afvinkbaar op het dashboard).

*Disclaimer: macro's en recepten zijn richtwaarden, geen medisch of voedingskundig advies.*
