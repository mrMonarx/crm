import { useLocation } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const pageTitles = {
  '/': 'Dashboard',
  '/customers': 'Customers',
  '/deals': 'Deals Pipeline',
  '/tasks': 'Tasks',
  '/activities': 'Activity Feed',
}

export default function Header() {
  const location = useLocation()
  const { user } = useAuth()

  const title = pageTitles[location.pathname] || 'Dashboard'

  return (
    <header style={{
      height: 'var(--header-height)',
      position: 'fixed',
      top: 0,
      left: 'var(--sidebar-width)',
      right: 0,
      background: 'rgba(10, 10, 15, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      zIndex: 90,
    }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>
          {title}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn-icon" title="Notifications">
          <Bell size={16} />
        </button>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 10,
          padding: '6px 12px',
        }}>
          <div className="avatar avatar-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
