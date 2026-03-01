import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { BlueprintPage } from './pages/BlueprintPage'
import { BattlePage } from './pages/BattlePage'
import { ResultsPage } from './pages/ResultsPage'

function NavLink({ to, label }: { to: string; label: string }) {
  const location = useLocation()
  const active = location.pathname === to
  return (
    <Link
      to={to}
      className={`text-sm transition-colors ${active ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'}`}
    >
      {label}
    </Link>
  )
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-white hover:text-gray-200 transition-colors">
          Eclipse Combat Forecast II
        </Link>
        <nav className="flex gap-4">
          <NavLink to="/" label="Blueprints" />
          <NavLink to="/battle" label="Battle" />
          <NavLink to="/results" label="Results" />
        </nav>
      </header>
      {children}
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout><BlueprintPage /></Layout>} />
      <Route path="/battle" element={<Layout><BattlePage /></Layout>} />
      <Route path="/results" element={<Layout><ResultsPage /></Layout>} />
    </Routes>
  )
}

export default App
