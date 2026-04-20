export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const date   = searchParams.get('date')   // YYYY-MM-DD, filters by import_date
  const search = searchParams.get('search') // free text search

  const db = supabaseAdmin()

  let query = db
    .from('orders')
    .select(`
      *,
      dispatches(id, barcode, dispatch_date, weight_grams, cod_type, cod_value,
                 length_cm, breadth_cm, height_cm, label_printed, ip_exported)
    `)
    .order('shopify_created_at', { ascending: false })

  if (date) query = query.eq('import_date', date)
  if (search) {
    query = query.or(
      `order_no.ilike.%${search}%,customer_name.ilike.%${search}%,phone.ilike.%${search}%,city.ilike.%${search}%`
    )
  }

  const { data, error } = await query.limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data })
}

