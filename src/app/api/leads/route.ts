import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const newLead = {
      business_name: body.business_name,
      sector: body.sector || null,
      rating: body.rating || null,
      review_count: body.review_count || null,
      current_web_presence: body.current_web_presence || null,
      why_they_need_website: body.why_they_need_website || null,
      recommended_domain: body.recommended_domain || null,
      google_maps_url: body.google_maps_url || null,
      phone: body.phone || null,
      notes: body.notes || null,
      status: 'new',
      assigned_to: 'Vir',
    }

    const { data, error } = await supabase
      .from('leads')
      .insert(newLead)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
