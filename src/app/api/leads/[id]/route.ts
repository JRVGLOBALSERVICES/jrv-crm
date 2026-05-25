import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { auditLead, auditLog } from '@/lib/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // Log view
  auditLead('lead.viewed', params.id, { business_name: data.business_name }, request).catch(() => {})

  return NextResponse.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Get current state for audit diff
    const { data: before } = await supabase
      .from('leads')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!before) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Build update object
    const updates: Record<string, any> = { ...body, updated_at: new Date().toISOString() }

    // Check status timestamps
    if (body.status === 'contacted' && !before.contacted_at) updates.contacted_at = new Date().toISOString()
    if (body.status === 'replied' && !before.replied_at) updates.replied_at = new Date().toISOString()
    if (body.status === 'pitched' && !before.pitched_at) updates.pitched_at = new Date().toISOString()
    if (body.status === 'closed' && !before.closed_at) updates.closed_at = new Date().toISOString()

    const { data: after, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Build a diff of what changed (excluding timestamps)
    const changes: Record<string, any> = {}
    if (before && after) {
      for (const key of Object.keys(updates)) {
        const beforeVal = before[key as keyof typeof before]
        const afterVal = updates[key]
        if (beforeVal !== afterVal && key !== 'updated_at') {
          changes[key] = { from: beforeVal, to: afterVal }
        }
      }
    }

    // Log update
    auditLog({
      action: 'lead.updated',
      entityType: 'lead',
      entityId: params.id,
      details: {
        business_name: after.business_name,
        changes,
      },
      request,
    }).catch(() => {})

    return NextResponse.json(after)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Get lead info before deleting
  const { data: lead } = await supabase
    .from('leads')
    .select('id, business_name')
    .eq('id', params.id)
    .single()

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log deletion
  auditLog({
    action: 'lead.deleted',
    entityType: 'lead',
    entityId: params.id,
    details: { business_name: lead?.business_name || 'unknown' },
    request,
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
