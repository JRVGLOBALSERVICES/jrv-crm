import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { auditLog } from '@/lib/audit'

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

  // Get full status counts (unfiltered)
  const { data: allLeads } = await supabase.from('leads').select('status')
  const counts = { new: 0, contacted: 0, replied: 0, pitched: 0, closed: 0, lost: 0 }
  ;(allLeads || []).forEach(l => { if (counts[l.status as keyof typeof counts] !== undefined) counts[l.status as keyof typeof counts]++ })

  // Log search actions
  const hasFilters = search || status || sector
  if (hasFilters) {
    auditLog({
      action: 'lead.searched',
      entityType: 'lead',
      details: { search, status, sector, page, sort, order, totalResults: count || 0 },
      request,
    }).catch(() => {})
  }

  return NextResponse.json({
    data: data || [],
    total: count || 0,
    counts,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = body.business_name?.trim()
    if (!name) return NextResponse.json({ error: 'Business name required' }, { status: 400 })

    // Check for duplicates by name (case-insensitive) or maps URL
    const { data: dupes } = await supabase
      .from('leads')
      .select('id, business_name, google_maps_url')
      .limit(50)

    if (dupes) {
      const nameLower = name.toLowerCase()
      const mapsUrl = body.google_maps_url || ''
      for (const d of dupes) {
        if (d.business_name?.toLowerCase() === nameLower) {
          return NextResponse.json({ error: 'duplicate', existing_id: d.id, existing_name: d.business_name, message: `"${name}" already exists` }, { status: 409 })
        }
        if (mapsUrl && d.google_maps_url && d.google_maps_url === mapsUrl) {
          return NextResponse.json({ error: 'duplicate', existing_id: d.id, existing_name: d.business_name, message: 'This Maps URL already exists' }, { status: 409 })
        }
      }
    }

    const newLead = {
      business_name: name,
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

    // Log creation
    auditLog({
      action: 'lead.created',
      entityType: 'lead',
      entityId: data.id,
      details: {
        business_name: data.business_name,
        sector: data.sector,
        google_maps_url: data.google_maps_url,
      },
      request: request as NextRequest,
    }).catch(() => {})

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
