import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, DollarSign, TrendingUp } from 'lucide-react'
import api from '../api/axios'

const STAGES = [
  { key: 'lead', label: 'Lead', color: '#3b82f6' },
  { key: 'qualified', label: 'Qualified', color: '#10d98c' },
  { key: 'proposal', label: 'Proposal', color: '#6c63ff' },
  { key: 'negotiation', label: 'Negotiation', color: '#f59e0b' },
  { key: 'closed_won', label: 'Won ✓', color: '#10d98c' },
  { key: 'closed_lost', label: 'Lost ✗', color: '#ef4444' },
]

const fetchPipeline = async () => {
  const res = await api.get('/deals/pipeline')
  return res.data.pipeline
}

const DealModal = ({ open, onClose, onSave }) => {
  const [form, setForm] = useState({
    title: '', value: '', currency: 'USD', stage: 'lead',
    probability: 20, expected_close_date: '', notes: ''
  })
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
          <div className="modal-title">New Deal</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="input-group full-width">
                <label className="input-label">Deal Title *</label>
                <input className="input" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required placeholder="e.g. ERP License Q1 2025" />
              </div>
              <div className="input-group">
                <label className="input-label">Value (USD)</label>
                <input className="input" type="number" value={form.value} onChange={e => setForm(p => ({...p, value: e.target.value}))} placeholder="0" />
              </div>
              <div className="input-group">
                <label className="input-label">Stage</label>
                <select className="select" value={form.stage} onChange={e => setForm(p => ({...p, stage: e.target.value}))}>
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Probability (%)</label>
                <input className="input" type="number" min="0" max="100" value={form.probability} onChange={e => setForm(p => ({...p, probability: e.target.value}))} />
              </div>
              <div className="input-group">
                <label className="input-label">Expected Close Date</label>
                <input className="input" type="date" value={form.expected_close_date} onChange={e => setForm(p => ({...p, expected_close_date: e.target.value}))} />
              </div>
              <div className="input-group full-width">
                <label className="input-label">Notes</label>
                <textarea className="textarea" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Deal details..." />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Deals() {
  const [modalOpen, setModalOpen] = useState(false)
  const qc = useQueryClient()

  const { data: pipeline, isLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn: fetchPipeline,
  })

  const createMutation = useMutation({
    mutationFn: (form) => api.post('/deals', form),
    onSuccess: () => qc.invalidateQueries(['pipeline'])
  })

  const updateStageMutation = useMutation({
    mutationFn: ({ id, stage }) => api.put(`/deals/${id}`, { stage }),
    onSuccess: () => qc.invalidateQueries(['pipeline'])
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/deals/${id}`),
    onSuccess: () => qc.invalidateQueries(['pipeline'])
  })

  const totalPipeline = pipeline
    ? Object.values(pipeline).reduce((s, col) => s + col.total_value, 0)
    : 0

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Sales Pipeline</div>
          <div className="page-subtitle">
            Total pipeline value: ${totalPipeline.toLocaleString()}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          New Deal
        </button>
      </div>

      {isLoading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(200px, 1fr))',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 20,
        }}>
          {STAGES.map(stage => {
            const col = pipeline?.[stage.key] || { deals: [], total_value: 0, count: 0 }
            return (
              <div key={stage.key} style={{ minWidth: 200 }}>
                {/* Column Header */}
                <div style={{
                  padding: '10px 14px',
                  background: `${stage.color}15`,
                  border: `1px solid ${stage.color}30`,
                  borderRadius: 10,
                  marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: stage.color }}>{stage.label}</span>
                    <span style={{
                      background: `${stage.color}25`, color: stage.color,
                      borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700
                    }}>{col.count}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    ${col.total_value.toLocaleString()}
                  </div>
                </div>

                {/* Deal Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {col.deals.map(deal => (
                    <div key={deal.id} style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 10,
                      padding: '14px',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = stage.color}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, lineHeight: 1.3 }}>
                        {deal.title}
                      </div>
                      {deal.customer_name && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                          {deal.customer_name}
                          {deal.company && ` · ${deal.company}`}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#10d98c' }}>
                          ${Number(deal.value).toLocaleString()}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 20 }}>
                          {deal.probability}%
                        </div>
                      </div>

                      {/* Stage selector */}
                      <select
                        style={{ width: '100%', marginTop: 10 }}
                        className="select"
                        value={deal.stage}
                        onChange={e => updateStageMutation.mutate({ id: deal.id, stage: e.target.value })}
                        onClick={e => e.stopPropagation()}
                      >
                        {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>

                      <button
                        className="btn btn-danger btn-sm"
                        style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                        onClick={() => window.confirm('Delete?') && deleteMutation.mutate(deal.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}

                  {col.deals.length === 0 && (
                    <div style={{
                      border: `2px dashed ${stage.color}25`,
                      borderRadius: 10,
                      padding: '20px 14px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: 12,
                    }}>
                      No deals
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <DealModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={(form) => createMutation.mutateAsync(form)}
      />
    </div>
  )
}
