import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { StatCard } from '@/components/molecules/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useContacts } from '@/hooks/useContacts'
import { useDeals } from '@/hooks/useDeals'
import {
  getPipelineFunnelConfig,
  getDealsByStageOverTimeConfig,
  getContactsBySourceConfig,
} from '@/services/charts/chartConfigs'

export function DashboardStats() {
  const { contacts, isLoading: contactsLoading } = useContacts()
  const { deals, isLoading: dealsLoading } = useDeals()

  const stats = useMemo(() => {
    const totalDeals = deals.length
    const openDeals = deals.filter((d) => !d.stage.startsWith('closed-')).length
    const totalValue = deals.reduce((sum, d) => sum + d.amount, 0)
    const wonDeals = deals.filter((d) => d.stage === 'closed-won')
    const wonValue = wonDeals.reduce((sum, d) => sum + d.amount, 0)

    return {
      totalContacts: contacts.length,
      totalDeals,
      openDeals,
      totalValue: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }).format(totalValue),
      wonValue: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }).format(wonValue),
    }
  }, [contacts, deals])

  if (contactsLoading || dealsLoading) {
    return <div className="text-muted-foreground">Loading stats...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Contacts"
          value={stats.totalContacts}
          description="All contacts in CRM"
        />
        <StatCard
          title="Open Deals"
          value={stats.openDeals}
          description={`${stats.totalDeals} total deals`}
        />
        <StatCard
          title="Pipeline Value"
          value={stats.totalValue}
          description="Total deal value"
        />
        <StatCard
          title="Won Value"
          value={stats.wonValue}
          description="Closed won deals"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts
              option={getPipelineFunnelConfig(deals)}
              style={{ height: '300px' }}
              opts={{ renderer: 'svg' }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacts by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts
              option={getContactsBySourceConfig(contacts)}
              style={{ height: '300px' }}
              opts={{ renderer: 'svg' }}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deals by Stage Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ReactECharts
            option={getDealsByStageOverTimeConfig(deals)}
            style={{ height: '300px' }}
            opts={{ renderer: 'svg' }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
