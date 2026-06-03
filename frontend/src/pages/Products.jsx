import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Package, Trash2, Edit, Minus, AlertTriangle, Boxes, Warehouse, DollarSign } from 'lucide-react'
import api from '../api/axios'

const fetchProducts = async ({ search, category, status, lowStock }) => {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (category) params.set('category', category)
  if (status) params.set('status', status)
  if (lowStock) params.set('low_stock', 'true')
  const res = await api.get(`/products?${params}`)
  return res.data
}

const fetchProductStats = async () => {
  const res = await api.get('/products/stats')
  return res.data.stats
}

const fmtMoney = (n) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const StockBadge = ({ qty, reorder }) => {
  let cls = 'customer', label = 'In Stock'
  if (qty === 0) { cls = 'churned'; label = 'Out of Stock' }
  else if (qty <= reorder) { cls = 'lead'; label = 'Low Stock' }
  return <span className={`badge badge-${cls}`}>{label}</span>
}

const ProductModal = ({ open, onClose, onSave, initial }) => {
  const [form, setForm] = useState(initial || {
    name: '', sku: '', category: 'apparel', description: '', size: '', color: '',
    unit_price: '', currency: 'USD', stock_quantity: '', reorder_level: 10,
    warehouse: 'Main Warehouse', status: 'active', supplier: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSave({
        ...form,
        unit_price: parseFloat(form.unit_price) || 0,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        reorder_level: parseInt(form.reorder_level) || 10
      })
      onClose()
    } catch (err) {
      setError(err?.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{initial ? 'Edit Product' : 'Add New Product'}</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: 'var(--accent-danger)', fontSize: 13 }}>
                {error}
              </div>
            )}
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">Product Name *</label>
                <input className="input" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required placeholder="Classic Cotton T-Shirt" />
              </div>
              <div className="input-group">
                <label className="input-label">SKU *</label>
                <input className="input" value={form.sku} onChange={e => setForm(p => ({...p, sku: e.target.value}))} required placeholder="APP-TS-001" />
              </div>
              <div className="input-group">
                <label className="input-label">Category</label>
                <select className="select" value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}>
                  <option value="apparel">Apparel</option>
                  <option value="outerwear">Outerwear</option>
                  <option value="footwear">Footwear</option>
                  <option value="accessories">Accessories</option>
                  <option value="textile">Textile</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Status</label>
                <select className="select" value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                  <option value="active">Active</option>
                  <option value="discontinued">Discontinued</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Size</label>
                <input className="input" value={form.size} onChange={e => setForm(p => ({...p, size: e.target.value}))} placeholder="M, 42, One Size..." />
              </div>
              <div className="input-group">
                <label className="input-label">Color</label>
                <input className="input" value={form.color} onChange={e => setForm(p => ({...p, color: e.target.value}))} placeholder="White, Blue..." />
              </div>
              <div className="input-group">
                <label className="input-label">Unit Price (USD)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.unit_price} onChange={e => setForm(p => ({...p, unit_price: e.target.value}))} placeholder="4.50" />
              </div>
              <div className="input-group">
                <label className="input-label">Stock Quantity</label>
                <input className="input" type="number" min="0" value={form.stock_quantity} onChange={e => setForm(p => ({...p, stock_quantity: e.target.value}))} placeholder="1200" />
              </div>
              <div className="input-group">
                <label className="input-label">Reorder Level</label>
                <input className="input" type="number" min="0" value={form.reorder_level} onChange={e => setForm(p => ({...p, reorder_level: e.target.value}))} placeholder="200" />
              </div>
              <div className="input-group">
                <label className="input-label">Warehouse</label>
                <input className="input" value={form.warehouse} onChange={e => setForm(p => ({...p, warehouse: e.target.value}))} placeholder="Main Warehouse" />
              </div>
              <div className="input-group">
                <label className="input-label">Supplier</label>
                <input className="input" value={form.supplier} onChange={e => setForm(p => ({...p, supplier: e.target.value}))} placeholder="Toshkent Textile Ltd" />
              </div>
              <div className="input-group full-width">
                <label className="input-label">Description</label>
                <textarea className="textarea" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Product details..." />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : initial ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18 }}>
    <div style={{
      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `${color}1f`, color
    }}>
      <Icon size={20} />
    </div>
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  </div>
)

