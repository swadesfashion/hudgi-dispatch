'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { format } from 'date-fns'

// ── Types ──────────────────────────────────────────────────────
interface Dispatch {
  id: string
  barcode: string
  dispatch_date: string
  weight_grams: number
  length_cm: number
  breadth_cm: number
  height_cm: number
  cod_type: string
  cod_value: number
  label_printed: boolean
  ip_exported: boolean
}

interface Order {
  id: string
  order_no: string
  customer_name: string
  phone: string
  address1: string
  address2: string
  city: string
  pincode: string
  state: string
  product_name: string
  total: number
  channel: string
  import_date: string
  shopify_created_at: string
  dispatches: Dispatch[]
}

type Tab = 'import' | 'scan' | 'orders' | 'export'

// ── Helpers ────────────────────────────────────────────────────
function todayISO() { return new Date().toISOString().slice(0, 10) }

function orderStatus(order: Order) {
  const d = order.dispatches?.[0]
  if (!d) return 'new'
  if (d.ip_exported) return 'exported'
  if (d.barcode) return 'scanned'
  return 'pending'
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: 'badge-new', scanned: 'badge-scanned',
    exported: 'badge-exported', pending: 'badge-pending',
  }
  return <span className={`badge ${map[status] || 'badge-pending'}`}>{status}</span>
}

