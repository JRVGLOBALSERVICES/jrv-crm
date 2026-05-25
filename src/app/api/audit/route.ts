import { NextRequest, NextResponse } from 'next/server'
import { auditLog } from '@/lib/audit'

/**
 * Client-side audit endpoint.
 * Allows the frontend to log actions like page views, proposal generation, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, entityType, entityId, details } = body

    if (!action || !entityType) {
      return NextResponse.json({ error: 'action and entityType required' }, { status: 400 })
    }

    const result = await auditLog({
      action,
      entityType,
      entityId: entityId || null,
      details: details || null,
      request,
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
