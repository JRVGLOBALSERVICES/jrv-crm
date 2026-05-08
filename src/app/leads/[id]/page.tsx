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
      .then(async (res) => {
        if (!res.ok) {
          setLoading(false)
          return
        }
        const data = await res.json()
        if (!data || !data.id) {
          setLoading(false)
          return
        }
        setLead(data)
        setStatus(data.status)
        // If notes is JSON (enrichment data), start with empty user notes
        const rawNotes = data.notes || ''
        try { JSON.parse(rawNotes); setNotes(''); } catch { setNotes(rawNotes); }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  async function handleSave() {
    setSaving(true)
    // Preserve enrichment JSON in notes while saving user text
    const existingNotes = lead?.notes || ''
    let mergedNotes = notes // user's text by default
    try {
      // If existing notes is enrichment JSON, keep it and add user_notes key
      const parsed = JSON.parse(existingNotes)
      if (typeof parsed === 'object' && parsed !== null) {
        parsed.user_notes = notes
        mergedNotes = JSON.stringify(parsed)
      }
    } catch {
      // existing notes is plain text — user overwrites it
      mergedNotes = notes
    }
    const res = await fetch(`/api/leads/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes: mergedNotes }),
    })
    if (res.ok) {
      const data = await res.json()
      setLead(data)
      setStatus(data.status)
      // Show user notes back (or empty if enrichment JSON)
      const rawNotes = data.notes || ''
      try { JSON.parse(rawNotes); setNotes(''); } catch { setNotes(rawNotes); }
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
    <div className="flex flex-col gap-0.5 sm:gap-1">
      <span className="text-[10px] sm:text-[11px] text-neutral-500 uppercase tracking-wider font-medium">{label}</span>
      <span className="text-xs sm:text-sm text-white">{children || <span className="text-neutral-700">—</span>}</span>
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
      className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 rounded-lg text-[11px] sm:text-xs lg:text-sm font-medium jrv-transition border press-feedback ${
        currentStatus === statusKey
          ? `${STATUS_COLORS[statusKey]} ring-1 ring-orange-500/60`
          : 'border-neutral-700 text-neutral-400 hover:border-orange-500/50 hover:text-orange-400 bg-neutral-800/50'
      }`}
    >
      <div>{label}</div>
      {timestamp && (
        <div className="text-[9px] sm:text-[10px] text-neutral-500 mt-0.5">{formatTimestamp(timestamp)}</div>
      )}
    </button>
  )

  const Section = ({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
    const [open, setOpen] = useState(defaultOpen ?? true)
    return (
      <motion.div
        variants={sectionVariants}
        className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden mb-3 sm:mb-5"
      >
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 jrv-transition hover:bg-neutral-800/30"
        >
          <h2 className="text-[11px] sm:text-sm font-semibold text-white uppercase tracking-wider">{title}</h2>
          <svg
            className={`w-3 h-3 sm:w-4 sm:h-4 text-neutral-500 jrv-transition ${open ? 'rotate-180' : ''}`}
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
              <div className="px-3 sm:px-5 pb-3 sm:pb-5">{children}</div>
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
      <motion.div variants={sectionVariants} className="mb-5 sm:mb-6">
        <button
          onClick={() => router.push('/')}
          className="text-neutral-500 hover:text-orange-400 text-xs sm:text-sm jrv-transition mb-2 sm:mb-3 flex items-center gap-1.5 press-feedback"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-0.5 sm:mb-1">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-white tracking-tight truncate">{lead.business_name}</h1>
              <span className={`inline-flex px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold border shrink-0 ${STATUS_COLORS[lead.status]}`}>
                {STATUS_LABELS[lead.status]}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500">
              Added {formatTimestamp(lead.created_at)}
              {lead.assigned_to && <span className="ml-2 sm:ml-3">· {lead.assigned_to}</span>}
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => router.push(`/leads/${params.id}/proposal`)}
              className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-700 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium jrv-transition press-feedback flex items-center justify-center gap-1.5 sm:gap-2"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Proposal
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-400 hover:text-red-300 text-xs sm:text-sm px-2.5 sm:px-3 py-2 sm:py-2.5 jrv-transition border border-red-900/40 rounded-lg hover:border-red-700/60 press-feedback disabled:opacity-40"
            >
              {deleting ? '...' : (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Section 1 — Business Information */}
      <Section title="Business Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
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
                {typeof lead.gbp_rating === 'number' ? lead.gbp_rating.toFixed(1) : lead.gbp_rating}
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
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {lead.google_maps_url && (
            <a
              href={lead.google_maps_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 sm:gap-2 bg-neutral-800 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium hover:bg-neutral-700 jrv-transition border border-neutral-700 press-feedback"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              Maps
            </a>
          )}
          <button
            onClick={() => router.push(`/leads/${params.id}/proposal`)}
            className="inline-flex items-center gap-1.5 sm:gap-2 bg-orange-600 hover:bg-orange-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium jrv-transition press-feedback"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Proposal
          </button>
        </div>
      </Section>

      {/* Section 3 — Status Management */}
      <Section title="Status Management">
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2.5">
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
        <div className="mt-3 sm:mt-4 flex gap-2 sm:gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-700 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium jrv-transition disabled:opacity-50 press-feedback"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                <svg className="animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : 'Update'}
          </button>
        </div>
      </Section>

      {/* Section 4 — Notes */}
      <Section title="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm jrv-transition resize-y focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          placeholder="Add notes about this lead..."
        />
        <div className="flex gap-2 sm:gap-3 mt-3 sm:mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-700 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium jrv-transition disabled:opacity-50 press-feedback"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                <svg className="animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : 'Save'}
          </button>
        </div>
      </Section>

      {/* Section 5 — Enrichment Data */}
      {enrichmentData && (
        <Section title="Enrichment Data">
          <div className="space-y-6">
            {/* MARKET INTEL */}
            {enrichmentData.market_intel && <RenderMarketIntel data={enrichmentData.market_intel} />}

            {/* DIGITAL AUDIT */}
            {enrichmentData.digital_audit && <RenderDigitalAudit data={enrichmentData.digital_audit} />}

            {/* TECH SCOPE */}
            {enrichmentData.tech_scope && <RenderTechScope data={enrichmentData.tech_scope} />}

            {/* PITCH DECK */}
            {enrichmentData.pitch_deck && <RenderPitchDeck data={enrichmentData.pitch_deck} />}

            {/* FULL DOSSIER */}
            {enrichmentData.full_dossier && (
              <EnrichCard icon="📋" title="Full Dossier">
                <div className="bg-neutral-800/40 rounded-lg border border-neutral-700/50 p-3 max-h-96 overflow-y-auto">
                  <pre className="text-xs text-neutral-400 whitespace-pre-wrap font-sans leading-relaxed">{enrichmentData.full_dossier}</pre>
                </div>
              </EnrichCard>
            )}

            {/* PROPOSAL CONTENT LINK */}
            {enrichmentData.proposal_content && (
              <div className="bg-orange-900/10 border border-orange-800/30 rounded-lg p-4">
                <p className="text-sm font-medium text-neutral-200 flex items-center gap-2 mb-2">
                  <span>📄</span> Proposal Content Stored
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {competitors.map((comp: Record<string, any>, idx: number) => {
              // Use threatLevel from the data
              const rawLevel = (comp.threatLevel || '').toLowerCase()
              const threatLevel = rawLevel === 'high' ? 'high' : rawLevel === 'low' ? 'low' : 'medium'

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
                    {comp.advantage && (
                      <p className="text-xs text-neutral-500 leading-relaxed mt-1">
                        <span className="text-neutral-600">Why:</span> {comp.advantage}
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
            {frictionReviews.map((review: any, idx: number) => {
              const isString = typeof review === 'string'
              return (
              <div
                key={idx}
                className="bg-neutral-800/50 rounded-lg border border-neutral-700 p-4 jrv-transition hover:border-neutral-600"
              >
                {!isString && (
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
                )}
                <p className="text-sm text-neutral-300 leading-relaxed">&ldquo;{isString ? review : (review.text || review.comment || '')}&rdquo;</p>
                {!isString && review.date && (
                  <p className="text-xs text-neutral-600 mt-2">{review.date}</p>
                )}
              </div>
            )})}
          </div>
        </Section>
      )}
    </motion.div>
  )
}

// ─── Enrichment Renderer Components ───

/** Shared card wrapper for enrichment sections */
function EnrichCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <details className="group bg-neutral-800/50 rounded-lg border border-neutral-700 overflow-hidden" defaultChecked>
      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer jrv-transition hover:bg-neutral-800 list-none">
        <span className="text-sm font-semibold text-orange-400 flex items-center gap-2">
          <span>{icon}</span> {title}
        </span>
        <svg className="w-4 h-4 text-neutral-500 jrv-transition group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-4 pb-4 border-t border-neutral-700 pt-3">
        {children}
      </div>
    </details>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold">{children}</span>
}

/** Market Intel — ICP, urgency trigger, brand perception */
function RenderMarketIntel({ data }: { data: Record<string, any> }) {
  return (
    <EnrichCard icon="📊" title="Market Intel">
      <div className="space-y-4">
        {/* ICP */}
        {data.icp && (
          <div className="space-y-2">
            <Label>Ideal Customer Profile</Label>
            <div className="bg-neutral-900/60 rounded-lg border border-neutral-700/40 p-3 space-y-2">
              {(data.icp as Record<string, any>).type && (
                <p className="text-sm text-neutral-300"><span className="text-neutral-500">Type:</span> {data.icp.type}</p>
              )}
              {(data.icp as Record<string, any>).targetArea && (
                <p className="text-sm text-neutral-300"><span className="text-neutral-500">Target Area:</span> {data.icp.targetArea}</p>
              )}
              {(data.icp as Record<string, any>).demographic && (
                <p className="text-sm text-neutral-300"><span className="text-neutral-500">Demographic:</span> {data.icp.demographic}</p>
              )}
            </div>
          </div>
        )}

        {/* Urgency Trigger */}
        {data.urgencyTrigger && (
          <div className="space-y-2">
            <Label>Urgency Trigger</Label>
            <div className="bg-red-900/10 border border-red-800/30 rounded-lg p-3">
              <p className="text-sm text-neutral-200 leading-relaxed">{data.urgencyTrigger}</p>
            </div>
          </div>
        )}

        {/* Brand Perception */}
        {data.brandPerception && (
          <div className="space-y-2">
            <Label>Brand Perception</Label>
            <div className="bg-neutral-900/60 rounded-lg border border-neutral-700/40 p-3 space-y-2">
              {(data.brandPerception as Record<string, any>).currentLook && (
                <div>
                  <p className="text-[11px] text-neutral-600 uppercase tracking-wider mb-0.5">Current</p>
                  <p className="text-sm text-neutral-300">{data.brandPerception.currentLook}</p>
                </div>
              )}
              {(data.brandPerception as Record<string, any>).offlineReputation && (
                <div>
                  <p className="text-[11px] text-neutral-600 uppercase tracking-wider mb-0.5">Offline Reputation</p>
                  <p className="text-sm text-neutral-300">{data.brandPerception.offlineReputation}</p>
                </div>
              )}
              {(data.brandPerception as Record<string, any>).gap && (
                <div>
                  <p className="text-[11px] text-neutral-600 uppercase tracking-wider mb-0.5">Gap</p>
                  <p className="text-sm text-amber-300">{data.brandPerception.gap}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Generic fallback for unknown market_intel fields */}
        <RenderGenericFields data={data} exclude={['icp','urgencyTrigger','brandPerception','competitors']} />
      </div>
    </EnrichCard>
  )
}

/** Digital Audit — zero-state, trust signals, bottlenecks */
function RenderDigitalAudit({ data }: { data: Record<string, any> }) {
  return (
    <EnrichCard icon="🔍" title="Digital Audit">
      <div className="space-y-4">
        {/* Zero-state pivot */}
        {(data as Record<string, any>).zeroStatePivot && (
          <div className="space-y-2">
            <Label>Zero-State Assessment</Label>
            <p className="text-sm text-neutral-300 bg-neutral-900/60 border border-neutral-700/40 rounded-lg p-3 leading-relaxed">{data.zeroStatePivot}</p>
          </div>
        )}

        {/* Trust signals */}
        {(data as Record<string, any>).trustSignals && (
          <div className="space-y-2">
            <Label>Trust Signals</Label>
            <div className="bg-neutral-900/60 border border-neutral-700/40 rounded-lg p-3 space-y-2">
              {(data.trustSignals as Record<string, any>).reviewsVisible && (
                <p className="text-sm text-green-300 flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {data.trustSignals.reviewsVisible}
                </p>
              )}
              {(data.trustSignals as Record<string, any>).recommendation && (
                <div className="mt-2 pt-2 border-t border-neutral-700/50">
                  <p className="text-[11px] text-orange-500 uppercase tracking-wider mb-1">Recommendation</p>
                  <p className="text-sm text-neutral-300">{data.trustSignals.recommendation}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottlenecks */}
        {(data as Record<string, any>).bottlenecks && Array.isArray(data.bottlenecks) && data.bottlenecks.length > 0 && (
          <div className="space-y-2">
            <Label>Bottlenecks ({data.bottlenecks.length})</Label>
            <ul className="space-y-2">
              {(data.bottlenecks as string[]).map((b: string, i: number) => (
                <li key={i} className="flex items-start gap-2 bg-neutral-900/40 border border-neutral-700/40 rounded-lg p-2.5">
                  <span className="text-red-400 text-sm mt-0.5 shrink-0">⚠</span>
                  <span className="text-sm text-neutral-300 leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Technical debt */}
        {(data as Record<string, any>).technicalDebt && (
          <div className="space-y-2">
            <Label>Technical Debt</Label>
            <div className="bg-red-900/10 border border-red-800/30 rounded-lg p-3">
              <p className="text-sm text-neutral-300 leading-relaxed">{data.technicalDebt}</p>
            </div>
          </div>
        )}

        <RenderGenericFields data={data} exclude={['zeroStatePivot','trustSignals','bottlenecks','technicalDebt']} />
      </div>
    </EnrichCard>
  )
}

/** Tech Scope — schema, integrations, content gaps, sprints */
function RenderTechScope({ data }: { data: Record<string, any> }) {
  return (
    <EnrichCard icon="⚙️" title="Tech Scope">
      <div className="space-y-4">
        {/* Schema */}
        {(data as Record<string, any>).proposedSchema && Array.isArray(data.proposedSchema) && data.proposedSchema.length > 0 && (
          <div className="space-y-2">
            <Label>Proposed Schema ({data.proposedSchema.length})</Label>
            <ul className="space-y-1.5">
              {(data.proposedSchema as string[]).map((s: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                  <span className="text-orange-400 mt-0.5 shrink-0">▹</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Integrations */}
        {(data as Record<string, any>).highValueIntegrations && Array.isArray(data.highValueIntegrations) && data.highValueIntegrations.length > 0 && (
          <div className="space-y-2">
            <Label>High-Value Integrations ({data.highValueIntegrations.length})</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(data.highValueIntegrations as any[]).map((int: Record<string, any>, i: number) => (
                <div key={i} className="bg-neutral-900/60 border border-neutral-700/40 rounded-lg p-3">
                  <p className="text-sm font-medium text-white mb-1">{int.name}</p>
                  {int.why && <p className="text-xs text-neutral-400 leading-relaxed">{int.why}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content gaps */}
        {(data as Record<string, any>).contentGaps && (
          <div className="space-y-2">
            <Label>Content Gaps</Label>
            <div className="bg-neutral-900/60 border border-neutral-700/40 rounded-lg p-3 space-y-1.5">
              {(data.contentGaps as Record<string, any>).needsCopywriting !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">Copywriting</span>
                  <span className={data.contentGaps.needsCopywriting ? 'text-orange-400' : 'text-green-400'}>
                    {data.contentGaps.needsCopywriting ? 'Needed' : 'Done'}
                  </span>
                </div>
              )}
              {(data.contentGaps as Record<string, any>).needsLogoRecreation !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">Logo Recreation</span>
                  <span className={data.contentGaps.needsLogoRecreation ? 'text-orange-400' : 'text-green-400'}>
                    {data.contentGaps.needsLogoRecreation ? 'Needed' : 'Exists'}
                  </span>
                </div>
              )}
              {(data.contentGaps as Record<string, any>).needsPhotography !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">Photography</span>
                  <span className={data.contentGaps.needsPhotography ? 'text-orange-400' : 'text-green-400'}>
                    {data.contentGaps.needsPhotography ? 'Needed' : 'Available'}
                  </span>
                </div>
              )}
              {(data.contentGaps as Record<string, any>).notes && (
                <p className="text-xs text-neutral-500 border-t border-neutral-700/50 pt-2 mt-2">{data.contentGaps.notes}</p>
              )}
            </div>
          </div>
        )}

        {/* Sprints */}
        {(data as Record<string, any>).estimatedSprints && (
          <div className="space-y-2">
            <Label>Estimated Sprints</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(['stage1','stage2','stage3','maintenance'] as const).filter(k => (data.estimatedSprints as Record<string, any>)[k]).map(k => {
                const sprint = (data.estimatedSprints as Record<string, any>)[k];
                const labels: Record<string, string> = { stage1: 'Stage 1', stage2: 'Stage 2', stage3: 'Stage 3', maintenance: 'Maintenance' };
                return (
                  <div key={k} className="bg-neutral-900/60 border border-neutral-700/40 rounded-lg p-2.5">
                    <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1">{labels[k]}</p>
                    <p className="text-xs text-neutral-300 leading-relaxed">{sprint}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <RenderGenericFields data={data} exclude={['proposedSchema','highValueIntegrations','contentGaps','estimatedSprints']} />
      </div>
    </EnrichCard>
  )
}

/** Pitch Deck — hooks, objections, ROI, pricing */
function RenderPitchDeck({ data }: { data: Record<string, any> }) {
  return (
    <EnrichCard icon="🎯" title="Pitch Deck">
      <div className="space-y-4">
        {/* Icebreaker Hooks */}
        {(data as Record<string, any>).icebreakerHooks && Array.isArray(data.icebreakerHooks) && data.icebreakerHooks.length > 0 && (
          <div className="space-y-2">
            <Label>Icebreaker Hooks ({data.icebreakerHooks.length})</Label>
            <div className="space-y-2">
              {(data.icebreakerHooks as string[]).map((hook: string, i: number) => (
                <div key={i} className="bg-orange-900/10 border border-orange-800/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-orange-400 text-sm font-bold shrink-0 mt-0.5">{i + 1}.</span>
                    <p className="text-sm text-neutral-200 leading-relaxed">{hook}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preempted Objections */}
        {(data as Record<string, any>).preemptedObjections && Array.isArray(data.preemptedObjections) && data.preemptedObjections.length > 0 && (
          <div className="space-y-2">
            <Label>Preempted Objections ({data.preemptedObjections.length})</Label>
            <div className="space-y-3">
              {(data.preemptedObjections as any[]).map((obj: Record<string, any>, i: number) => (
                <div key={i} className="bg-neutral-900/60 border border-neutral-700/40 rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-1.5">
                    <span className="text-amber-400 text-sm shrink-0 mt-0.5">🗣️</span>
                    <div>
                      <p className="text-[11px] text-amber-500 uppercase tracking-wider mb-0.5">Objection</p>
                      <p className="text-sm text-neutral-200 font-medium">{obj.objection}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 pl-6">
                    <span className="text-green-400 text-sm shrink-0 mt-0.5">→</span>
                    <div>
                      <p className="text-[11px] text-green-500 uppercase tracking-wider mb-0.5">Counter</p>
                      <p className="text-sm text-neutral-300">{obj.counter}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ROI Equation */}
        {(data as Record<string, any>).roiEquation && (
          <div className="space-y-2">
            <Label>ROI Equation</Label>
            <div className="bg-green-900/10 border border-green-800/30 rounded-lg p-3 space-y-2">
              {(data.roiEquation as Record<string, any>).averageTicket && (
                <p className="text-sm text-neutral-300">
                  <span className="text-neutral-500">Avg Ticket: </span>
                  <span className="text-green-300 font-medium">{data.roiEquation.averageTicket}</span>
                </p>
              )}
              {(data.roiEquation as Record<string, any>).breakEvenClients && (
                <p className="text-sm text-neutral-300">
                  <span className="text-neutral-500">Break-even: </span>
                  <span className="text-green-300 font-medium">{data.roiEquation.breakEvenClients}</span>
                </p>
              )}
              {(data.roiEquation as Record<string, any>).annualValue && (
                <p className="text-sm text-neutral-300">
                  <span className="text-neutral-500">Annual Value: </span>
                  <span className="text-green-300 font-medium">{data.roiEquation.annualValue}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Pricing */}
        {(data as Record<string, any>).pricing && (
          <div className="space-y-2">
            <Label>Pricing</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(['stage1','stage2','stage3','retainer'] as const).filter(k => (data.pricing as Record<string, any>)[k]).map(k => {
                const tier = (data.pricing as Record<string, any>)[k];
                return (
                  <div key={k} className="bg-neutral-900/60 border border-neutral-700/40 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider">{tier.name}</p>
                      <p className="text-sm font-bold text-white">{tier.price}</p>
                    </div>
                    {tier.timeline && <p className="text-xs text-neutral-500 mb-1">{tier.timeline}</p>}
                    {tier.includes && <p className="text-xs text-neutral-400 leading-relaxed">{tier.includes}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <RenderGenericFields data={data} exclude={['icebreakerHooks','preemptedObjections','roiEquation','pricing']} />
      </div>
    </EnrichCard>
  )
}

/** Fallback — renders unknown fields as human-readable key-value pairs instead of raw JSON */
function RenderGenericFields({ data, exclude }: { data: Record<string, any>; exclude: string[] }) {
  const keys = Object.keys(data).filter(k => !exclude.includes(k))
  if (keys.length === 0) return null

  return (
    <div className="space-y-2 pt-2 border-t border-neutral-700/40">
      <Label>Additional Fields</Label>
      <div className="space-y-1.5">
        {keys.map(k => (
          <div key={k} className="flex items-baseline gap-2">
            <span className="text-xs text-neutral-500 capitalize shrink-0 w-28 truncate">{k.replace(/_/g, ' ')}</span>
            <span className="text-xs text-neutral-300">
              {typeof data[k] === 'string' ? data[k]
              : typeof data[k] === 'number' || typeof data[k] === 'boolean' ? String(data[k])
              : formatSimpleValue(data[k])}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatSimpleValue(v: any): string {
  if (v === null || v === undefined) return '—'
  if (Array.isArray(v)) return Array.isArray(v[0]) ? `[${v.length} items]` : v.map((x: any) => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(', ')
  if (typeof v === 'object') return `<${Object.keys(v).length} fields>`
  return String(v)
}
