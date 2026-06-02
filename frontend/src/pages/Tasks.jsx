import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckSquare, Clock, AlertTriangle } from 'lucide-react'
import { format, isPast } from 'date-fns'
import api from '../api/axios'

const fetchTasks = async ({ status, priority }) => {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (priority) params.set('priority', priority)
  const res = await api.get(`/tasks?${params}`)
  return res.data
}

const TaskModal = ({ open, onClose, onSave }) => {
  const [form, setForm] = useState({ title: '', description: '', status: 'pending', priority: 'medium', due_date: '' })
  const [loading, setLoading] = useState(false)
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
          <div className="modal-title">New Task</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group">
                <label className="input-label">Task Title *</label>
                <input className="input" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required placeholder="What needs to be done?" />
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <textarea className="textarea" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="More details..." />
              </div>
              <div className="form-grid">
                <div className="input-group">
                  <label className="input-label">Priority</label>
                  <select className="select" value={form.priority} onChange={e => setForm(p => ({...p, priority: e.target.value}))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Status</label>
                  <select className="select" value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="input-group full-width">
                  <label className="input-label">Due Date</label>
                  <input className="input" type="datetime-local" value={form.due_date} onChange={e => setForm(p => ({...p, due_date: e.target.value}))} />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Tasks() {
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', status, priority],
    queryFn: () => fetchTasks({ status, priority })
  })

  const createMutation = useMutation({
    mutationFn: (form) => api.post('/tasks', form),
    onSuccess: () => qc.invalidateQueries(['tasks'])
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/tasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries(['tasks'])
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries(['tasks'])
  })

  const tasks = data?.tasks || []
  const pending = tasks.filter(t => t.status === 'pending').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const overdue = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed').length

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Tasks</div>
          <div className="page-subtitle">{tasks.length} total tasks</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          New Task
        </button>
      </div>

      {/* Mini stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Pending', value: pending, icon: Clock, color: '#f59e0b' },
          { label: 'In Progress', value: inProgress, icon: CheckSquare, color: '#3b82f6' },
          { label: 'Overdue', value: overdue, icon: AlertTriangle, color: '#ef4444' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 12, padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Icon size={18} color={color} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select className="select" style={{ width: 'auto' }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="select" style={{ width: 'auto' }} value={priority} onChange={e => setPriority(e.target.value)}>
          <option value="">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map(task => {
            const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed'
            return (
              <div key={task.id} className="card" style={{
                padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 16,
                borderLeft: `4px solid ${
                  task.priority === 'urgent' ? '#ef4444' :
                  task.priority === 'high' ? '#f59e0b' :
                  task.priority === 'medium' ? '#3b82f6' : '#555570'
                }`,
              }}>
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={task.status === 'completed'}
                  onChange={() => updateMutation.mutate({
                    id: task.id,
                    status: task.status === 'completed' ? 'pending' : 'completed'
                  })}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                />

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600,
                    textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                    color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)',
                  }}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {task.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                    <span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span>
                    <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                    {task.customer_name && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>👤 {task.customer_name}</span>
                    )}
                    {task.due_date && (
                      <span style={{ fontSize: 11, color: isOverdue ? '#ef4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isOverdue && <AlertTriangle size={11} />}
                        {format(new Date(task.due_date), 'MMM d, HH:mm')}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    className="select"
                    style={{ width: 'auto', fontSize: 12, padding: '4px 10px' }}
                    value={task.status}
                    onChange={e => updateMutation.mutate({ id: task.id, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button className="btn-icon" onClick={() => window.confirm('Delete?') && deleteMutation.mutate(task.id)} style={{ color: 'var(--accent-danger)' }}>
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
          {tasks.length === 0 && (
            <div className="empty-state">
              <CheckSquare size={48} />
              <p>No tasks found</p>
            </div>
          )}
        </div>
      )}

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={(form) => createMutation.mutateAsync(form)}
      />
    </div>
  )
}
