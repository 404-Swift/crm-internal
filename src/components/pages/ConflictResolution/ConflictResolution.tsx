import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/templates/DashboardLayout'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Check, GitCompare, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { Icon } from '@/components/atoms/Icon'
import { useBidirectionalSync } from '@/hooks/useBidirectionalSync'
import { toast } from '@/components/ui/toaster'
import type { RecordConflict } from '@/services/sync/compare'
import { format } from 'date-fns'

type RecordType = 'contact' | 'deal' | 'activity'

interface Resolution<T> {
  recordId: string
  action: 'use-supabase' | 'use-sheets' | 'merge' | 'skip'
  fieldResolutions?: Partial<Record<keyof T, 'supabase' | 'sheets'>>
}

export default function ConflictResolution() {
  const navigate = useNavigate()
  const {
    compare,
    isComparing,
    contactConflicts,
    dealConflicts,
    activityConflicts,
    resolveContacts,
    resolveDeals,
    resolveActivities,
    isResolving,
  } = useBidirectionalSync()

  const [activeTab, setActiveTab] = useState<RecordType>('contact')
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set())
  const [fieldResolutions, setFieldResolutions] = useState<Map<string, Partial<Record<string, 'supabase' | 'sheets'>>>>(new Map())
  const [bulkAction, setBulkAction] = useState<'use-supabase' | 'use-sheets' | null>(null)
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set())
  const [hasCompared, setHasCompared] = useState(false)

  const currentConflicts = useMemo(() => {
    switch (activeTab) {
      case 'contact':
        return contactConflicts
      case 'deal':
        return dealConflicts
      case 'activity':
        return activityConflicts
      default:
        return []
    }
  }, [activeTab, contactConflicts, dealConflicts, activityConflicts])

  const conflictsWithIssues = useMemo(() => {
    return currentConflicts.filter((c: RecordConflict<any>) => 
      c.conflicts.length > 0 || c.isNewInSheets || c.isNewInSupabase
    )
  }, [currentConflicts])

  const stats = useMemo(() => {
    return {
      total: currentConflicts.length,
      withConflicts: currentConflicts.filter((c: RecordConflict<any>) => c.conflicts.length > 0).length,
      newInSheets: currentConflicts.filter((c: RecordConflict<any>) => c.isNewInSheets).length,
      newInSupabase: currentConflicts.filter((c: RecordConflict<any>) => c.isNewInSupabase).length,
    }
  }, [currentConflicts])

  const tabStats = useMemo(() => {
    return {
      contact: {
        total: contactConflicts.length,
        withIssues: contactConflicts.filter(c => c.conflicts.length > 0 || c.isNewInSheets || c.isNewInSupabase).length,
      },
      deal: {
        total: dealConflicts.length,
        withIssues: dealConflicts.filter(c => c.conflicts.length > 0 || c.isNewInSheets || c.isNewInSupabase).length,
      },
      activity: {
        total: activityConflicts.length,
        withIssues: activityConflicts.filter(c => c.conflicts.length > 0 || c.isNewInSheets || c.isNewInSupabase).length,
      },
    }
  }, [contactConflicts, dealConflicts, activityConflicts])

  useEffect(() => {
    if (!hasCompared) {
      handleCompare()
    }
  }, [])

  const handleCompare = async () => {
    try {
      await compare()
      setHasCompared(true)
      toast.success('Comparison complete', 'Review conflicts below and select resolutions')
    } catch (error: any) {
      console.error('Compare failed:', error)
      const errorMessage = error.message || 'Failed to compare data sources'
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        toast.error(
          'Authentication required',
          'Please set up OAuth2 for Google Sheets to enable bidirectional sync. See docs/google-sheets-integration.md'
        )
      } else {
        toast.error('Comparison failed', errorMessage)
      }
    }
  }

  const handleBulkSelect = (action: 'use-supabase' | 'use-sheets') => {
    setBulkAction(action)
    const allIds = new Set(conflictsWithIssues.map((c: RecordConflict<any>) => c.id))
    setSelectedRecords(allIds)
    
    const newFieldResolutions = new Map(fieldResolutions)
    conflictsWithIssues.forEach((conflict: RecordConflict<any>) => {
      if (conflict.conflicts.length > 0) {
        const resolutions: Partial<Record<string, 'supabase' | 'sheets'>> = {}
        conflict.conflicts.forEach((conf: any) => {
          resolutions[conf.field] = action === 'use-supabase' ? 'supabase' : 'sheets'
        })
        newFieldResolutions.set(conflict.id, resolutions)
      }
    })
    setFieldResolutions(newFieldResolutions)
  }

  const handleSelectAll = () => {
    if (selectedRecords.size === conflictsWithIssues.length) {
      setSelectedRecords(new Set())
      setBulkAction(null)
    } else {
      const allIds = new Set(conflictsWithIssues.map((c: RecordConflict<any>) => c.id))
      setSelectedRecords(allIds)
    }
  }

  const handleRecordToggle = (recordId: string) => {
    const newSelected = new Set(selectedRecords)
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId)
    } else {
      newSelected.add(recordId)
    }
    setSelectedRecords(newSelected)
  }

  const toggleExpand = (recordId: string) => {
    const newExpanded = new Set(expandedRecords)
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId)
    } else {
      newExpanded.add(recordId)
    }
    setExpandedRecords(newExpanded)
  }

  const handleFieldResolution = (recordId: string, field: string, source: 'supabase' | 'sheets') => {
    const newResolutions = new Map(fieldResolutions)
    const current = newResolutions.get(recordId) || {}
    current[field] = source
    newResolutions.set(recordId, current)
    setFieldResolutions(newResolutions)
  }

  const handleResolve = async () => {
    if (selectedRecords.size === 0) {
      return
    }

    try {
      const resolutions: Resolution<any>[] = []
      
      for (const recordId of selectedRecords) {
        const conflict = currentConflicts.find((c: RecordConflict<any>) => c.id === recordId)
        if (!conflict) continue

        let action: Resolution<any>['action'] = 'skip'
        let fieldRes: Partial<Record<string, 'supabase' | 'sheets'>> | undefined

        if (conflict.isNewInSheets) {
          action = 'use-sheets'
        } else if (conflict.isNewInSupabase) {
          action = 'use-supabase'
        } else if (conflict.conflicts.length > 0) {
          const fieldResForRecord = fieldResolutions.get(recordId)
          if (fieldResForRecord && Object.keys(fieldResForRecord).length === conflict.conflicts.length) {
            action = 'merge'
            fieldRes = fieldResForRecord
          } else if (bulkAction) {
            action = bulkAction
            const resolutions: Partial<Record<string, 'supabase' | 'sheets'>> = {}
            conflict.conflicts.forEach((conf: any) => {
              resolutions[conf.field] = bulkAction === 'use-supabase' ? 'supabase' : 'sheets'
            })
            fieldRes = resolutions
          } else {
            action = 'skip'
          }
        }

        if (action !== 'skip') {
          resolutions.push({
            recordId,
            action,
            fieldResolutions: fieldRes,
          })
        }
      }

      if (activeTab === 'contact') {
        await resolveContacts(resolutions)
      } else if (activeTab === 'deal') {
        await resolveDeals(resolutions)
      } else {
        await resolveActivities(resolutions)
      }

      toast.success(`${activeTab === 'activity' ? 'Activities' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1) + 's'} resolved`, 'Conflicts have been resolved and synced')
      
      setSelectedRecords(new Set())
      setFieldResolutions(new Map())
      setBulkAction(null)
      await handleCompare()
    } catch (error: any) {
      toast.error('Resolution failed', error.message || 'Failed to resolve conflicts')
    }
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(empty)'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'number') {
      if (activeTab === 'deal' && String(value).includes('.')) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
        }).format(value)
      }
      return value.toLocaleString()
    }
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        return format(new Date(value), 'MMM d, yyyy')
      } catch {
        return value
      }
    }
    return String(value)
  }

  const getRecordDisplayName = (record: any): string => {
    if (activeTab === 'contact') {
      return `${record.first_name || ''} ${record.last_name || ''}`.trim() || record.email || 'Unknown Contact'
    }
    if (activeTab === 'deal') {
      return record.title || 'Untitled Deal'
    }
    return record.description?.substring(0, 50) || 'Activity'
  }

  const getTabLabel = (tab: RecordType): string => {
    switch (tab) {
      case 'contact':
        return 'Contacts'
      case 'deal':
        return 'Deals'
      case 'activity':
        return 'Activities'
      default:
        return ''
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/settings')}
              className="gap-2"
            >
              <Icon icon={ArrowLeft} size={18} />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Data Conflicts</h1>
              <p className="text-muted-foreground mt-2">
                Resolve differences between Supabase and Google Sheets
              </p>
            </div>
          </div>
          <Button
            onClick={handleCompare}
            disabled={isComparing}
            variant="outline"
          >
            <Icon icon={RefreshCw} className={`mr-2 ${isComparing ? 'animate-spin' : ''}`} size={18} />
            {isComparing ? 'Comparing...' : 'Refresh'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {(['contact', 'deal', 'activity'] as RecordType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab)
                setSelectedRecords(new Set())
                setExpandedRecords(new Set())
                setFieldResolutions(new Map())
                setBulkAction(null)
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {getTabLabel(tab)}
              {tabStats[tab].withIssues > 0 && (
                <Badge 
                  variant={activeTab === tab ? "default" : "secondary"} 
                  className="ml-2 text-xs"
                >
                  {tabStats[tab].withIssues}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {!hasCompared && isComparing ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <Icon icon={GitCompare} className="mx-auto mb-4 animate-spin text-muted-foreground" size={48} />
              <p className="text-lg font-medium">Comparing data sources...</p>
              <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
            </div>
          </div>
        ) : conflictsWithIssues.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <Icon icon={Check} size={48} className="mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">No conflicts found</p>
              <p className="text-sm text-muted-foreground mt-1">
                All {getTabLabel(activeTab).toLowerCase()} are in sync
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedRecords.size === conflictsWithIssues.length && conflictsWithIssues.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedRecords.size} of {conflictsWithIssues.length} selected
                </span>
                <span className="text-sm text-muted-foreground">
                  {stats.withConflicts > 0 && `${stats.withConflicts} with conflicts`}
                  {stats.newInSheets > 0 && ` • ${stats.newInSheets} new in Sheets`}
                  {stats.newInSupabase > 0 && ` • ${stats.newInSupabase} new in Supabase`}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={bulkAction === 'use-supabase' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleBulkSelect('use-supabase')}
                  disabled={selectedRecords.size === 0}
                >
                  Use All Supabase
                </Button>
                <Button
                  variant={bulkAction === 'use-sheets' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleBulkSelect('use-sheets')}
                  disabled={selectedRecords.size === 0}
                >
                  Use All Sheets
                </Button>
              </div>
            </div>

            {/* Conflicts List */}
            <div className="space-y-4">
              {conflictsWithIssues.map((conflict: RecordConflict<any>) => {
                const isSelected = selectedRecords.has(conflict.id)
                const isExpanded = expandedRecords.has(conflict.id)
                const hasFieldConflicts = conflict.conflicts.length > 0
                const allFieldsResolved = hasFieldConflicts && 
                  fieldResolutions.get(conflict.id) && 
                  Object.keys(fieldResolutions.get(conflict.id)!).length === conflict.conflicts.length

                return (
                  <Card
                    key={conflict.id}
                    className={`transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border'
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleRecordToggle(conflict.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg mb-1">
                                {getRecordDisplayName(conflict.record)}
                              </h3>
                              <p className="text-xs text-muted-foreground font-mono">
                                {conflict.id.substring(0, 8)}...
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {conflict.isNewInSheets && (
                                <Badge variant="secondary" className="text-xs">
                                  New in Sheets
                                </Badge>
                              )}
                              {conflict.isNewInSupabase && (
                                <Badge variant="secondary" className="text-xs">
                                  New in Supabase
                                </Badge>
                              )}
                              {hasFieldConflicts && (
                                <>
                                  <Badge 
                                    variant={allFieldsResolved ? "default" : "outline"} 
                                    className="text-xs"
                                  >
                                    {conflict.conflicts.length} conflict{conflict.conflicts.length !== 1 ? 's' : ''}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleExpand(conflict.id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Icon 
                                      icon={isExpanded ? ChevronUp : ChevronDown}
                                      size={16}
                                    />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Quick Preview for New Records */}
                          {(conflict.isNewInSheets || conflict.isNewInSupabase) && !isExpanded && (
                            <div className="grid grid-cols-2 gap-4 mt-4">
                              {conflict.supabaseRecord && (
                                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                  <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                    Supabase
                                  </div>
                                  {activeTab === 'contact' && (
                                    <div>
                                      <div className="font-medium text-base mb-1">
                                        {(conflict.supabaseRecord as any).first_name} {(conflict.supabaseRecord as any).last_name}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {(conflict.supabaseRecord as any).email}
                                      </div>
                                    </div>
                                  )}
                                  {activeTab === 'deal' && (
                                    <div>
                                      <div className="font-medium text-base mb-1">
                                        {(conflict.supabaseRecord as any).title}
                                      </div>
                                      <div className="text-lg font-semibold mt-2">
                                        {formatValue((conflict.supabaseRecord as any).amount)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              {conflict.sheetsRecord && (
                                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                  <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                    Google Sheets
                                  </div>
                                  {activeTab === 'contact' && (
                                    <div>
                                      <div className="font-medium text-base mb-1">
                                        {(conflict.sheetsRecord as any).first_name} {(conflict.sheetsRecord as any).last_name}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {(conflict.sheetsRecord as any).email}
                                      </div>
                                    </div>
                                  )}
                                  {activeTab === 'deal' && (
                                    <div>
                                      <div className="font-medium text-base mb-1">
                                        {(conflict.sheetsRecord as any).title}
                                      </div>
                                      <div className="text-lg font-semibold mt-2">
                                        {formatValue((conflict.sheetsRecord as any).amount)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Expanded Field Conflicts */}
                          {isExpanded && hasFieldConflicts && (
                            <div className="border-t border-border mt-4 pt-4 space-y-4">
                              <div className="text-sm font-semibold mb-4">
                                Field Conflicts ({conflict.conflicts.length})
                              </div>
                              <div className="space-y-4">
                                {conflict.conflicts.map((fieldConflict: any) => {
                                  const fieldRes = fieldResolutions.get(conflict.id)?.[fieldConflict.field]
                                  const fieldName = String(fieldConflict.field).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                                  
                                  return (
                                    <div 
                                      key={String(fieldConflict.field)} 
                                      className="p-4 rounded-lg border border-border bg-muted/20"
                                    >
                                      <div className="flex items-center justify-between mb-4">
                                        <span className="text-sm font-semibold">{fieldName}</span>
                                        <div className="flex gap-2">
                                          <Button
                                            variant={fieldRes === 'supabase' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => handleFieldResolution(conflict.id, fieldConflict.field, 'supabase')}
                                          >
                                            Supabase
                                          </Button>
                                          <Button
                                            variant={fieldRes === 'sheets' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => handleFieldResolution(conflict.id, fieldConflict.field, 'sheets')}
                                          >
                                            Sheets
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className={`p-3 rounded-lg border transition-all ${
                                          fieldRes === 'supabase' 
                                            ? 'border-primary bg-primary/10' 
                                            : 'border-border bg-background'
                                        }`}>
                                          <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                            Supabase
                                          </div>
                                          <div className="text-sm break-words">
                                            {formatValue(fieldConflict.supabaseValue)}
                                          </div>
                                        </div>
                                        <div className={`p-3 rounded-lg border transition-all ${
                                          fieldRes === 'sheets' 
                                            ? 'border-primary bg-primary/10' 
                                            : 'border-border bg-background'
                                        }`}>
                                          <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                            Google Sheets
                                          </div>
                                          <div className="text-sm break-words">
                                            {formatValue(fieldConflict.sheetsValue)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Footer Actions */}
            {selectedRecords.size > 0 && (
              <div className="sticky bottom-0 bg-background border-t border-border p-4 -mx-6 mt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedRecords.size} record{selectedRecords.size !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => navigate('/settings')} disabled={isResolving}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleResolve} 
                      disabled={isResolving}
                    >
                      {isResolving ? (
                        <>
                          <Icon icon={GitCompare} className="mr-2 animate-spin" size={18} />
                          Resolving...
                        </>
                      ) : (
                        <>
                          <Icon icon={Check} className="mr-2" size={18} />
                          Resolve {selectedRecords.size} Record{selectedRecords.size !== 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
