export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      order_id, order_no, barcode,
      weight_grams = 250, length_cm = 27, breadth_cm = 18, height_cm = 2,
      cod_type = '', cod_value = 0, dispatch_date,
    } = body

    if (!order_no || !barcode) {
      return NextResponse.json({ error: 'order_no and barcode required' }, { status: 400 })
    }

    const db = supabaseAdmin()
    const date = dispatch_date || new Date().toISOString().slice(0, 10)

    const { data, error } = await db
      .from('dispatches')
      .upsert({
        order_id, order_no, barcode,
        weight_grams, length_cm, breadth_cm, height_cm,
        cod_type, cod_value, dispatch_date: date,
      }, { onConflict: 'order_no,dispatch_date' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ dispatch: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Update dispatch fields (weight, COD, etc.)
export async function PATCH(req: NextRequest) {
  try {
    const { id, ...fields } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const db = supabaseAdmin()
    const { data, error } = await db
      .from('dispatches')
      .update(fields)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ dispatch: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

