import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Activity, Phone, Mail, Users, FileText } from 'lucide-react'
import { format } from 'date-fns'
import api from '../api/axios'

const fetchActivities = async () => {
  const res = await api.get('/activities')
  return res.data
}

const TYPE_CONFIG = {
  call: { label: 'Call', icon: Phone, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  email: { label: 'Email', icon: Mail, color: '#6c63ff', bg: 'rgba(108,99,255,0.12)' },
  meeting: { label: 'Meeting', icon: Users, color: '#10d98c', bg: 'rgba(16,217,140,0.12)' },
  note: { label: 'Note', icon: FileText, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  task_completed: { label: 'Task', icon: Activity, color: '#10d98c', bg: 'rgba(16,217,140,0.12)' },
  deal_updated: { label: 'Deal', icon: Activity, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  customer_added: { label: 'Customer', icon: Users, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
}

const ActivityModal = ({ open, onClose, onSave }) => {
  const [form, setForm] = useState({ type: 'call', title: '', description: '', customer_id: '' })
  const [loading, setLoading] = useState(false)
  const { data: customers } = useQuery({ queryKey: ['customers-list'], queryFn: () => api.get('/customers').then(r => r.data) })

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try { await onSave(form); onClose() }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Log Activity</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group">
                <label className="input-label">Activity Type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['call', 'email', 'meeting', 'note'].map(t => {
                    const cfg = TYPE_CONFIG[t]
                    return (
                      <button
                        key={t} type="button"
                        onClick={() => setForm(p => ({...p, type: t}))}
                        style={{
                          flex: 1, padding: '10px 6px', borderRadius: 8, border: '1px solid',
                          borderColor: form.type === t ? cfg.color : 'var(--border-color)',
                          background: form.type === t ? cfg.bg : 'var(--bg-input)',
                          color: form.type === t ? cfg.color : 'var(--text-secondary)',
                          cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          transition: 'var(--transition)',
                        }}
                      >
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Title *</label>
                <input className="input" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required placeholder="Activity summary..." />
              </div>
              <div className="input-group">
                <label className="input-label">Customer *</label>
                <select className="select" value={form.customer_id} onChange={e => setForm(p => ({...p, customer_id: e.target.value}))} required>
                  <option value="">Select customer</option>
                  {customers?.customers?.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Notes</label>
                <textarea className="textarea" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="What happened?" />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Log Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Activities() {
  const [modalOpen, setModalOpen] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({ queryKey: ['activities'], queryFn: fetchActivities })

  const createMutation = useMutation({
    mutationFn: (form) => api.post('/activities', form),
    onSuccess: () => qc.invalidateQueries(['activities'])
  })

  const activities = data?.activities || []

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Activity Feed</div>
          <div className="page-subtitle">{activities.length} recent activities</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Log Activity
        </button>
      </div>

      {isLoading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <div className="card" style={{ padding: '8px 0' }}>
          {activities.map((activity, i) => {
            const cfg = TYPE_CONFIG[activity.type] || TYPE_CONFIG.note
            const Icon = cfg.icon
            return (
              <div key={activity.id} style={{
                display: 'flex', gap: 16,
                padding: '16px 24px',
                borderBottom: i < activities.length - 1 ? '1px solid rgba(37,37,53,0.5)' : 'none',
                alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 38, height: 38,
                  borderRadius: 10,
                  background: cfg.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={16} color={cfg.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{activity.title}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                      color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 20
                    }}>
                      {cfg.label}
                    </span>
                  </div>
                  {activity.description && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                      {activity.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                    {activity.customer_name && <span>👤 {activity.customer_name}</span>}
                    {activity.user_name && <span>by {activity.user_name}</span>}
                    <span>{format(new Date(activity.created_at), 'MMM d, yyyy · HH:mm')}</span>
                  </div>
                </div>
              </div>
            )
          })}
          {activities.length === 0 && (
            <div className="empty-state">
              <Activity size={48} />
              <p>No activities logged yet</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setModalOpen(true)}>
                Log First Activity
              </button>
            </div>
          )}
        </div>
      )}

      <ActivityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={(form) => createMutation.mutateAsync(form)}
      />
    </div>
  )
}
