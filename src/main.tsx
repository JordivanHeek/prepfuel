import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { ensureSeeded } from './db/db'

// Vul de database bij de eerste run met de seed-recepten.
ensureSeeded().catch((e) => console.error('Seeden mislukt:', e))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
