import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const sector = searchParams.get('sector') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')))
  const sort = searchParams.get('sort') || 'created_at'
  const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc'

  let query = supabase.from('leads').select('*', { count: 'exact' })

  if (search) {
    query = query.ilike('business_name', `%${search}%`)
  }
  if (status) {
    query = query.eq('status', status)
  }
  if (sector) {
    query = query.ilike('sector', `%${sector}%`)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await query
    .order(sort, { ascending: order === 'asc' })
    .range(from, to)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  })
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
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
