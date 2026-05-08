import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  _request: Request,
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

  return NextResponse.json(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Build update object
    const updates: Record<string, any> = { ...body, updated_at: new Date().toISOString() }

    // Get current lead to check timestamps
    const { data: current } = await supabase
      .from('leads')
      .select('contacted_at, replied_at, pitched_at, closed_at')
      .eq('id', params.id)
      .single()

    if (current) {
      if (body.status === 'contacted' && !current.contacted_at) updates.contacted_at = new Date().toISOString()
      if (body.status === 'replied' && !current.replied_at) updates.replied_at = new Date().toISOString()
      if (body.status === 'pitched' && !current.pitched_at) updates.pitched_at = new Date().toISOString()
      if (body.status === 'closed' && !current.closed_at) updates.closed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
