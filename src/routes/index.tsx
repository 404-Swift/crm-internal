import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Dashboard from '@/components/pages/Dashboard'
import Contacts from '@/components/pages/Contacts'
import ContactDetail from '@/components/pages/ContactDetail'
import Deals from '@/components/pages/Deals'
import DealDetail from '@/components/pages/DealDetail'
import Settings from '@/components/pages/Settings'
import ConflictResolution from '@/components/pages/ConflictResolution/ConflictResolution'
import Login from '@/components/pages/Login'
import Signup from '@/components/pages/Signup'
import GoogleOAuthCallback from '@/components/pages/GoogleOAuthCallback'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: '/signup',
    element: (
      <PublicRoute>
        <Signup />
      </PublicRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/contacts',
    element: (
      <ProtectedRoute>
        <Contacts />
      </ProtectedRoute>
    ),
  },
  {
    path: '/contacts/:id',
    element: (
      <ProtectedRoute>
        <ContactDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: '/deals',
    element: (
      <ProtectedRoute>
        <Deals />
      </ProtectedRoute>
    ),
  },
  {
    path: '/deals/:id',
    element: (
      <ProtectedRoute>
        <DealDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    ),
  },
  {
    path: '/conflicts',
    element: (
      <ProtectedRoute>
        <ConflictResolution />
      </ProtectedRoute>
    ),
  },
  {
    path: '/auth/google/callback',
    element: <GoogleOAuthCallback />,
  },
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
