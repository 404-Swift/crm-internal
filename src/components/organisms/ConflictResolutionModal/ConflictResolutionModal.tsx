import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowRight, Check, X, GitCompare } from 'lucide-react'
import { Icon } from '@/components/atoms/Icon'
import type { RecordConflict } from '@/services/sync/compare'
import { format } from 'date-fns'

interface ConflictResolutionModalProps<T> {
  open: boolean
  onClose: () => void
  conflicts: RecordConflict<T>[]
  recordType: 'contact' | 'deal' | 'activity'
  onResolve: (resolutions: Resolution<T>[]) => Promise<void>
}

export interface Resolution<T> {
  recordId: string
  action: 'use-supabase' | 'use-sheets' | 'merge' | 'skip'
  fieldResolutions?: Partial<Record<keyof T, 'supabase' | 'sheets'>>
}

export function ConflictResolutionModal<T extends { id: string }>({
  open,
  onClose,
  conflicts,
  recordType,
  onResolve,
}: ConflictResolutionModalProps<T>) {
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set())
  const [fieldResolutions, setFieldResolutions] = useState<Map<string, Partial<Record<keyof T, 'supabase' | 'sheets'>>>>(new Map())
  const [bulkAction, setBulkAction] = useState<'use-supabase' | 'use-sheets' | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set())

  const conflictsWithIssues = useMemo(() => {
    return conflicts.filter(c => c.conflicts.length > 0 || c.isNewInSheets || c.isNewInSupabase)
  }, [conflicts])

  const stats = useMemo(() => {
    return {
      total: conflicts.length,
      withConflicts: conflicts.filter(c => c.conflicts.length > 0).length,
      newInSheets: conflicts.filter(c => c.isNewInSheets).length,
      newInSupabase: conflicts.filter(c => c.isNewInSupabase).length,
    }
  }, [conflicts])

  const handleBulkSelect = (action: 'use-supabase' | 'use-sheets') => {
    setBulkAction(action)
    const allIds = new Set(conflictsWithIssues.map(c => c.id))
    setSelectedRecords(allIds)
    
    // Set field resolutions for all conflicts
    const newFieldResolutions = new Map(fieldResolutions)
    conflictsWithIssues.forEach(conflict => {
      if (conflict.conflicts.length > 0) {
        const resolutions: Partial<Record<keyof T, 'supabase' | 'sheets'>> = {}
        conflict.conflicts.forEach(conf => {
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
      const allIds = new Set(conflictsWithIssues.map(c => c.id))
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

  const handleFieldResolution = (recordId: string, field: keyof T, source: 'supabase' | 'sheets') => {
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

    setIsResolving(true)
    try {
      const resolutions: Resolution<T>[] = []
      
      for (const recordId of selectedRecords) {
        const conflict = conflicts.find(c => c.id === recordId)
        if (!conflict) continue

        let action: Resolution<T>['action'] = 'skip'
        let fieldRes: Partial<Record<keyof T, 'supabase' | 'sheets'>> | undefined

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
            const resolutions: Partial<Record<keyof T, 'supabase' | 'sheets'>> = {}
            conflict.conflicts.forEach(conf => {
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

      await onResolve(resolutions)
      onClose()
    } catch (error) {
      console.error('Failed to resolve conflicts:', error)
    } finally {
      setIsResolving(false)
    }
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(empty)'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'number') {
      if (recordType === 'deal' && String(value).includes('.')) {
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
    if (recordType === 'contact') {
      return `${record.first_name || ''} ${record.last_name || ''}`.trim() || record.email || 'Unknown Contact'
    }
    if (recordType === 'deal') {
      return record.title || 'Untitled Deal'
    }
    return record.description?.substring(0, 50) || 'Activity'
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent onClose={onClose} className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-2xl">Resolve Data Conflicts</DialogTitle>
          <DialogDescription className="text-base mt-2">
            Found {conflictsWithIssues.length} record{conflictsWithIssues.length !== 1 ? 's' : ''} with differences.
            {stats.withConflicts > 0 && ` ${stats.withConflicts} with field conflicts,`}
            {stats.newInSheets > 0 && ` ${stats.newInSheets} new in Sheets,`}
            {stats.newInSupabase > 0 && ` ${stats.newInSupabase} new in Supabase.`}
          </DialogDescription>
        </DialogHeader>

        {conflicts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center">
              <Icon icon={Check} size={48} className="mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">No conflicts found</p>
              <p className="text-sm text-muted-foreground mt-1">All records are in sync between Supabase and Google Sheets</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedRecords.size === conflictsWithIssues.length && conflictsWithIssues.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedRecords.size} of {conflictsWithIssues.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Bulk Actions:</span>
                <Button
                  variant={bulkAction === 'use-supabase' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleBulkSelect('use-supabase')}
                  disabled={selectedRecords.size === 0}
                >
                  <Icon icon={Check} className="mr-1.5" size={14} />
                  Use All Supabase
                </Button>
                <Button
                  variant={bulkAction === 'use-sheets' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleBulkSelect('use-sheets')}
                  disabled={selectedRecords.size === 0}
                >
                  <Icon icon={Check} className="mr-1.5" size={14} />
                  Use All Sheets
                </Button>
              </div>
            </div>

            {/* Conflicts List - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {conflictsWithIssues.map((conflict) => {
                const isSelected = selectedRecords.has(conflict.id)
                const isExpanded = expandedRecords.has(conflict.id)
                const hasFieldConflicts = conflict.conflicts.length > 0
                const allFieldsResolved = hasFieldConflicts && 
                  fieldResolutions.get(conflict.id) && 
                  Object.keys(fieldResolutions.get(conflict.id)!).length === conflict.conflicts.length

                return (
                  <div
                    key={conflict.id}
                    className={`rounded-lg border transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/5 shadow-apple' 
                        : 'border-border bg-card hover:border-border/80'
                    }`}
                  >
                    {/* Record Header - Always Visible */}
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleRecordToggle(conflict.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-base mb-1 truncate">
                                {getRecordDisplayName(conflict.record)}
                              </h4>
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
                                <Badge 
                                  variant={allFieldsResolved ? "default" : "outline"} 
                                  className="text-xs"
                                >
                                  {conflict.conflicts.length} conflict{conflict.conflicts.length !== 1 ? 's' : ''}
                                </Badge>
                              )}
                              {hasFieldConflicts && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpand(conflict.id)}
                                  className="h-7"
                                >
                                  <Icon 
                                    icon={ArrowRight} 
                                    className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                    size={16}
                                  />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Quick Preview for New Records */}
                          {(conflict.isNewInSheets || conflict.isNewInSupabase) && !isExpanded && (
                            <div className="grid grid-cols-2 gap-3 mt-4">
                              {conflict.supabaseRecord && (
                                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                                  <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                    Supabase
                                  </div>
                                  {recordType === 'contact' && (
                                    <div>
                                      <div className="font-medium text-sm">
                                        {(conflict.supabaseRecord as any).first_name} {(conflict.supabaseRecord as any).last_name}
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {(conflict.supabaseRecord as any).email}
                                      </div>
                                      {(conflict.supabaseRecord as any).company && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {(conflict.supabaseRecord as any).company}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {recordType === 'deal' && (
                                    <div>
                                      <div className="font-medium text-sm">
                                        {(conflict.supabaseRecord as any).title}
                                      </div>
                                      <div className="text-sm font-semibold mt-1">
                                        {formatValue((conflict.supabaseRecord as any).amount)}
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Stage: {(conflict.supabaseRecord as any).stage}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              {conflict.sheetsRecord && (
                                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                                  <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                    Google Sheets
                                  </div>
                                  {recordType === 'contact' && (
                                    <div>
                                      <div className="font-medium text-sm">
                                        {(conflict.sheetsRecord as any).first_name} {(conflict.sheetsRecord as any).last_name}
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {(conflict.sheetsRecord as any).email}
                                      </div>
                                      {(conflict.sheetsRecord as any).company && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {(conflict.sheetsRecord as any).company}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {recordType === 'deal' && (
                                    <div>
                                      <div className="font-medium text-sm">
                                        {(conflict.sheetsRecord as any).title}
                                      </div>
                                      <div className="text-sm font-semibold mt-1">
                                        {formatValue((conflict.sheetsRecord as any).amount)}
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Stage: {(conflict.sheetsRecord as any).stage}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Field Conflicts */}
                    {isExpanded && hasFieldConflicts && (
                      <div className="border-t border-border bg-muted/20 p-4 space-y-4">
                        <div className="text-sm font-semibold mb-3 text-foreground">
                          Field Conflicts ({conflict.conflicts.length})
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {conflict.conflicts.map((fieldConflict) => {
                            const fieldRes = fieldResolutions.get(conflict.id)?.[fieldConflict.field]
                            const fieldName = String(fieldConflict.field).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                            
                            return (
                              <div 
                                key={String(fieldConflict.field)} 
                                className="p-4 rounded-lg border border-border bg-background"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm font-semibold">{fieldName}</span>
                                  <div className="flex gap-2">
                                    <Button
                                      variant={fieldRes === 'supabase' ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => handleFieldResolution(conflict.id, fieldConflict.field, 'supabase')}
                                      className="h-8"
                                    >
                                      <Icon icon={Check} className="mr-1.5" size={14} />
                                      Supabase
                                    </Button>
                                    <Button
                                      variant={fieldRes === 'sheets' ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => handleFieldResolution(conflict.id, fieldConflict.field, 'sheets')}
                                      className="h-8"
                                    >
                                      <Icon icon={Check} className="mr-1.5" size={14} />
                                      Sheets
                                    </Button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className={`p-3 rounded-lg border transition-all ${
                                    fieldRes === 'supabase' 
                                      ? 'border-primary bg-primary/10 shadow-apple' 
                                      : 'border-border bg-muted/30'
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
                                      ? 'border-primary bg-primary/10 shadow-apple' 
                                      : 'border-border bg-muted/30'
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
                )
              })}
            </div>

            {/* Footer */}
            <DialogFooter className="px-6 py-4 border-t border-border bg-muted/30">
              <div className="flex items-center justify-between w-full">
                <div className="text-sm text-muted-foreground">
                  {selectedRecords.size > 0 && (
                    <span>
                      {selectedRecords.size} record{selectedRecords.size !== 1 ? 's' : ''} selected for resolution
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose} disabled={isResolving}>
                    <Icon icon={X} className="mr-2" size={18} />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleResolve} 
                    disabled={isResolving || selectedRecords.size === 0}
                    size="lg"
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
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
