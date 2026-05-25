import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export type AuditAction =
  | 'lead.created'
  | 'lead.updated'
  | 'lead.deleted'
  | 'lead.viewed'
  | 'lead.searched'
  | 'proposal.generated'
  | 'proposal.viewed'
  | 'user.login'
  | 'user.logout'
  | 'export.csv'
  | 'setting.changed'

/**
 * Log an action to the audit trail.
 * Works in both API routes (with request) and server components (without request).
 */
export async function auditLog(params: {
  action: AuditAction | string
  entityType: string
  entityId?: string | null
  details?: Record<string, any> | null
  ipAddress?: string | null
  userEmail?: string | null
  userId?: string | null
  request?: NextRequest
}) {
  try {
    const { action, entityType, entityId, details, ipAddress, userEmail, userId, request } = params

    // Resolve user info
    let resolvedUserId = userId || null
    let resolvedEmail = userEmail || null
    let resolvedIp = ipAddress || null

    // If request is provided, extract IP and try to get user from session
    if (request) {
      resolvedIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || '127.0.0.1'

      if (!resolvedUserId || !resolvedEmail) {
        try {
          const cookieStore = cookies()
          const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
          )
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            resolvedUserId = user.id
            resolvedEmail = user.email || null
          }
        } catch {
          // Cookie access might fail in API routes, that's OK
        }
      }
    }

    // Import supabase server client (service role for write)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { error } = await supabase.from('lead_crm_audit_logs').insert({
      user_id: resolvedUserId,
      user_email: resolvedEmail,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || null,
      ip_address: resolvedIp,
    })

    if (error) {
      console.warn('[audit] Failed to write log:', error.message)
    }

    return { ok: !error }
  } catch (e: any) {
    console.warn('[audit] Error logging:', e.message)
    return { ok: false, error: e.message }
  }
}

/**
 * Shorthand for lead actions.
 */
export function auditLead(
  action: AuditAction,
  leadId: string,
  details?: Record<string, any> | null,
  request?: NextRequest
) {
  return auditLog({
    action,
    entityType: 'lead',
    entityId: leadId,
    details,
    request,
  })
}
