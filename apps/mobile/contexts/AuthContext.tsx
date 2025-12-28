import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// Database user type that extends Supabase user
interface DatabaseUser {
  id: string
  email: string
  full_name: string | null
  display_name?: string | null
  avatar_url: string | null
  role: 'admin' | 'moderator' | 'member'
  status: 'online' | 'away' | 'offline'
  onboarding_completed?: boolean
  onboarding_step?: string
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: DatabaseUser | null
  profile: DatabaseUser | null // Alias for user (for compatibility)
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  updateUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DatabaseUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Define fetchUserProfile before the useEffect that uses it
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error} = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (data && !error) {
        setUser(data as DatabaseUser)
      } else {
        console.error('❌ Failed to fetch user profile from database:', error)
        setUser(null)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session ? 'exists' : 'none')
      setSession(session)

      if (session?.user) {
        // Fetch full user profile from database
        fetchUserProfile(session.user.id)
      } else {
        setUser(null)
      }

      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event)
        setSession(session)

        if (session?.user) {
          // Fetch full user profile from database
          fetchUserProfile(session.user.id)
        } else {
          setUser(null)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }, [])

  const updateUser = useCallback(async () => {
    if (session?.user) {
      console.log('🔄 AuthContext: Fetching fresh user profile after update...')
      await fetchUserProfile(session.user.id)
      console.log('✅ AuthContext: User profile refreshed:', user?.onboarding_completed)
    }
  }, [session, fetchUserProfile, user])

  const value: AuthContextType = useMemo(() => ({
    user,
    profile: user,
    session,
    loading,
    signIn,
    signOut,
    updateUser
  }), [user, session, loading, signIn, signOut, updateUser])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}