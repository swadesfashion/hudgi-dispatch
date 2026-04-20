import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Parse a Shopify CSV string into order rows
function parseShopifyCSV(text: string) {
  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  const lines: string[] = []
  let cur = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], nx = text[i + 1]
    if (inQ) {
      if (ch === '"' && nx === '"') { cur += '"'; i++ }
      else if (ch === '"') inQ = false
      else cur += ch
    } else {
      if (ch === '"') inQ = true
      else if (ch === '\n') { lines.push(cur); cur = '' }
      else cur += ch
    }
  }
  if (cur) lines.push(cur)

  function splitLine(line: string): string[] {
    const fields: string[] = []; let f = '', q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i], nx = line[i + 1]
      if (q) {
        if (ch === '"' && nx === '"') { f += '"'; i++ }
        else if (ch === '"') q = false
        else f += ch
      } else {
        if (ch === '"') q = true
        else if (ch === ',') { fields.push(f.trim()); f = '' }
        else f += ch
      }
    }
    fields.push(f.trim())
    return fields
  }

  if (lines.length < 2) return []
  const header = splitLine(lines[0]).map(h => h.toLowerCase().trim())
  const idx = (name: string) => header.indexOf(name)

  const iName      = idx('name')
  const iSName     = idx('shipping name')
  const iSAddr1    = idx('shipping address1')
  const iSAddr2    = idx('shipping address2')
  const iSCity     = idx('shipping city')
  const iSZip      = idx('shipping zip')
  const iSProvince = idx('shipping province name')
  const iSPhone    = idx('shipping phone')
  const iProduct   = idx('lineitem name')
  const iSubtotal  = idx('subtotal')
  const iShipping  = idx('shipping')
  const iTotal     = idx('total')
  const iPayment   = idx('payment method')
  const iCreated   = idx('created at')
  const iSource    = idx('source')

  const seen = new Set<string>()
  const orders: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const r = splitLine(lines[i])
    if (!r || !r[iName]) continue
    const orderNo = r[iName].trim()
    if (!orderNo || seen.has(orderNo)) continue
    seen.add(orderNo)

    const zip = String(r[iSZip] || '').replace(/^'/, '').trim()
    const phone = String(r[iSPhone] || '').replace(/^\+91/, '').trim()
    const createdRaw = r[iCreated] || ''
    let shopifyCreatedAt: string | null = null
    try {
      shopifyCreatedAt = createdRaw
        ? new Date(createdRaw.replace(' +0530', '+05:30').replace(' ', 'T')).toISOString()
        : null
    } catch { shopifyCreatedAt = null }

    orders.push({
      order_no:       orderNo,
      customer_name:  (r[iSName] || '').trim(),
      phone,
      address1:       (r[iSAddr1] || '').trim(),
      address2:       (r[iSAddr2] || '').trim(),
      city:           (r[iSCity] || '').trim(),
      pincode:        zip,
      state:          (r[iSProvince] || '').trim(),
      product_name:   (r[iProduct] || '').trim(),
      subtotal:       parseFloat(r[iSubtotal]) || 0,
      shipping:       parseFloat(r[iShipping]) || 0,
      total:          parseFloat(r[iTotal]) || 0,
      payment_method: (r[iPayment] || '').trim(),
      channel:        (r[iSource] || 'shopify').trim(),
      shopify_created_at: shopifyCreatedAt,
    })
  }
  return orders
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const text = await file.text()
    const orders = parseShopifyCSV(text)
    if (!orders.length) return NextResponse.json({ error: 'No orders found in CSV' }, { status: 400 })

    const db = supabaseAdmin()

    // Upsert orders (skip duplicates by order_no)
    const { data, error } = await db
      .from('orders')
      .upsert(orders, { onConflict: 'order_no', ignoreDuplicates: true })
      .select()

    if (error) throw error

    return NextResponse.json({
      imported: orders.length,
      skipped: orders.length - (data?.length ?? 0),
      orders: orders.map(o => o.order_no),
    })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
