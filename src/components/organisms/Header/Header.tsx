import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { Avatar } from '@/components/atoms/Avatar'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'
import { Icon } from '@/components/atoms/Icon'

export function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showMenu, setShowMenu] = useState(false)
  const [showMobileNav, setShowMobileNav] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const userInitials = user?.email?.[0].toUpperCase() || 'U'

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/contacts', label: 'Contacts' },
    { path: '/deals', label: 'Deals' },
    { path: '/settings', label: 'Settings' },
  ]

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="w-full flex h-16 items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowMobileNav(!showMobileNav)}
            className="md:hidden p-2 rounded-md hover:bg-accent/50 transition-colors"
          >
            <Icon icon={showMobileNav ? X : Menu} size={20} />
          </button>
          <Link to="/dashboard" className="flex items-center space-x-2 min-w-0">
            <span className="text-xl font-semibold">CRM</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-medium transition-colors px-3 py-1.5 rounded-md ${
                isActive(link.path)
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="relative flex items-center gap-4">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-all hover:opacity-80"
          >
            <Avatar fallback={userInitials} />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-border bg-popover shadow-apple-lg p-2">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors text-left"
                >
                  <Icon icon={LogOut} size={16} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      {showMobileNav && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur">
          <nav className="flex flex-col px-6 py-4 gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setShowMobileNav(false)}
                className={`text-sm font-medium transition-colors px-3 py-2 rounded-md ${
                  isActive(link.path)
                    ? 'text-foreground bg-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
