import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const { signInWithEmail } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ─────────────────────────────
  // VERIFY MANAGER ROLE
  // ─────────────────────────────
  const verifyManager = async (userId) => {
    const { data, error } = await supabase
      .from('managers')
      .select('dept_id')
      .eq('user_id', userId)
      .single()

    if (error || !data) return null
    return data
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    try {
      setLoading(true)

      // 1. Login via Supabase Auth
      const data = await signInWithEmail(email, password)
      const user = data.user

      // 2. Check if user is a manager
      const manager = await verifyManager(user.id)

      if (!manager) {
        setError('Access denied: You are not a registered manager.')
        await supabase.auth.signOut()
        return
      }

      // 3. Redirect to dashboard
      navigate('/dashboard')

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.right}>
        <div style={styles.form}>
          <h2 style={styles.formTitle}>Manager Login</h2>
          <p style={styles.formSub}>
            Access the Smart Seat Allocation System
          </p>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleLogin}>
            <input
              style={styles.input}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <input
              style={styles.input}
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            <button
              type="submit"
              style={styles.submitBtn}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}