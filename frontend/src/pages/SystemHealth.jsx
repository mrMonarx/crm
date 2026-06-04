import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Cpu, Server, Zap, Box, Gauge, PlayCircle, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import api from '../api/axios'

const fetchHealth = async () => {
  const res = await api.get('/system/health')
  return res.data
}

// Instance (konteyner) ranglar paleti
const COLORS = ['#6c63ff', '#10d98c', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899']
const colorFor = (id, map) => {
  if (!map[id]) map[id] = COLORS[Object.keys(map).length % COLORS.length]
  return map[id]
}

const MetricCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="card" style={{ padding: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 42, height: 42, borderRadius: 11, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${color}1f`, color
      }}>
        <Icon size={20} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
      </div>
    </div>
    {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>{sub}</div>}
  </div>
)

export default function SystemHealth() {
  const colorMapRef = useRef({})
  const [testing, setTesting] = useState(false)
  const [progress, setProgress] = useState(0)
  // Har bir instance nechta so'rovga javob berdi (load balancing taqsimoti)
  const [distribution, setDistribution] = useState({})
  const [totalRequests, setTotalRequests] = useState(0)
  const [lastRunMs, setLastRunMs] = useState(null)

  const { data: health, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['system-health'],
    queryFn: fetchHealth,
    refetchInterval: 3000 // har 3 soniyada yangilanadi
  })

  // High-load simulyatsiya: ko'p parallel so'rov yuboramiz va
  // har birini QAYSI instance qayta ishlaganini sanaymiz.
  const runLoadTest = async (totalReq = 60, concurrency = 12) => {
    setTesting(true)
    setProgress(0)
    setDistribution({})
    setTotalRequests(0)
    const dist = {}
    let done = 0
    const start = performance.now()

    const worker = async () => {
      while (done < totalReq) {
        const myIndex = done++
        if (myIndex >= totalReq) break
        try {
          const res = await api.get('/system/load-test?work=8000000')
          const inst = res.data.instance || 'unknown'
          dist[inst] = (dist[inst] || 0) + 1
          setDistribution({ ...dist })
          setTotalRequests(Object.values(dist).reduce((a, b) => a + b, 0))
        } catch (e) { /* ignore individual failures */ }
        setProgress(Math.round((Object.values(dist).reduce((a, b) => a + b, 0) / totalReq) * 100))
      }
    }

    await Promise.all(Array.from({ length: concurrency }, worker))
    setLastRunMs(Math.round(performance.now() - start))
    setTesting(false)
    refetch()
  }

  const chartData = Object.entries(distribution).map(([instance, count]) => ({
    instance: instance.slice(0, 12),
    fullId: instance,
    requests: count
  }))

  const instanceCount = Object.keys(distribution).length

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">System Health</div>
          <div className="page-subtitle">Live infrastructure · auto-scaling & load balancing monitor</div>
        </div>
        <button className="btn btn-secondary" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={15} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Live instance metrics */}
      {isLoading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 22 }}>
          <MetricCard icon={Box} label="Serving Instance" value={health?.instance?.slice(0, 10) || '—'}
            sub={`PID: ${health?.pid} · Node ${health?.node_version}`} color="#6c63ff" />
          <MetricCard icon={Cpu} label="CPU Cores" value={health?.cpu_count ?? '—'}
            sub={`Load avg (1m): ${health?.load_average?.['1m'] ?? '—'}`} color="#10d98c" />
          <MetricCard icon={Gauge} label="Memory Used" value={`${health?.memory?.used_mb ?? '—'} MB`}
            sub={`Process: ${health?.memory?.process_mb ?? '—'} MB`} color="#f59e0b" />
          <MetricCard icon={Activity} label="Requests Handled" value={health?.request_count ?? '—'}
            sub={`Uptime: ${health?.uptime_seconds ?? 0}s`} color="#3b82f6" />
        </div>
      )}

      {/* Load balancing demo */}
      <div className="card" style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={18} style={{ color: 'var(--accent-primary)' }} />
              Load Balancing Simulation
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Sends 60 concurrent CPU-heavy requests and shows how the load balancer distributes them across backend instances.
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => runLoadTest(60, 12)} disabled={testing}>
            <PlayCircle size={16} />
            {testing ? `Running... ${progress}%` : 'Simulate High Load'}
          </button>
        </div>

        {/* Progress bar */}
        {(testing || totalRequests > 0) && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                width: `${progress}%`, height: '100%',
                background: 'var(--gradient-primary)', transition: 'width 0.3s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              <span>{totalRequests} / 60 requests processed</span>
              <span>
                {instanceCount} instance{instanceCount !== 1 ? 's' : ''} responding
                {lastRunMs && !testing ? ` · finished in ${lastRunMs} ms` : ''}
              </span>
            </div>
          </div>
        )}

        {/* Distribution chart */}
        {chartData.length > 0 && (
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="instance" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10 }}
                  formatter={(v) => [`${v} requests`, 'Handled']}
                />
                <Bar dataKey="requests" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.fullId} fill={colorFor(entry.fullId, colorMapRef.current)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Instance legend */}
        {chartData.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
            {chartData.map(d => (
              <div key={d.fullId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: colorFor(d.fullId, colorMapRef.current) }} />
                <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{d.fullId}</span>
                <span style={{ color: 'var(--text-muted)' }}>— {d.requests} req</span>
              </div>
            ))}
          </div>
        )}

        {chartData.length === 0 && !testing && (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <Server size={32} style={{ color: 'var(--text-muted)', marginBottom: 10 }} />
            <p>Click "Simulate High Load" to see live request distribution across backend instances.</p>
          </div>
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        <strong>Tip:</strong> With one backend instance, all requests show a single bar. After scaling
        (<code>docker compose up --scale backend=3</code>), requests spread across multiple bars —
        visual proof of load balancing and horizontal auto-scaling.
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
