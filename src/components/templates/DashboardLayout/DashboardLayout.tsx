import { Header } from '@/components/organisms/Header'
import { Sidebar } from '@/components/organisms/Sidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
