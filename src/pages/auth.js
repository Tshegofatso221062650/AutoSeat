import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { supabase } from '../supabaseClient'

const styles = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  right: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '40px',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  formTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#333',
  },
  formSub: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '30px',
  },
  error: {
    backgroundColor: '#fee',
    color: '#c00',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '15px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
}

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