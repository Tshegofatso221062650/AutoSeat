import { useCallback, useEffect, useState } from 'react'
import { initialParticipants, departmentLimits as mockDepartmentLimits, sessions as mockSessions } from '../data/mockData'
import { supabase } from '../supabaseClient'

export default function useParticipants() {
  const [participants, setParticipants] = useState([])
  const [sessions, setSessions] = useState([])
  const [departmentLimits, setDepartmentLimits] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dataSource, setDataSource] = useState(null) // 'supabase' or 'mockdata'

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
      setDataSource(null)

      // Check if Supabase is initialized
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      const [p, s, d] = await Promise.all([
        fetchParticipants(),
        fetchSessions(),
        fetchDepartmentLimits()
      ])

      setParticipants(p)
      setSessions(s)
      setDepartmentLimits(d)
      setDataSource('supabase')

    } catch (err) {
      console.warn('Failed to load data from Supabase, using fallback mock data:', err)
      
      // FALLBACK: Use mock data
      setParticipants(initialParticipants)
      setSessions(mockSessions)
      setDepartmentLimits(mockDepartmentLimits)
      setDataSource('mockdata')
      setError('Using local fallback data - Supabase unavailable')
    } finally {
      setLoading(false)
    }
  }, [])

  // initial load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  return {
    participants,
    sessions,
    departmentLimits,
    loading,
    error,
    dataSource,
    refresh: loadData
  }
}