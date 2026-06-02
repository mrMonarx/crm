import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Mail, Phone, Building2, MapPin, Tag, Briefcase, CheckSquare, Activity } from 'lucide-react'
import { format } from 'date-fns'
import api from '../api/axios'

const fetchCustomer = async (id) => {
  const res = await api.get(`/customers/${id}`)
  return res.data
}

const activityIcons = { call:'📞', email:'📧', meeting:'🤝', note:'📝', task_completed:'✅', deal_updated:'💼', customer_added:'👤' }

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ['customer', id], queryFn: () => fetchCustomer(id) })

  if (isLoading) return <div className="loading"><div className="spinner" /></div>
  if (!data) return <div>Customer not found</div>

  const { customer, deals, activities, tasks } = data

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button className="btn-icon" onClick={() => navigate('/customers')}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <div className="page-title">{customer.name}</div>
          <div className="page-subtitle">{customer.company} · {customer.position}</div>
        </div>
        <span className={`badge badge-${customer.status}`} style={{ marginLeft: 'auto' }}>
          {customer.status}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
        {/* Left: Info Card */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="avatar" style={{ width: 56, height: 56, fontSize: 22, marginBottom: 16 }}>
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{customer.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, marginBottom: 20 }}>
              {customer.position} {customer.company && `at ${customer.company}`}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {customer.email && (
                <div className="info-row">
                  <Mail size={14} style={{ color: 'var(--accent-primary)' }} />
                  {customer.email}
                </div>
              )}
              {customer.phone && (
                <div className="info-row">
                  <Phone size={14} style={{ color: 'var(--accent-success)' }} />
                  {customer.phone}
                </div>
              )}
              {customer.company && (
                <div className="info-row">
                  <Building2 size={14} style={{ color: 'var(--accent-warning)' }} />
                  {customer.company}
                </div>
              )}
              {customer.source && (
                <div className="info-row">
                  <Tag size={14} style={{ color: 'var(--text-muted)' }} />
                  Source: {customer.source.replace('_', ' ')}
                </div>
              )}
            </div>

            {customer.notes && (
              <>
                <div className="divider" />
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {customer.notes}
                </div>
              </>
            )}
          </div>

          {/* Tasks */}
          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckSquare size={16} color="var(--accent-primary)" />
              Tasks ({tasks?.length || 0})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tasks?.map(task => (
                <div key={task.id} style={{
                  padding: '10px 12px',
                  background: 'var(--bg-input)',
                  borderRadius: 8,
                  border: '1px solid var(--border-color)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{task.title}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <span className={`badge badge-${task.status}`}>{task.status}</span>
                    <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                  </div>
                </div>
              ))}
              {(!tasks || tasks.length === 0) && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No tasks</div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Deals + Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Deals */}
          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Briefcase size={16} color="var(--accent-success)" />
              Deals ({deals?.length || 0})
            </div>
            {deals?.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {deals.map(deal => (
                  <div key={deal.id} style={{
                    padding: '16px', background: 'var(--bg-input)',
                    borderRadius: 12, border: '1px solid var(--border-color)',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{deal.title}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-success)', marginBottom: 8 }}>
                      ${Number(deal.value).toLocaleString()}
                    </div>
                    <span className={`badge badge-${deal.stage}`}>{deal.stage.replace('_', ' ')}</span>
                    {deal.expected_close_date && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                        Close: {format(new Date(deal.expected_close_date), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No deals yet</div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} color="var(--accent-info)" />
              Activity Timeline
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activities?.map((act, i) => (
                <div key={act.id} style={{
                  display: 'flex', gap: 14,
                  paddingBottom: i < activities.length - 1 ? 16 : 0,
                  marginBottom: i < activities.length - 1 ? 16 : 0,
                  borderBottom: i < activities.length - 1 ? '1px solid var(--border-color)' : 'none',
                }}>
                  <div style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>
                    {activityIcons[act.type] || '📌'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{act.title}</div>
                    {act.description && (
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{act.description}</div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                      {act.user_name && `${act.user_name} · `}
                      {format(new Date(act.created_at), 'MMM d, yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
              {(!activities || activities.length === 0) && (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0', fontSize: 13 }}>
                  No activities yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
