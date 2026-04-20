import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [managerProfile, setManagerProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch manager details from DB
  const fetchManagerProfile = async (authUser) => {
    if (!authUser) return null

    const { data, error } = await supabase
      .from('managers')
      .select(`
        user_id,
        dept_id,
        departments (
          dept_id,
          name
        )
      `)
      .eq('user_id', authUser.id)
      .single()

    if (error) {
      console.error('Error fetching manager profile:', error)
      return null
    }

    return data
  }

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      const authUser = session?.user ?? null
      setUser(authUser)

      if (authUser) {
        const profile = await fetchManagerProfile(authUser)
        setManagerProfile(profile)
      }

      setLoading(false)
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const authUser = session?.user ?? null
        setUser(authUser)

        if (authUser) {
          const profile = await fetchManagerProfile(authUser)
          setManagerProfile(profile)
        } else {
          setManagerProfile(null)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // ─────────────────────────────
  // AUTH METHODS
  // ─────────────────────────────

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard'
      }
    })
    if (error) throw error
  }

  const signInWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  }

  const signUpWithEmail = async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: username
        }
      }
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setManagerProfile(null)
  }

  return (
    <AuthContext.Provider value={{
      // auth
      user,
      loading,

      // domain-specific identity 
      managerProfile,
      departmentId: managerProfile?.dept_id,
      departmentName: managerProfile?.departments?.name,

      // actions
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut
    }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)