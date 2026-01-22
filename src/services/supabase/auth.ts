import { supabase } from './client'
import type { User } from '@supabase/supabase-js'

export interface AuthResponse {
  user: User | null
  error: Error | null
}

export const authService = {
  async signUp(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return {
      user: data.user,
      error: error ? new Error(error.message) : null,
    }
  },

  async signIn(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return {
      user: data.user,
      error: error ? new Error(error.message) : null,
    }
  },

  async signInWithMagicLink(email: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return {
      error: error ? new Error(error.message) : null,
    }
  },

  async signOut(): Promise<{ error: Error | null }> {
    const { error } = await supabase.auth.signOut()
    return {
      error: error ? new Error(error.message) : null,
    }
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error: error ? new Error(error.message) : null }
  },

  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error: error ? new Error(error.message) : null }
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null)
    })
  },
}