export default function Products() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [lowStock, setLowStock] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, category, status, lowStock],
    queryFn: () => fetchProducts({ search, category, status, lowStock })
  })

  const { data: stats } = useQuery({
    queryKey: ['product-stats'],
    queryFn: fetchProductStats
  })

  const invalidate = () => {
    qc.invalidateQueries(['products'])
    qc.invalidateQueries(['product-stats'])
  }

  const createMutation = useMutation({
    mutationFn: (form) => api.post('/products', form),
    onSuccess: invalidate
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...form }) => api.put(`/products/${id}`, form),
    onSuccess: invalidate
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: invalidate
  })
  const stockMutation = useMutation({
    mutationFn: ({ id, adjustment }) => api.patch(`/products/${id}/stock`, { adjustment }),
    onSuccess: invalidate
  })

  const handleSave = async (form) => {
    if (editProduct) {
      await updateMutation.mutateAsync({ id: editProduct.id, ...form })
    } else {
      await createMutation.mutateAsync(form)
    }
    setEditProduct(null)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this product?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  const adjustStock = (id, adjustment) => stockMutation.mutate({ id, adjustment })

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Products</div>
          <div className="page-subtitle">{data?.total || 0} products in inventory</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditProduct(null); setModalOpen(true) }}>
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Inventory stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
        <StatCard icon={Boxes} label="Total Products" value={stats?.total ?? '—'} color="#6c63ff" />
        <StatCard icon={Warehouse} label="Units in Stock" value={stats ? Number(stats.total_units).toLocaleString() : '—'} color="#10b981" />
        <StatCard icon={AlertTriangle} label="Low / Out of Stock" value={stats ? (Number(stats.low_stock) + Number(stats.out_of_stock)) : '—'} color="#f59e0b" />
        <StatCard icon={DollarSign} label="Inventory Value" value={stats ? fmtMoney(stats.inventory_value) : '—'} color="#3b82f6" />
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            className="input"
            placeholder="Search by name, SKU, supplier..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="select" style={{ width: 'auto', minWidth: 130 }} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          <option value="apparel">Apparel</option>
          <option value="outerwear">Outerwear</option>
          <option value="footwear">Footwear</option>
          <option value="accessories">Accessories</option>
          <option value="textile">Textile</option>
          <option value="other">Other</option>
        </select>
        <select className="select" style={{ width: 'auto', minWidth: 130 }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="discontinued">Discontinued</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
        <button
          className={`btn ${lowStock ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setLowStock(v => !v)}
          title="Show only low / out of stock"
        >
          <AlertTriangle size={15} />
          Low Stock
        </button>
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
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Warehouse</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.products?.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(108,99,255,0.12)', color: 'var(--accent-primary)'
                        }}>
                          <Package size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {[p.size, p.color].filter(Boolean).join(' · ') || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: 13 }}>{p.sku}</span></td>
                    <td style={{ textTransform: 'capitalize', fontSize: 13, color: 'var(--text-secondary)' }}>{p.category}</td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{fmtMoney(p.unit_price)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button className="btn-icon" title="-10" onClick={() => adjustStock(p.id, -10)}>
                          <Minus size={13} />
                        </button>
                        <span style={{ fontWeight: 700, minWidth: 44, textAlign: 'center', fontSize: 14 }}>
                          {p.stock_quantity}
                        </span>
                        <button className="btn-icon" title="+10" onClick={() => adjustStock(p.id, 10)}>
                          <Plus size={13} />
                        </button>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.warehouse}</td>
                    <td><StockBadge qty={p.stock_quantity} reorder={p.reorder_level} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" title="Edit" onClick={() => { setEditProduct(p); setModalOpen(true) }}>
                          <Edit size={14} />
                        </button>
                        <button className="btn-icon" title="Delete" onClick={() => handleDelete(p.id)}
                          style={{ color: 'var(--accent-danger)' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data?.products || data.products.length === 0) && (
              <div className="empty-state">
                <p>No products found</p>
              </div>
            )}
          </div>
        )}
      </div>

      <ProductModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditProduct(null) }}
        onSave={handleSave}
        initial={editProduct}
      />
    </div>
  )
}
