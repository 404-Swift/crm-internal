import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/templates/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/atoms/Button'
import { AlertCircle, GitCompare, Download, Database, FileSpreadsheet } from 'lucide-react'
import { Icon } from '@/components/atoms/Icon'
import { GoogleSheetsAuth } from './GoogleSheetsAuth'
import { GoogleCalendarAuth } from './GoogleCalendarAuth'
import { useGoogleSheetsSync } from '@/hooks/useGoogleSheetsSync'
import { useDataSource } from '@/hooks/useDataSource'
import { toast } from '@/components/ui/toaster'

export default function Settings() {
  const navigate = useNavigate()
  const { syncFromSheets, isSyncing } = useGoogleSheetsSync()
  const { sourceOfTruth, setSourceOfTruth, isSetting, isLoading: isLoadingSource } = useDataSource()
  const [isChanging, setIsChanging] = useState(false)

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

        <GoogleCalendarAuth />

        <Card>
          <CardHeader>
            <CardTitle>Data Source Configuration</CardTitle>
            <CardDescription>
              Choose the primary source of truth for your CRM data. The selected source will be used to populate the dashboard, while the other source acts as a backup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
              <Icon icon={AlertCircle} className="text-muted-foreground mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Source of Truth</p>
                <p className="text-xs text-muted-foreground">
                  Changing the source of truth will immediately update all data displayed in the dashboard. Make sure both sources are synced before switching.
                </p>
              </div>
            </div>

            {isLoadingSource ? (
              <div className="text-sm text-muted-foreground">Loading source configuration...</div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-4">
                  <label className="flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-muted/50 flex-1" style={{ borderColor: sourceOfTruth === 'supabase' ? 'hsl(var(--primary))' : 'hsl(var(--border))' }}>
                    <input
                      type="radio"
                      name="sourceOfTruth"
                      value="supabase"
                      checked={sourceOfTruth === 'supabase'}
                      onChange={() => {
                        if (!isChanging && sourceOfTruth !== 'supabase') {
                          setIsChanging(true)
                          setSourceOfTruth('supabase')
                            .then(() => {
                              toast.success('Source of truth updated', 'Dashboard will now use Supabase as the primary data source')
                              setIsChanging(false)
                            })
                            .catch((error) => {
                              toast.error('Failed to update source', error.message || 'Could not change source of truth')
                              setIsChanging(false)
                            })
                        }
                      }}
                      disabled={isSetting || isChanging}
                      className="sr-only"
                    />
                    <Icon icon={Database} size={24} className={sourceOfTruth === 'supabase' ? 'text-primary' : 'text-muted-foreground'} />
                    <div className="flex-1">
                      <div className="font-medium">Supabase</div>
                      <div className="text-xs text-muted-foreground">Use Supabase database as primary source</div>
                    </div>
                    {sourceOfTruth === 'supabase' && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-muted/50 flex-1" style={{ borderColor: sourceOfTruth === 'google_sheets' ? 'hsl(var(--primary))' : 'hsl(var(--border))' }}>
                    <input
                      type="radio"
                      name="sourceOfTruth"
                      value="google_sheets"
                      checked={sourceOfTruth === 'google_sheets'}
                      onChange={() => {
                        if (!isChanging && sourceOfTruth !== 'google_sheets') {
                          setIsChanging(true)
                          setSourceOfTruth('google_sheets')
                            .then(() => {
                              toast.success('Source of truth updated', 'Dashboard will now use Google Sheets as the primary data source')
                              setIsChanging(false)
                            })
                            .catch((error) => {
                              toast.error('Failed to update source', error.message || 'Could not change source of truth')
                              setIsChanging(false)
                            })
                        }
                      }}
                      disabled={isSetting || isChanging}
                      className="sr-only"
                    />
                    <Icon icon={FileSpreadsheet} size={24} className={sourceOfTruth === 'google_sheets' ? 'text-primary' : 'text-muted-foreground'} />
                    <div className="flex-1">
                      <div className="font-medium">Google Sheets</div>
                      <div className="text-xs text-muted-foreground">Use Google Sheets as primary source</div>
                    </div>
                    {sourceOfTruth === 'google_sheets' && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </label>
                </div>
                {isSetting || isChanging ? (
                  <div className="text-sm text-muted-foreground">Updating source of truth...</div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

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

            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => navigate('/conflicts')}
                className="w-auto"
                size="lg"
                variant="outline"
              >
                <Icon icon={GitCompare} className="mr-2" size={20} />
                Compare & Resolve Conflicts
              </Button>
              <Button
                onClick={() => syncFromSheets()}
                className="w-auto"
                size="lg"
                disabled={isSyncing}
              >
                <Icon icon={Download} className="mr-2" size={20} />
                {isSyncing ? 'Syncing...' : 'Sync from Google Sheets'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
