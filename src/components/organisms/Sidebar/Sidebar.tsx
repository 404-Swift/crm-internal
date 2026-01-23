import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, TrendingUp, Calendar, UserCheck, Settings } from 'lucide-react'
import { Icon } from '@/components/atoms/Icon'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/contacts', label: 'Contacts', icon: Users },
  { path: '/deals', label: 'Deals', icon: TrendingUp },
  { path: '/bookings', label: 'Bookings', icon: Calendar },
  { path: '/team-members', label: 'Team Members', icon: UserCheck },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:pt-16">
      <div className="flex-1 flex flex-col border-r bg-background">
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon icon={item.icon} size={20} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
