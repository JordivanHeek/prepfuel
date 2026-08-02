import { Routes, Route, Navigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { db } from './db/db'
import BottomNav from './components/BottomNav'
import Today from './pages/Today'
import Week from './pages/Week'
import Recipes from './pages/Recipes'
import RecipeDetail from './pages/RecipeDetail'
import Shopping from './pages/Shopping'
import Profile from './pages/Profile'

export default function App() {
  const profile = useLiveQuery(() => db.profile.get(1), [])

  // Dark mode toepassen op <html>
  useEffect(() => {
    const root = document.documentElement
    if (profile?.darkMode) root.classList.add('dark')
    else root.classList.remove('dark')
  }, [profile?.darkMode])

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <main className="flex-1 px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/week" element={<Week />} />
          <Route path="/recepten" element={<Recipes />} />
          <Route path="/recept/:id" element={<RecipeDetail />} />
          <Route path="/boodschappen" element={<Shopping />} />
          <Route path="/profiel" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