// ── Main Dashboard ─────────────────────────────────────────────
export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>('orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [filterDate, setFilterDate] = useState(todayISO())
  const [search, setSearch] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterDate) params.set('date', filterDate)
    if (search)     params.set('search', search)
    const res = await fetch(`/api/orders?${params}`)
    const data = await res.json()
    setOrders(data.orders || [])
    setLoading(false)
  }, [filterDate, search])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'orders',  label: 'Orders',       icon: '◈' },
    { id: 'scan',    label: 'Scan barcodes', icon: '⊞' },
    { id: 'import',  label: 'Import CSV',    icon: '↑' },
    { id: 'export',  label: 'Export',        icon: '↓' },
  ]

  const todayOrders  = orders.filter(o => orderStatus(o) !== 'new')
  const scannedCount = orders.filter(o => ['scanned','exported'].includes(orderStatus(o))).length
  const totalCount   = orders.length

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        background: 'var(--ink)', color: 'white',
        padding: '0 24px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        height: '56px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 300 }}>
            Hudgi <em>Dispatch</em>
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)',
            fontFamily: 'var(--font-mono)' }}>
            {format(new Date(), 'dd MMM yyyy')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <StatPill label="Today's orders" value={totalCount} />
          <StatPill label="Scanned" value={scannedCount} accent />
          <button
            onClick={() => { document.cookie = 'dispatch_session=; max-age=0; path=/'; location.href = '/login' }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            sign out
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar nav */}
        <nav style={{
          width: '180px', flexShrink: 0,
          background: 'var(--surface)', borderRight: '1px solid var(--border)',
          padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '2px',
        }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 20px', border: 'none', background: 'none',
                cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                color: tab === t.id ? 'var(--accent)' : 'var(--muted)',
                borderLeft: `3px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
                transition: 'all 0.15s', textAlign: 'left',
              }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px' }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {tab === 'orders' && (
            <OrdersTab
              orders={orders} loading={loading}
              filterDate={filterDate} setFilterDate={setFilterDate}
              search={search} setSearch={setSearch}
              onRefresh={fetchOrders}
            />
          )}
          {tab === 'scan' && (
            <ScanTab orders={orders} onSaved={fetchOrders} filterDate={filterDate} />
          )}
          {tab === 'import' && <ImportTab onImported={() => { fetchOrders(); setTab('scan') }} />}
          {tab === 'export' && <ExportTab orders={orders} filterDate={filterDate} />}
        </main>
      </div>
    </div>
  )
}

function StatPill({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{
        fontSize: '18px', fontFamily: 'var(--font-mono)', fontWeight: 500,
        color: accent ? '#f97316' : 'white',
      }}>{value}</div>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)',
        fontFamily: 'var(--font-mono)' }}>{label}</div>
    </div>
  )
}

// ── ORDERS TAB ─────────────────────────────────────────────────
function OrdersTab({ orders, loading, filterDate, setFilterDate, search, setSearch, onRefresh }:
  { orders: Order[], loading: boolean, filterDate: string, setFilterDate: (d: string) => void,
    search: string, setSearch: (s: string) => void, onRefresh: () => void }) {

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 300 }}>
          Orders
        </h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            style={{ fontSize: '13px', padding: '7px 10px' }} />
          <input type="text" placeholder="Search name, order#, city…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ fontSize: '13px', padding: '7px 10px', width: '220px' }} />
          <button className="btn btn-ghost" onClick={onRefresh} style={{ fontSize: '13px' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)',
          fontFamily: 'var(--font-mono)', fontSize: '13px' }}>Loading…</div>
      ) : orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>◈</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
            No orders for this date. Import a CSV to get started.
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>City</th>
                  <th>Product</th>
                  <th>Barcode</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const d = o.dispatches?.[0]
                  const status = orderStatus(o)
                  return (
                    <tr key={o.id}>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px',
                          fontWeight: 500, color: 'var(--accent)' }}>{o.order_no}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{o.customer_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)',
                          fontFamily: 'var(--font-mono)' }}>{o.phone}</div>
                      </td>
                      <td>
                        <div>{o.city}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{o.pincode}</div>
                      </td>
                      <td style={{ maxWidth: '180px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--muted)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {o.product_name}
                        </div>
                      </td>
                      <td>
                        {d?.barcode
                          ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px',
                              color: 'var(--success)' }}>{d.barcode}</span>
                          : <span style={{ color: 'var(--border)', fontSize: '12px' }}>—</span>}
                      </td>
                      <td><StatusBadge status={status} /></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                        ₹{o.total?.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SCAN TAB ───────────────────────────────────────────────────
function ScanTab({ orders, onSaved, filterDate }:
  { orders: Order[], onSaved: () => void, filterDate: string }) {

  const [scanValue, setScanValue] = useState('')
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [weight, setWeight] = useState('250')
  const [codType, setCodType] = useState('')
  const [codValue, setCodValue] = useState('0')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [error, setError] = useState('')
  const scanRef = useRef<HTMLInputElement>(null)

  // Keep scan field focused
  useEffect(() => { scanRef.current?.focus() }, [])

  // Find next unscanned order
  const unscanned = orders.filter(o => !o.dispatches?.[0]?.barcode)
  const scanned   = orders.filter(o =>  o.dispatches?.[0]?.barcode)

  // Auto-select first unscanned when orders change
  useEffect(() => {
    if (!activeOrder && unscanned.length > 0) setActiveOrder(unscanned[0])
  }, [orders])

  async function handleScan(e: React.FormEvent) {
    e.preventDefault()
    if (!scanValue.trim() || !activeOrder) return
    setSaving(true); setError('')

    const res = await fetch('/api/save-barcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: activeOrder.id,
        order_no: activeOrder.order_no,
        barcode: scanValue.trim(),
        weight_grams: parseInt(weight) || 250,
        cod_type: codType,
        cod_value: parseFloat(codValue) || 0,
        dispatch_date: filterDate,
      }),
    })

    if (res.ok) {
      setLastSaved(`${activeOrder.order_no} → ${scanValue.trim()}`)
      setScanValue('')
      onSaved()
      // Move to next unscanned
      const idx = unscanned.findIndex(o => o.id === activeOrder.id)
      const next = unscanned[idx + 1] || null
      setActiveOrder(next)
      setTimeout(() => scanRef.current?.focus(), 100)
    } else {
      const d = await res.json()
      setError(d.error || 'Save failed')
    }
    setSaving(false)
  }

  return (
    <div style={{ maxWidth: '900px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px',
        fontWeight: 300, marginBottom: '6px' }}>Scan barcodes</h2>
      <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '24px' }}>
        Select an order, then scan the India Post barcode sticker. One scan = saved everywhere.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px',
        marginBottom: '24px' }}>
        {/* Scan panel */}
        <div className="card">
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--muted)',
            fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
            textTransform: 'uppercase', marginBottom: '12px' }}>
            Active order
          </div>

          {activeOrder ? (
            <div style={{ marginBottom: '16px', padding: '12px',
              background: 'rgba(200,75,49,0.05)', borderRadius: '6px',
              border: '1px solid rgba(200,75,49,0.15)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500,
                color: 'var(--accent)', fontSize: '15px', marginBottom: '4px' }}>
                {activeOrder.order_no}
              </div>
              <div style={{ fontWeight: 500 }}>{activeOrder.customer_name}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {activeOrder.city}, {activeOrder.state} – {activeOrder.pincode}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                {activeOrder.product_name}
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px', background: '#d1fae5', borderRadius: '6px',
              color: '#065f46', fontSize: '13px', marginBottom: '16px' }}>
              ✓ All orders scanned for today!
            </div>
          )}

          <form onSubmit={handleScan}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 500,
              color: 'var(--muted)', fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
              Scan / type barcode
            </label>
            <input
              ref={scanRef}
              className="scan-input"
              type="text"
              value={scanValue}
              onChange={e => setScanValue(e.target.value)}
              placeholder="Scan IP barcode…"
              disabled={!activeOrder || saving}
              autoComplete="off"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
              marginTop: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--muted)',
                  fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                  letterSpacing: '0.06em' }}>Weight (g)</label>
                <input type="number" value={weight}
                  onChange={e => setWeight(e.target.value)}
                  style={{ width: '100%', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--muted)',
                  fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                  letterSpacing: '0.06em' }}>COD amount (₹)</label>
                <input type="number" value={codValue}
                  onChange={e => setCodValue(e.target.value)}
                  style={{ width: '100%', marginTop: '4px' }} />
              </div>
            </div>
            {error && <div style={{ color: 'var(--accent)', fontSize: '12px',
              fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>{error}</div>}
            <button type="submit" className="btn btn-primary"
              disabled={!scanValue.trim() || !activeOrder || saving}
              style={{ width: '100%', justifyContent: 'center' }}>
              {saving ? 'Saving…' : '⊞ Save & next →'}
            </button>
          </form>

          {lastSaved && (
            <div style={{ marginTop: '12px', padding: '8px 10px',
              background: '#d1fae5', borderRadius: '6px',
              fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#065f46' }}>
              ✓ Saved: {lastSaved}
            </div>
          )}
        </div>

        {/* Order picker */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)',
            fontSize: '11px', fontWeight: 500, color: 'var(--muted)',
            fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {unscanned.length} remaining · {scanned.length} done
          </div>
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {orders.map(o => {
              const d = o.dispatches?.[0]
              const done = !!d?.barcode
              const isActive = activeOrder?.id === o.id
              return (
                <div key={o.id}
                  onClick={() => !done && setActiveOrder(o)}
                  style={{
                    padding: '10px 16px', cursor: done ? 'default' : 'pointer',
                    borderBottom: '1px solid rgba(212,205,196,0.4)',
                    background: isActive ? 'rgba(200,75,49,0.06)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '8px', opacity: done ? 0.5 : 1,
                    transition: 'background 0.1s',
                  }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px',
                      fontWeight: 500, color: isActive ? 'var(--accent)' : 'var(--ink)' }}>
                      {o.order_no}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', marginLeft: '8px' }}>
                      {o.customer_name}
                    </span>
                  </div>
                  {done
                    ? <span style={{ fontSize: '11px', color: 'var(--success)',
                        fontFamily: 'var(--font-mono)' }}>✓ {d.barcode}</span>
                    : isActive
                      ? <span style={{ fontSize: '11px', color: 'var(--accent)',
                          fontFamily: 'var(--font-mono)' }}>◀ active</span>
                      : null}
                </div>
              )
            })}
            {orders.length === 0 && (
              <div style={{ padding: '24px', color: 'var(--muted)', fontSize: '13px',
                textAlign: 'center' }}>No orders. Import a CSV first.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── IMPORT TAB ─────────────────────────────────────────────────
function ImportTab({ onImported }: { onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const dropRef = useRef<HTMLDivElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.csv')) setFile(f)
  }

  async function handleImport() {
    if (!file) return
    setLoading(true); setError(''); setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/import-csv', { method: 'POST', body: fd })
    const data = await res.json()
    if (res.ok) {
      setResult(data)
      onImported()
    } else {
      setError(data.error || 'Import failed')
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '560px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px',
        fontWeight: 300, marginBottom: '6px' }}>Import Shopify CSV</h2>
      <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '24px' }}>
        Download the orders CSV from Shopify admin → Orders → Export. Then drag it here.
        Duplicate orders are automatically skipped.
      </p>

      <div className="card">
        {/* Drop zone */}
        <div
          ref={dropRef}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => document.getElementById('csv-input')?.click()}
          style={{
            border: `2px dashed ${file ? 'var(--success)' : 'var(--border)'}`,
            borderRadius: '8px', padding: '40px 24px', textAlign: 'center',
            cursor: 'pointer', marginBottom: '20px',
            background: file ? 'rgba(45,122,79,0.04)' : 'transparent',
            transition: 'all 0.2s',
          }}>
          <input id="csv-input" type="file" accept=".csv"
            style={{ display: 'none' }}
            onChange={e => setFile(e.target.files?.[0] || null)} />
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>
            {file ? '✓' : '↑'}
          </div>
          <div style={{ fontWeight: 500, marginBottom: '4px' }}>
            {file ? file.name : 'Drop CSV file here'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            {file
              ? `${(file.size / 1024).toFixed(1)} KB · click to change`
              : 'or click to browse'}
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '6px', padding: '10px 14px', marginBottom: '16px',
            color: '#991b1b', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: '6px', padding: '12px 16px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, color: '#065f46', marginBottom: '4px' }}>
              ✓ Import complete
            </div>
            <div style={{ fontSize: '13px', color: '#065f46', fontFamily: 'var(--font-mono)' }}>
              {result.imported} orders imported
              {result.skipped > 0 && ` · ${result.skipped} skipped (already exist)`}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
              Switched to Scan tab → assign barcodes to each order.
            </div>
          </div>
        )}

        <button className="btn btn-primary" disabled={!file || loading}
          onClick={handleImport}
          style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
          {loading ? 'Importing…' : '↑ Import orders'}
        </button>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)',
          fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: '10px' }}>How to export from Shopify</div>
        {[
          'Log in to Shopify admin',
          'Go to Orders (left sidebar)',
          'Filter by date / fulfilment status as needed',
          'Click Export → Current page or All orders → Export orders (CSV)',
          'Download the file and drag it here',
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px',
            fontSize: '13px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)',
              fontWeight: 500, flexShrink: 0 }}>{i + 1}.</span>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── EXPORT TAB ─────────────────────────────────────────────────
function ExportTab({ orders, filterDate }: { orders: Order[], filterDate: string }) {
  const [exporting, setExporting] = useState(false)
  const [printingLabels, setPrintingLabels] = useState(false)

  const dispatched = orders.filter(o => o.dispatches?.[0]?.barcode)
  const missing    = orders.filter(o => !o.dispatches?.[0]?.barcode)

  async function exportIndiaPost() {
    setExporting(true)
    const res  = await fetch(`/api/export-indiapost?date=${filterDate}`)
    const data = await res.json()
    if (!res.ok) { alert(data.error); setExporting(false); return }

    const rows: any[][] = data.dispatches.map((d: any, i: number) => [
      i + 1,
      d.barcode || '',
      d.weight_grams || 250,
      d.orders?.city || '',
      d.orders?.pincode || '',
      d.orders?.customer_name || '',
      d.orders?.phone || '',
      d.cod_type || '',
      d.cod_value || '',
      d.length_cm || 27,
      d.breadth_cm || 18,
      d.height_cm || 2,
    ])

    const header = [
      'SERIAL NUMBER', 'BARCODE NO', 'PHYSICAL WEIGHT GMS',
      'RECEIVER CITY', 'RECEIVER PINCODE', 'RECEIVER NAME', 'PHONE',
      'CODR/COD', 'VALUE FOR CoD Rs.', 'LENGTH cm', 'BREADTH cm', 'HEIGHT cm',
    ]

    // Build XLSX via SheetJS
    const XLSX = (window as any).XLSX
    if (!XLSX) { alert('SheetJS not loaded — refresh the page'); setExporting(false); return }

    const wb = XLSX.utils.book_new()
    const wsData = [header, ...rows]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Column widths
    ws['!cols'] = [8,20,12,18,12,24,14,10,12,10,10,10].map(w => ({ wch: w }))

    // Bold header row
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C })
      if (!ws[addr]) continue
      ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'D9EAD3' } } }
    }

    const tabName = format(new Date(filterDate + 'T00:00:00'), 'dd-MMM')
    XLSX.utils.book_append_sheet(wb, ws, tabName)

    const dateStr = filterDate.replace(/-/g, '')
    const orders_str = data.dispatches.length > 0
      ? data.dispatches.map((d: any) => d.order_no).join('-')
      : 'noorders'
    XLSX.writeFile(wb, `IndiaPost_${dateStr}.xlsx`)

    setExporting(false)
  }

  async function printLabels() {
    setPrintingLabels(true)
    const settings = await fetch('/api/orders?date=' + filterDate)
      .then(r => r.json()).catch(() => ({ orders: [] }))

    const html = generateLabelsHTML(dispatched, filterDate)
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
      setTimeout(() => w.print(), 600)
    }
    setPrintingLabels(false)
  }

  return (
    <div style={{ maxWidth: '680px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px',
        fontWeight: 300, marginBottom: '6px' }}>Export</h2>
      <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '24px' }}>
        Date: <strong>{filterDate}</strong> · {dispatched.length} orders ready ·{' '}
        {missing.length > 0 && <span style={{ color: 'var(--warn)' }}>
          {missing.length} still missing barcodes
        </span>}
      </p>

      {missing.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
          <div style={{ fontWeight: 500, color: 'var(--warn)', marginBottom: '6px',
            fontSize: '13px' }}>⚠ Missing barcodes</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {missing.map(o => (
              <span key={o.id} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px',
                background: '#fef3c7', padding: '2px 8px', borderRadius: '4px',
                color: '#92400e' }}>{o.order_no}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* India Post XLSX */}
        <div className="card">
          <div style={{ fontSize: '20px', marginBottom: '10px' }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>India Post XLSX</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px',
            lineHeight: 1.5 }}>
            Generates the official India Post format spreadsheet with date-wise sheet.
            Download → attach to email → send to post office.
          </div>
          <button className="btn btn-success" onClick={exportIndiaPost}
            disabled={exporting || dispatched.length === 0}
            style={{ width: '100%', justifyContent: 'center' }}>
            {exporting ? 'Generating…' : `↓ Download XLSX (${dispatched.length} orders)`}
          </button>
        </div>

        {/* Shipping Labels */}
        <div className="card">
          <div style={{ fontSize: '20px', marginBottom: '10px' }}>🖨</div>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>Shipping labels</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px',
            lineHeight: 1.5 }}>
            Opens a print-ready page with all shipping labels for today's dispatched orders.
            Print from browser (Ctrl+P / ⌘P).
          </div>
          <button className="btn btn-primary" onClick={printLabels}
            disabled={printingLabels || dispatched.length === 0}
            style={{ width: '100%', justifyContent: 'center' }}>
            {printingLabels ? 'Preparing…' : `⊞ Print labels (${dispatched.length})`}
          </button>
        </div>
      </div>

      {/* Summary table */}
      {dispatched.length > 0 && (
        <div className="card" style={{ marginTop: '20px', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)',
            fontSize: '11px', fontWeight: 500, color: 'var(--muted)',
            fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Ready to dispatch
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Order</th><th>Customer</th>
                <th>City</th><th>Barcode</th><th>Weight</th>
              </tr>
            </thead>
            <tbody>
              {dispatched.map((o, i) => {
                const d = o.dispatches[0]
                return (
                  <tr key={o.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)',
                      fontSize: '12px' }}>{i + 1}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 500,
                      color: 'var(--accent)' }}>{o.order_no}</td>
                    <td>{o.customer_name}</td>
                    <td>{o.city}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px',
                      color: 'var(--success)' }}>{d.barcode}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      {d.weight_grams}g</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Label HTML generator (client-side, no server needed) ───────
function generateLabelsHTML(orders: Order[], dateStr: string): string {
  const formatted = new Date(dateStr + 'T00:00:00')
    .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const labels = orders.map((o, idx) => {
    const d = o.dispatches[0]
    const addr = [o.address1, o.address2, o.city, o.state, o.pincode]
      .filter(Boolean).join(', ')
    return `
    <div class="label">
      <div class="lh">
        <div class="brand">The S.W.A.D.E.S Style</div>
        <div class="meta">${formatted} &nbsp;|&nbsp; Sl: ${idx + 1}</div>
      </div>
      <div class="to-sec">
        <div class="sec-title">TO</div>
        <div class="cname">${o.customer_name}</div>
        <div class="addr">${addr}</div>
        <div class="ph">Ph: ${o.phone}</div>
      </div>
      <div class="row2">
        <div class="bc-box">
          <div class="bc-num">${d.barcode}</div>
          <div class="bc-bars">${makeBars(d.barcode)}</div>
        </div>
        <div class="meta-box">
          <div><b>Order:</b> ${o.order_no}</div>
          <div><b>Wt:</b> ${d.weight_grams}g</div>
          <div><b>Dims:</b> ${d.length_cm}×${d.breadth_cm}×${d.height_cm}cm</div>
          ${d.cod_value > 0 ? `<div><b>COD:</b> ₹${d.cod_value}</div>` : ''}
        </div>
      </div>
      <div class="from-sec">
        <b>FROM:</b> The S.W.A.D.E.S Style, Bengaluru – 560001 &nbsp;|&nbsp; Ph: 9876543210
      </div>
    </div>`
  }).join('')

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Dispatch Labels – ${formatted}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;background:#f0f0f0}
.label{width:10cm;border:2px solid #000;margin:10px auto;background:#fff;
  page-break-after:always;padding:6px}
.lh{display:flex;justify-content:space-between;align-items:center;
  border-bottom:1px solid #000;padding-bottom:4px;margin-bottom:6px}
.brand{font-weight:bold;font-size:12px}
.meta{font-size:10px;color:#555}
.to-sec{border:1px solid #aaa;padding:5px;border-radius:3px;margin-bottom:6px}
.sec-title{font-weight:bold;font-size:9px;color:#888;text-transform:uppercase;margin-bottom:2px}
.cname{font-weight:bold;font-size:13px}
.addr{font-size:11px;line-height:1.4;margin-top:2px}
.ph{font-size:11px;margin-top:2px}
.row2{display:flex;gap:6px;margin-bottom:6px}
.bc-box{flex:1;border:1px solid #aaa;padding:4px;border-radius:3px;text-align:center}
.bc-num{font-family:monospace;font-size:11px;font-weight:bold;margin-bottom:2px}
.bc-bars svg{width:100%;height:36px}
.meta-box{flex:0 0 120px;border:1px solid #aaa;padding:4px;border-radius:3px;
  font-size:10px;line-height:1.7}
.from-sec{font-size:10px;color:#555;border-top:1px solid #ddd;padding-top:4px}
@media print{body{background:white}.label{margin:0;page-break-after:always}}
</style></head><body>${labels}
<script>window.onload=()=>{}</script>
</body></html>`
}

function makeBars(text: string): string {
  let x = 2, bars = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 36">'
  for (const ch of String(text)) {
    const code = ch.charCodeAt(0)
    for (let b = 0; b < 7; b++) {
      const w = ((code >> b) & 1) ? 2.2 : 1.1
      bars += `<rect x="${x.toFixed(1)}" y="1" width="${w}" height="34" fill="#000"/>`
      x += w + 0.6
      if (x > 196) break
    }
    x += 0.8
  }
  return bars + '</svg>'
}
