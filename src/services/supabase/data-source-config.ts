import { supabase } from './client'
import type { Database } from './types'

export type SourceType = 'supabase' | 'google_sheets'

type DataSourceConfigRow = Database['public']['Tables']['data_source_config']['Row']
type DataSourceConfigInsert = Database['public']['Tables']['data_source_config']['Insert']
type DataSourceConfigUpdate = Database['public']['Tables']['data_source_config']['Update']

export interface DataSourceConfig extends DataSourceConfigRow {}

/**
 * Get the current source of truth (company-wide)
 */
export async function getSourceOfTruth(): Promise<SourceType> {
  try {
    const { data, error } = await (supabase
      .from('data_source_config') as any)
      .select('*')
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No config found, return default
        return 'supabase'
      }
      // If 406 error, table might not exist or RLS is blocking - return default
      if (error.message?.includes('406') || error.status === 406) {
        console.warn('Data source config table may not be accessible:', error.message)
        return 'supabase'
      }
      throw new Error(`Failed to get source of truth: ${error.message}`)
    }

    if (!data) {
      return 'supabase'
    }

    const row = data as DataSourceConfigRow
    return row.source_type
  } catch (error: any) {
    // If table doesn't exist or any other error, return default
    console.warn('Error getting source of truth, using default (supabase):', error)
    return 'supabase'
  }
}

/**
 * Set the source of truth (company-wide)
 * Since there's only one row, we use insert-or-update logic
 */
export async function setSourceOfTruth(sourceType: SourceType): Promise<void> {
  // Try to update first (most common case)
  const updateData: DataSourceConfigUpdate = {
    source_type: sourceType,
  }

  const { error: updateError } = await (supabase
    .from('data_source_config') as any)
    .update(updateData)
    .eq('singleton', true)

  if (updateError) {
    // If update fails (no rows), try insert
    if (updateError.code === 'PGRST116' || updateError.message?.includes('No rows')) {
      const insert: DataSourceConfigInsert = {
        singleton: true,
        source_type: sourceType,
      }

      const { error: insertError } = await (supabase
        .from('data_source_config') as any)
        .insert(insert)

      if (insertError) {
        // If insert also fails (race condition), try update again
        if (insertError.code === '23505' || insertError.code === '23514') {
          const { error: retryUpdateError } = await (supabase
            .from('data_source_config') as any)
            .update(updateData)
            .eq('singleton', true)
          
          if (retryUpdateError) {
            throw new Error(`Failed to set source of truth: ${retryUpdateError.message}`)
          }
        } else {
          throw new Error(`Failed to set source of truth: ${insertError.message}`)
        }
      }
    } else {
      throw new Error(`Failed to update source of truth: ${updateError.message}`)
    }
  }
}
