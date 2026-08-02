import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Vandaag', icon: '🏠', end: true },
  { to: '/week', label: 'Week', icon: '📅', end: false },
  { to: '/recepten', label: 'Recepten', icon: '📖', end: false },
  { to: '/boodschappen', label: 'Boodschappen', icon: '🛒', end: false },
  { to: '/profiel', label: 'Profiel', icon: '⚙️', end: false },
]

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 safe-bottom">
      <ul className="flex">
        {items.map((it) => (
          <li key={it.to} className="flex-1">
            <NavLink
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium tap ${
                  isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'
                }`
              }
            >
              <span className="text-xl leading-none">{it.icon}</span>
              <span>{it.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
