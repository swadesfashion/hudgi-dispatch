export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Parse a Shopify CSV string into order rows and return detected column indices
function parseShopifyCSV(text: string): {
  orders: any[]
  indices: {
    iName: number
    iSName: number
    iSAddr1: number
    iSCity: number
    iSZip: number
    iSPhone: number
    iProduct: number
  }
} {
  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Proper CSV tokenizer: handles quoted fields with embedded commas and newlines
  function parseCSV(input: string): string[][] {
    const rows: string[][] = []
    let row: string[] = []
    let field = ''
    let inQuote = false
    let i = 0

    while (i < input.length) {
      const ch = input[i]
      if (inQuote) {
        if (ch === '"' && input[i + 1] === '"') {
          field += '"'
          i += 2
        } else if (ch === '"') {
          inQuote = false
          i++
        } else {
          field += ch
          i++
        }
      } else {
        if (ch === '"') {
          inQuote = true
          i++
        } else if (ch === ',') {
          row.push(field.trim())
          field = ''
          i++
        } else if (ch === '\n') {
          row.push(field.trim())
          field = ''
          rows.push(row)
          row = []
          i++
        } else {
          field += ch
          i++
        }
      }
    }
    if (field || row.length) {
      row.push(field.trim())
      rows.push(row)
    }
    return rows
  }

  const rows = parseCSV(text)
  if (rows.length < 2) return { orders: [], indices: {} as any }

  const header = rows[0].map(h => h.toLowerCase().trim())

  // Flexible column finder — tries multiple known Shopify column name variants
  const find = (...names: string[]) => {
    for (const n of names) {
      const idx = header.indexOf(n.toLowerCase().trim())
      if (idx !== -1) return idx
    }
    return -1
  }

  const iName = find('name')
  const iSName = find('shipping name', 'ship to name', 'recipient name', 'billing name')
  const iSAddr1 = find('shipping address1', 'shipping address 1', 'ship to address1', 'billing address1')
  const iSAddr2 = find('shipping address2', 'shipping address 2', 'ship to address2', 'billing address2')
  const iSCity = find('shipping city', 'ship to city', 'billing city')
  const iSZip = find('shipping zip', 'shipping postal code', 'ship to zip', 'billing zip')
  const iSProvince = find(
    'shipping province name',
    'shipping province',
    'ship to province name',
    'ship to province',
    'billing province name',
    'billing province'
  )
  const iSPhone = find('shipping phone', 'phone', 'billing phone', 'customer phone')
  const iProduct = find('lineitem name', 'line item name', 'line_item_name', 'product')
  const iSubtotal = find('subtotal')
  const iShipping = find('shipping price', 'shipping cost', 'shipping')
  const iTotal = find('total')
  const iPayment = find('payment method', 'payment gateway')
  const iCreated = find('created at', 'created_at')
  const iSource = find('source', 'channel', 'sales channel')

  // Log detected columns for debugging
  console.log('[import-csv] Header:', header.slice(0, 30))
  console.log('[import-csv] Column indices:', {
    iName,
    iSName,
    iSAddr1,
    iSCity,
    iSZip,
    iSProvince,
    iSPhone,
    iProduct,
    iSubtotal,
    iShipping,
    iTotal,
    iPayment,
    iCreated,
    iSource,
  })

  const seen = new Set<string>()
  const orders: any[] = []

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || iName < 0 || !r[iName]) continue
    const orderNo = r[iName].trim()
    if (!orderNo || seen.has(orderNo)) continue
    seen.add(orderNo)

    const zip = String(r[iSZip] ?? '').replace(/^'/, '').trim()
    const phone = String(r[iSPhone] ?? '').replace(/^\+91/, '').replace(/\s/g, '').trim()
    const createdRaw = (r[iCreated] ?? '').trim()
    let shopifyCreatedAt: string | null = null
    try {
      if (createdRaw) {
        shopifyCreatedAt = new Date(
          createdRaw.replace(' +0530', '+05:30').replace(' +0000', 'Z').replace(' ', 'T')
        ).toISOString()
      }
    } catch {
      shopifyCreatedAt = null
    }

    orders.push({
      order_no: orderNo,
      customer_name: (r[iSName] ?? '').trim(),
      phone,
      address1: (r[iSAddr1] ?? '').trim(),
      address2: (r[iSAddr2] ?? '').trim(),
      city: (r[iSCity] ?? '').trim(),
      pincode: zip,
      state: (r[iSProvince] ?? '').trim(),
      product_name: (r[iProduct] ?? '').trim(),
      subtotal: parseFloat(r[iSubtotal] ?? '') || 0,
      shipping: parseFloat(r[iShipping] ?? '') || 0,
      total: parseFloat(r[iTotal] ?? '') || 0,
      payment_method: (r[iPayment] ?? '').trim(),
      channel: (r[iSource] ?? 'shopify').trim() || 'shopify',
      shopify_created_at: shopifyCreatedAt,
    })
  }

  return {
    orders,
    indices: {
      iName,
      iSName,
      iSAddr1,
      iSCity,
      iSZip,
      iSPhone,
      iProduct,
    },
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 })
    }

    const text = await file.text()
    const { orders, indices } = parseShopifyCSV(text)

    if (!orders.length) {
      return NextResponse.json({ error: 'No orders found in CSV' }, { status: 400 })
    }

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
      debug_columns: indices,
    })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}