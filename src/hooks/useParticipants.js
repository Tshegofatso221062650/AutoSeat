import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function useParticipants() {
  const [participants, setParticipants] = useState([])
  const [sessions, setSessions] = useState([])
  const [departmentLimits, setDepartmentLimits] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ─────────────────────────────
  // FETCH PARTICIPANTS
  // ─────────────────────────────
  const fetchParticipants = async () => {
    const { data, error } = await supabase
      .from('participants')
      .select(`
        participant_id,
        username,
        dept_id,
        departments (name),
        allocations (
          sessions (name)
        )
      `)

    if (error) throw error

    return data.map(p => ({
      id: p.participant_id,
      name: p.username,
      department: p.departments?.name || '',
      session: p.allocations?.sessions?.name || ''
    }))
  }

  // ─────────────────────────────
  // FETCH SESSIONS
  // ─────────────────────────────
  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('session_id, name, start_time, end_time, capacity')

    if (error) throw error

    return data.map(s => ({
      id: s.session_id,
      name: s.name,
      time: `${new Date(s.start_time).toLocaleTimeString()} - ${new Date(s.end_time).toLocaleTimeString()}`,
      capacity: s.capacity
    }))
  }

  // ─────────────────────────────
  // FETCH DEPARTMENT LIMITS
  // ─────────────────────────────
  const fetchDepartmentLimits = async () => {
    const { data, error } = await supabase
      .from('max_allocations_per_session')
      .select(`
        max_seats,
        departments (name)
      `)

    if (error) throw error

    const limits = {}

    data.forEach(row => {
      const deptName = row.departments?.name
      if (deptName) {
        limits[deptName] = row.max_seats
      }
    })

    return limits
  }

  // ─────────────────────────────
  // LOAD ALL DATA
  // ─────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [p, s, d] = await Promise.all([
        fetchParticipants(),
        fetchSessions(),
        fetchDepartmentLimits()
      ])

      setParticipants(p)
      setSessions(s)
      setDepartmentLimits(d)

    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  // initial load
  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    participants,
    sessions,
    departmentLimits,
    loading,
    error,
    refresh: loadData
  }
}