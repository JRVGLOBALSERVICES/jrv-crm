'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lead, STATUS_LABELS, STATUS_COLORS, LeadStatus } from '@/lib/types'

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] as const },
  },
}

const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
}

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<LeadStatus>('new')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Collapsible enrichment sections
  const [enrichmentOpen, setEnrichmentOpen] = useState(true)
  const [competitorsOpen, setCompetitorsOpen] = useState(true)
  const [frictionOpen, setFrictionOpen] = useState(true)

  useEffect(() => {
    fetch(`/api/leads/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setLead(data)
        setStatus(data.status)
        setNotes(data.notes || '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/leads/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    })
    if (res.ok) {
      const data = await res.json()
      setLead(data)
      setStatus(data.status)
      setNotes(data.notes || '')
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this lead permanently? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/leads/${params.id}`, { method: 'DELETE' })
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-48 w-full" />
          <div className="skeleton h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <motion.div
        className="text-center py-24"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
          <svg className="w-7 h-7 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-neutral-300 mb-1">Lead not found</p>
        <p className="text-sm text-neutral-600 mb-6">This lead may have been deleted or the link is invalid.</p>
        <button
          onClick={() => router.push('/')}
          className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium jrv-transition press-feedback"
        >
          ← Back to Dashboard
        </button>
      </motion.div>
    )
  }

  // Parse notes for enrichment data
  let enrichmentData: Record<string, any> | null = null
  let parsedNotes: Record<string, any> | null = null
  try {
    const parsed = JSON.parse(lead.notes || '{}')
    parsedNotes = parsed
    if (parsed.market_intel || parsed.digital_audit || parsed.tech_scope || parsed.pitch_deck) {
      enrichmentData = parsed
    }
  } catch {
    // notes is plain text, not JSON
  }

  const competitors = lead.competitors || (parsedNotes?.competitors as Record<string, any>[] | null) || null
  const frictionReviews = lead.friction_reviews || (parsedNotes?.friction_reviews as Record<string, any>[] | null) || null

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return null
    return new Date(ts).toLocaleString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-medium">{label}</span>
      <span className="text-sm text-white">{children || <span className="text-neutral-700">—</span>}</span>
    </div>
  )

  const StatusButton = ({
    label,
    statusKey,
    timestamp,
    currentStatus,
  }: {
    label: string
    statusKey: LeadStatus
    timestamp: string | null
    currentStatus: LeadStatus
  }) => (
    <button
      onClick={() => setStatus(statusKey)}
      className={`px-4 py-2.5 rounded-lg text-sm font-medium jrv-transition border press-feedback ${
        currentStatus === statusKey
          ? `${STATUS_COLORS[statusKey]} ring-1 ring-orange-500/60`
          : 'border-neutral-700 text-neutral-400 hover:border-orange-500/50 hover:text-orange-400 bg-neutral-800/50'
      }`}
    >
      <div>{label}</div>
      {timestamp && (
        <div className="text-[10px] text-neutral-500 mt-0.5">{formatTimestamp(timestamp)}</div>
      )}
    </button>
  )

  const Section = ({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
    const [open, setOpen] = useState(defaultOpen ?? true)
    return (
      <motion.div
        variants={sectionVariants}
        className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden mb-5"
      >
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-5 py-4 jrv-transition hover:bg-neutral-800/30"
        >
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{title}</h2>
          <svg
            className={`w-4 h-4 text-neutral-500 jrv-transition ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="max-w-4xl mx-auto"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={sectionVariants} className="mb-6">
        <button
          onClick={() => router.push('/')}
          className="text-neutral-500 hover:text-orange-400 text-sm jrv-transition mb-3 flex items-center gap-1.5 press-feedback"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">{lead.business_name}</h1>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border shrink-0 ${STATUS_COLORS[lead.status]}`}>
                {STATUS_LABELS[lead.status]}
              </span>
            </div>
            <p className="text-sm text-neutral-500">
              Added {formatTimestamp(lead.created_at)}
              {lead.assigned_to && <span className="ml-3">· Assigned to {lead.assigned_to}</span>}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => router.push(`/leads/${params.id}/proposal`)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium jrv-transition press-feedback flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Proposal
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-400 hover:text-red-300 text-sm px-3 py-2.5 jrv-transition border border-red-900/40 rounded-lg hover:border-red-700/60 press-feedback disabled:opacity-40"
            >
              {deleting ? 'Deleting...' : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Section 1 — Business Information */}
      <Section title="Business Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <InfoRow label="Sector">{lead.sector}</InfoRow>
          <InfoRow label="Rating">
            {lead.rating ? (
              <span className="inline-flex items-center gap-1">
                <span className="text-orange-400">★</span>
                {lead.rating}
                {lead.review_count ? <span className="text-neutral-500 text-xs ml-1">({lead.review_count} reviews)</span> : null}
              </span>
            ) : null}
          </InfoRow>
          <InfoRow label="GBP Rating">
            {lead.gbp_rating !== null ? (
              <span className="inline-flex items-center gap-1">
                <span className="text-orange-400">★</span>
                {lead.gbp_rating.toFixed(1)}
                {lead.gbp_review_count ? <span className="text-neutral-500 text-xs ml-1">({lead.gbp_review_count} reviews)</span> : null}
              </span>
            ) : null}
          </InfoRow>
          <InfoRow label="Phone">{lead.phone}</InfoRow>
          <InfoRow label="Address">{lead.address}</InfoRow>
          <InfoRow label="Hours">{lead.hours}</InfoRow>
          <InfoRow label="Current Web Presence">{lead.current_web_presence}</InfoRow>
          <InfoRow label="Website URL">
            {lead.website_url ? (
              <a
                href={lead.website_url}
                target="_blank"
                rel="noreferrer"
                className="text-orange-400 hover:text-orange-300 underline underline-offset-2 jrv-transition"
              >
                {lead.website_url}
              </a>
            ) : null}
          </InfoRow>
          <InfoRow label="Recommended Domain">
            {lead.recommended_domain ? (
              <a
                href={`https://${lead.recommended_domain}`}
                target="_blank"
                rel="noreferrer"
                className="text-orange-400 hover:text-orange-300 underline underline-offset-2 jrv-transition"
              >
                {lead.recommended_domain}
              </a>
            ) : null}
          </InfoRow>
          <InfoRow label="Why Need Website">{lead.why_they_need_website}</InfoRow>
          <InfoRow label="Zero State">
            <span className={lead.is_zero_state ? 'text-orange-400' : 'text-neutral-600'}>
              {lead.is_zero_state ? 'Yes — No web presence' : 'No'}
            </span>
          </InfoRow>
          <InfoRow label="Enrichment">
            <span className={lead.enrichment_complete ? 'text-green-400' : lead.enriched_by ? 'text-amber-400' : 'text-neutral-600'}>
              {lead.enrichment_complete ? 'Complete' : lead.enriched_by ? 'Partial' : '—'}
            </span>
          </InfoRow>
          <InfoRow label="Enriched By">{lead.enriched_by}</InfoRow>
        </div>
      </Section>

      {/* Section 2 — Links & Actions */}
      <Section title="Links & Actions">
        <div className="flex flex-wrap gap-3">
          {lead.google_maps_url && (
            <a
              href={lead.google_maps_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-neutral-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-neutral-700 jrv-transition border border-neutral-700 press-feedback"
            >
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              Open in Google Maps
            </a>
          )}
          <button
            onClick={() => router.push(`/leads/${params.id}/proposal`)}
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium jrv-transition press-feedback"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Generate Proposal
          </button>
        </div>
      </Section>

      {/* Section 3 — Status Management */}
      <Section title="Status Management">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
            <StatusButton
              key={s}
              label={STATUS_LABELS[s]}
              statusKey={s}
              timestamp={lead[`${s}_at` as keyof Lead] as string | null}
              currentStatus={status}
            />
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium jrv-transition disabled:opacity-50 press-feedback"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Updating...
              </span>
            ) : 'Update Status'}
          </button>
        </div>
      </Section>

      {/* Section 4 — Notes */}
      <Section title="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-lg p-3 text-sm jrv-transition resize-y focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          placeholder="Add notes about this lead..."
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium jrv-transition disabled:opacity-50 press-feedback"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : 'Save Changes'}
          </button>
        </div>
      </Section>

      {/* Section 5 — Enrichment Data */}
      {enrichmentData && (
        <Section title="Enrichment Data">
          <div className="space-y-4">
            {enrichmentData.market_intel && (
              <details className="group bg-neutral-800/50 rounded-lg border border-neutral-700 overflow-hidden">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer jrv-transition hover:bg-neutral-800 list-none">
                  <span className="text-sm font-medium text-orange-400 flex items-center gap-2">
                    <span>📊</span> Market Intel
                  </span>
                  <svg className="w-4 h-4 text-neutral-500 jrv-transition group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-sm text-neutral-300 whitespace-pre-wrap border-t border-neutral-700 pt-3">
                  {typeof enrichmentData.market_intel === 'object'
                    ? JSON.stringify(enrichmentData.market_intel, null, 2)
                    : enrichmentData.market_intel}
                </div>
              </details>
            )}
            {enrichmentData.digital_audit && (
              <details className="group bg-neutral-800/50 rounded-lg border border-neutral-700 overflow-hidden">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer jrv-transition hover:bg-neutral-800 list-none">
                  <span className="text-sm font-medium text-orange-400 flex items-center gap-2">
                    <span>🔍</span> Digital Audit
                  </span>
                  <svg className="w-4 h-4 text-neutral-500 jrv-transition group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-sm text-neutral-300 whitespace-pre-wrap border-t border-neutral-700 pt-3">
                  {typeof enrichmentData.digital_audit === 'object'
                    ? JSON.stringify(enrichmentData.digital_audit, null, 2)
                    : enrichmentData.digital_audit}
                </div>
              </details>
            )}
            {enrichmentData.tech_scope && (
              <details className="group bg-neutral-800/50 rounded-lg border border-neutral-700 overflow-hidden">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer jrv-transition hover:bg-neutral-800 list-none">
                  <span className="text-sm font-medium text-orange-400 flex items-center gap-2">
                    <span>⚙️</span> Tech Scope
                  </span>
                  <svg className="w-4 h-4 text-neutral-500 jrv-transition group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-sm text-neutral-300 whitespace-pre-wrap border-t border-neutral-700 pt-3">
                  {typeof enrichmentData.tech_scope === 'object'
                    ? JSON.stringify(enrichmentData.tech_scope, null, 2)
                    : enrichmentData.tech_scope}
                </div>
              </details>
            )}
            {enrichmentData.pitch_deck && (
              <details className="group bg-neutral-800/50 rounded-lg border border-neutral-700 overflow-hidden">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer jrv-transition hover:bg-neutral-800 list-none">
                  <span className="text-sm font-medium text-orange-400 flex items-center gap-2">
                    <span>🎯</span> Pitch Deck
                  </span>
                  <svg className="w-4 h-4 text-neutral-500 jrv-transition group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-sm text-neutral-300 whitespace-pre-wrap border-t border-neutral-700 pt-3">
                  {typeof enrichmentData.pitch_deck === 'object'
                    ? JSON.stringify(enrichmentData.pitch_deck, null, 2)
                    : enrichmentData.pitch_deck}
                </div>
              </details>
            )}
            {enrichmentData.proposal_content && (
              <div className="bg-neutral-800/50 rounded-lg border border-neutral-700 p-4">
                <p className="text-sm font-medium text-neutral-300 flex items-center gap-2 mb-2">
                  <span>📋</span> Proposal Content
                </p>
                <a
                  href={`/leads/${params.id}/proposal`}
                  className="text-orange-400 hover:text-orange-300 text-sm underline underline-offset-2 jrv-transition font-medium"
                >
                  View full proposal →
                </a>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Section 6 — Competitors */}
      {competitors && competitors.length > 0 && (
        <Section title={`Competitors (${competitors.length})`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {competitors.map((comp: Record<string, any>, idx: number) => {
              // Determine threat level from strengths/weaknesses
              const weaknessCount = (comp.weaknesses || '').length
              const strengthCount = (comp.strengths || '').length
              const threatLevel = strengthCount > weaknessCount ? 'high' : strengthCount === weaknessCount ? 'medium' : 'low'

              const threatConfig = {
                high: { bg: 'bg-red-900/20', border: 'border-red-800/40', dot: 'bg-red-500', label: 'Strong competitor' },
                medium: { bg: 'bg-amber-900/20', border: 'border-amber-800/40', dot: 'bg-amber-500', label: 'Comparable' },
                low: { bg: 'bg-green-900/20', border: 'border-green-800/40', dot: 'bg-green-500', label: 'Weak competitor' },
              }

              const threat = threatConfig[threatLevel]

              return (
                <div
                  key={idx}
                  className={`${threat.bg} ${threat.border} rounded-lg border p-4 jrv-transition hover:border-orange-500/30`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white">
                      {comp.name || comp.business_name || `Competitor ${idx + 1}`}
                    </h3>
                    <div className="flex items-center gap-1.5" title={threat.label}>
                      <div className={`w-2 h-2 rounded-full ${threat.dot}`} />
                      <span className="text-[10px] text-neutral-500 uppercase">{threatLevel}</span>
                    </div>
                  </div>
                  <div className="text-xs text-neutral-400 space-y-1">
                    {comp.rating && (
                      <p className="flex items-center gap-1">
                        <span className="text-neutral-600">Rating:</span>
                        <span className="text-orange-400">★</span> {comp.rating}
                      </p>
                    )}
                    {comp.reviews && (
                      <p><span className="text-neutral-600">Reviews:</span> {comp.reviews}</p>
                    )}
                    {comp.address && (
                      <p className="truncate"><span className="text-neutral-600">📍</span> {comp.address}</p>
                    )}
                    {comp.website && (
                      <p className="truncate">
                        <span className="text-neutral-600">🔗</span>{' '}
                        <a
                          href={comp.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-orange-400 hover:text-orange-300"
                        >
                          {comp.website}
                        </a>
                      </p>
                    )}
                    {(comp.strengths || comp.weaknesses) && (
                      <div className="mt-2 pt-2 border-t border-neutral-700/50 space-y-1">
                        {comp.strengths && (
                          <p className="flex items-start gap-1.5">
                            <span className="text-green-400 mt-0.5">↑</span>
                            <span className="text-neutral-500">{comp.strengths}</span>
                          </p>
                        )}
                        {comp.weaknesses && (
                          <p className="flex items-start gap-1.5">
                            <span className="text-red-400 mt-0.5">↓</span>
                            <span className="text-neutral-500">{comp.weaknesses}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Friction Reviews */}
      {frictionReviews && frictionReviews.length > 0 && (
        <Section title={`Friction Reviews (${frictionReviews.length})`}>
          <div className="space-y-3">
            {frictionReviews.map((review: Record<string, any>, idx: number) => (
              <div
                key={idx}
                className="bg-neutral-800/50 rounded-lg border border-neutral-700 p-4 jrv-transition hover:border-neutral-600"
              >
                <div className="flex items-center justify-between mb-1">
                  {review.author && (
                    <span className="text-xs text-neutral-500 font-medium">{review.author}</span>
                  )}
                  {review.rating && (
                    <span className="text-orange-400 text-xs">
                      {'★'.repeat(Math.round(Number(review.rating)))}
                      {'☆'.repeat(5 - Math.round(Number(review.rating)))}
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed">&ldquo;{review.text || review.comment || ''}&rdquo;</p>
                {review.date && (
                  <p className="text-xs text-neutral-600 mt-2">{review.date}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </motion.div>
  )
}
