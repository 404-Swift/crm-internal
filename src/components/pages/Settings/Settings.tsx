import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/templates/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/atoms/Button'
import { AlertCircle, GitCompare } from 'lucide-react'
import { Icon } from '@/components/atoms/Icon'
import { GoogleSheetsAuth } from './GoogleSheetsAuth'

export default function Settings() {
  const navigate = useNavigate()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your CRM settings and integrations
          </p>
        </div>

        <GoogleSheetsAuth />

        <Card>
          <CardHeader>
            <CardTitle>Data Synchronization</CardTitle>
            <CardDescription>
              Compare and resolve conflicts between Supabase and Google Sheets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
              <Icon icon={AlertCircle} className="text-muted-foreground mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Bidirectional Sync</p>
                <p className="text-xs text-muted-foreground">
                  Compare data from both sources and manually resolve conflicts. You can choose which version to keep for each field, or use bulk actions to apply the same resolution to all records.
                </p>
              </div>
            </div>

            <Button
              onClick={() => navigate('/conflicts')}
              className="w-auto"
              size="lg"
            >
              <Icon icon={GitCompare} className="mr-2" size={20} />
              Compare & Resolve Conflicts
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
