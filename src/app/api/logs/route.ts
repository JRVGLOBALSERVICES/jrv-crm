import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || ''
  const userEmail = searchParams.get('email') || ''
  const entityType = searchParams.get('entity') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')))

  const supabase = getServerClient()

  let query = supabase
    .from('lead_crm_audit_logs')
    .select('*', { count: 'exact' })

  if (action) query = query.ilike('action', `%${action}%`)
  if (userEmail) query = query.ilike('user_email', `%${userEmail}%`)
  if (entityType) query = query.eq('entity_type', entityType)

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get unique actions for filter dropdown
  const { data: actions } = await supabase
    .from('lead_crm_audit_logs')
    .select('action')
    .limit(100)

  const uniqueActions = Array.from(new Set((actions || []).map(a => a.action))).sort()

  return NextResponse.json({
    data: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
    actions: uniqueActions,
  })
}
