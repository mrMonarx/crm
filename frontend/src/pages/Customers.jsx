import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Mail, Phone, Building2, Eye, Trash2, Edit } from 'lucide-react'
import api from '../api/axios'

const fetchCustomers = async ({ search, status }) => {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (status) params.set('status', status)
  const res = await api.get(`/customers?${params}`)
  return res.data
}

const StatusBadge = ({ status }) => (
  <span className={`badge badge-${status}`}>{status}</span>
)

const CustomerModal = ({ open, onClose, onSave, initial }) => {
  const [form, setForm] = useState(initial || {
    name: '', email: '', phone: '', company: '', position: '', status: 'lead', source: '', notes: ''
  })
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(form)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{initial ? 'Edit Customer' : 'Add New Customer'}</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">Full Name *</label>
                <input className="input" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required placeholder="John Smith" />
              </div>
              <div className="input-group">
                <label className="input-label">Email</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="john@company.com" />
              </div>
              <div className="input-group">
                <label className="input-label">Phone</label>
                <input className="input" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} placeholder="+998 90 123 45 67" />
              </div>
              <div className="input-group">
                <label className="input-label">Company</label>
                <input className="input" value={form.company} onChange={e => setForm(p => ({...p, company: e.target.value}))} placeholder="Company Ltd." />
              </div>
              <div className="input-group">
                <label className="input-label">Position</label>
                <input className="input" value={form.position} onChange={e => setForm(p => ({...p, position: e.target.value}))} placeholder="CEO, Manager..." />
              </div>
              <div className="input-group">
                <label className="input-label">Status</label>
                <select className="select" value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                  <option value="lead">Lead</option>
                  <option value="prospect">Prospect</option>
                  <option value="customer">Customer</option>
                  <option value="churned">Churned</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Source</label>
                <select className="select" value={form.source} onChange={e => setForm(p => ({...p, source: e.target.value}))}>
                  <option value="">Select source</option>
                  <option value="referral">Referral</option>
                  <option value="website">Website</option>
                  <option value="social_media">Social Media</option>
                  <option value="cold_call">Cold Call</option>
                  <option value="exhibition">Exhibition</option>
                </select>
              </div>
              <div className="input-group full-width">
                <label className="input-label">Notes</label>
                <textarea className="textarea" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Any additional notes..." />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : initial ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Customers() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState(null)
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, status],
    queryFn: () => fetchCustomers({ search, status })
  })

  const createMutation = useMutation({
    mutationFn: (form) => api.post('/customers', form),
    onSuccess: () => qc.invalidateQueries(['customers'])
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...form }) => api.put(`/customers/${id}`, form),
    onSuccess: () => qc.invalidateQueries(['customers'])
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/customers/${id}`),
    onSuccess: () => qc.invalidateQueries(['customers'])
  })

  const handleSave = async (form) => {
    if (editCustomer) {
      await updateMutation.mutateAsync({ id: editCustomer.id, ...form })
    } else {
      await createMutation.mutateAsync(form)
    }
    setEditCustomer(null)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this customer?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Customers</div>
          <div className="page-subtitle">{data?.total || 0} total contacts</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditCustomer(null); setModalOpen(true) }}>
          <Plus size={16} />
          Add Customer
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            className="input"
            placeholder="Search by name, email, company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="select" style={{ width: 'auto', minWidth: 130 }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="lead">Lead</option>
          <option value="prospect">Prospect</option>
          <option value="customer">Customer</option>
          <option value="churned">Churned</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.customers?.map(customer => (
                  <tr key={customer.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar avatar-sm">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{customer.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{customer.position}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <Building2 size={13} />
                        {customer.company || '—'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {customer.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                            <Mail size={11} />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                            <Phone size={11} />
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td><StatusBadge status={customer.status} /></td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {customer.source?.replace('_', ' ') || '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" title="View" onClick={() => navigate(`/customers/${customer.id}`)}>
                          <Eye size={14} />
                        </button>
                        <button className="btn-icon" title="Edit" onClick={() => { setEditCustomer(customer); setModalOpen(true) }}>
                          <Edit size={14} />
                        </button>
                        <button className="btn-icon" title="Delete" onClick={() => handleDelete(customer.id)}
                          style={{ color: 'var(--accent-danger)' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data?.customers || data.customers.length === 0) && (
              <div className="empty-state">
                <p>No customers found</p>
              </div>
            )}
          </div>
        )}
      </div>

      <CustomerModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditCustomer(null) }}
        onSave={handleSave}
        initial={editCustomer}
      />
    </div>
  )
}
