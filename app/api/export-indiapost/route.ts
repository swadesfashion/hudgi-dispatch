import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)

  const db = supabaseAdmin()

  const { data, error } = await db
    .from('dispatches')
    .select('*, orders(order_no, customer_name, phone, address1, address2, city, pincode, state, product_name)')
    .eq('dispatch_date', date)
    .order('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as Array<Record<string, unknown> & { id: number }>

  const ids = rows.map(d => d.id)
  if (ids.length) {
    await db.from('dispatches').update({ ip_exported: true }).in('id', ids)
  }

  return NextResponse.json({ dispatches: data, date })
}