import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import Products from './pages/Products'
import Deals from './pages/Deals'
import Tasks from './pages/Tasks'
import Activities from './pages/Activities'

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div className="spinner" />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

const AppLayout = ({ children }) => (
  <div className="app-layout">
    <Sidebar />
    <div className="main-content">
      <Header />
      <div className="page-content">{children}</div>
    </div>
  </div>
)

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <PrivateRoute>
          <AppLayout><Dashboard /></AppLayout>
        </PrivateRoute>
      } />
      <Route path="/customers" element={
        <PrivateRoute>
          <AppLayout><Customers /></AppLayout>
        </PrivateRoute>
      } />
      <Route path="/customers/:id" element={
        <PrivateRoute>
          <AppLayout><CustomerDetail /></AppLayout>
        </PrivateRoute>
      } />
      <Route path="/products" element={
        <PrivateRoute>
          <AppLayout><Products /></AppLayout>
        </PrivateRoute>
      } />
      <Route path="/deals" element={
        <PrivateRoute>
          <AppLayout><Deals /></AppLayout>
        </PrivateRoute>
      } />
      <Route path="/tasks" element={
        <PrivateRoute>
          <AppLayout><Tasks /></AppLayout>
        </PrivateRoute>
      } />
      <Route path="/activities" element={
        <PrivateRoute>
          <AppLayout><Activities /></AppLayout>
        </PrivateRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
