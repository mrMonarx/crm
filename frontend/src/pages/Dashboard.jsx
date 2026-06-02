import { useQuery } from '@tanstack/react-query'
import { Users, Briefcase, CheckSquare, TrendingUp, DollarSign, Clock, Activity } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { format } from 'date-fns'
import api from '../api/axios'

const fetchStats = async () => {
  const [stats, activities, topDeals] = await Promise.all([
    api.get('/dashboard/stats'),
    api.get('/dashboard/activities'),
    api.get('/dashboard/top-deals'),
  ])
  return {
    stats: stats.data,
    activities: activities.data.activities,
    topDeals: topDeals.data.deals,
  }
}

const activityIcons = {
  call: '📞', email: '📧', meeting: '🤝', note: '📝',
  task_completed: '✅', deal_updated: '💼', customer_added: '👤'
}

const activityColors = {
  call: '#3b82f6', email: '#6c63ff', meeting: '#10d98c',
  note: '#f59e0b', task_completed: '#10d98c', deal_updated: '#8b5cf6', customer_added: '#3b82f6'
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 10, padding: '12px 16px', fontSize: 13,
      }}>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color, fontWeight: 600 }}>
            ${Number(p.value || 0).toLocaleString()}
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: fetchStats })

  if (isLoading) return (
    <div className="loading">
      <div className="spinner" />
    </div>
  )

  const { stats, activities, topDeals } = data

  const monthlyData = (stats.monthly_revenue || []).map(m => ({
    month: format(new Date(m.month), 'MMM'),
    revenue: parseFloat(m.revenue) || 0,
    deals: parseInt(m.deals_count) || 0,
  }))

  const statCards = [
    {
      label: 'Total Customers',
      value: stats.customers?.total || 0,
      sub: `+${stats.customers?.new_this_month || 0} this month`,
      icon: Users,
      color: '#6c63ff',
      bg: 'rgba(108,99,255,0.12)'
    },
    {
      label: 'Active Deals',
      value: stats.deals?.active || 0,
      sub: `$${Number(stats.deals?.pipeline_value || 0).toLocaleString()} pipeline`,
      icon: Briefcase,
      color: '#10d98c',
      bg: 'rgba(16,217,140,0.12)'
    },
    {
      label: 'Revenue Won',
      value: `$${Number(stats.deals?.total_revenue || 0).toLocaleString()}`,
      sub: `${stats.deals?.won || 0} deals closed`,
      icon: DollarSign,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.12)'
    },
    {
      label: 'Pending Tasks',
      value: stats.tasks?.pending || 0,
      sub: `${stats.tasks?.overdue || 0} overdue`,
      icon: CheckSquare,
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.12)'
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Overview</div>
          <div className="page-subtitle">Welcome back — here's what's happening today.</div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        {statCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="card stat-card">
            <div className="stat-card-icon" style={{ background: bg }}>
              <Icon size={20} color={color} />
            </div>
            <div className="stat-card-value">{value}</div>
            <div className="stat-card-label">{label}</div>
            <div className="stat-card-change" style={{ color }}>
              <TrendingUp size={12} />
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, marginBottom: 20 }}>
        {/* Revenue Chart */}
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
            Monthly Revenue
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#9090aa', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9090aa', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#6c63ff" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ height: 220 }}>
              <p>No revenue data yet</p>
            </div>
          )}
        </div>

        {/* Top Deals */}
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
            Top Deals
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topDeals?.slice(0, 5).map(deal => (
              <div key={deal.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px',
                background: 'var(--bg-input)',
                borderRadius: 10,
              }}>
                <div style={{
                  width: 36, height: 36,
                  background: 'rgba(108,99,255,0.15)',
                  borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Briefcase size={16} color="#6c63ff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {deal.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{deal.customer_name}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#10d98c', flexShrink: 0 }}>
                  ${Number(deal.value).toLocaleString()}
                </div>
              </div>
            ))}
            {(!topDeals || topDeals.length === 0) && (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0', fontSize: 14 }}>
                No active deals
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="card">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
          Recent Activities
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {activities?.slice(0, 8).map((activity, i) => (
            <div key={activity.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: '14px 0',
              borderBottom: i < 7 ? '1px solid var(--border-color)' : 'none',
            }}>
              <div style={{
                width: 32, height: 32,
                background: `${activityColors[activity.type]}20`,
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, flexShrink: 0,
              }}>
                {activityIcons[activity.type] || '📌'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{activity.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {activity.customer_name && `${activity.customer_name} · `}
                  {activity.user_name && `by ${activity.user_name} · `}
                  {format(new Date(activity.created_at), 'MMM d, HH:mm')}
                </div>
              </div>
            </div>
          ))}
          {(!activities || activities.length === 0) && (
            <div className="empty-state">
              <Activity size={40} />
              <p>No recent activities</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
