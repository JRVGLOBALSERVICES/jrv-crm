'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Lead, STATUS_LABELS, STATUS_COLORS, LeadStatus } from '@/lib/types'

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<LeadStatus>('new')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
      <div className="flex items-center justify-center py-24">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="text-center py-24">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-neutral-400 text-lg">Lead not found</p>
        <button
          onClick={() => router.push('/')}
          className="mt-6 text-orange-400 hover:text-orange-300 jrv-transition"
        >
          ← Back to Dashboard
        </button>
      </div>
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
      <span className="text-xs text-neutral-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm text-white">{children || <span className="text-neutral-600">—</span>}</span>
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
      className={`px-4 py-2.5 rounded-lg text-sm font-medium jrv-transition border ${
        currentStatus === statusKey
          ? `${STATUS_COLORS[statusKey]} ring-1 ring-orange-500/50`
          : 'border-neutral-700 text-neutral-400 hover:border-orange-500/50 hover:text-orange-400'
      }`}
    >
      <div>{label}</div>
      {timestamp && (
        <div className="text-[10px] text-neutral-500 mt-1">{formatTimestamp(timestamp)}</div>
      )}
    </button>
  )

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 mb-6">
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => router.push('/')}
            className="text-neutral-500 hover:text-orange-400 text-sm jrv-transition mb-2 flex items-center gap-1"
          >
            ← Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{lead.business_name}</h1>
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[lead.status]}`}>
              {STATUS_LABELS[lead.status]}
            </span>
          </div>
          <p className="text-neutral-500 text-sm mt-1">
            Added {formatTimestamp(lead.created_at)}
            {lead.assigned_to && <span className="ml-3">Assigned: {lead.assigned_to}</span>}
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href={`/leads/${params.id}/proposal`}
            className="bg-orange-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-orange-700 jrv-transition"
          >
            📋 Proposal
          </a>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-400 hover:text-red-300 text-sm px-3 py-2.5 jrv-transition border border-red-900/50 rounded-lg hover:border-red-700"
          >
            {deleting ? 'Deleting...' : '🗑 Delete'}
          </button>
        </div>
      </div>

      {/* Section 1 — Info Grid */}
      <Section title="Business Information">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <InfoRow label="Sector">{lead.sector}</InfoRow>
          <InfoRow label="Rating">
            {lead.rating ? <span className="text-orange-400">★ {lead.rating}</span> : null}
            {lead.review_count ? <span className="text-neutral-500 text-xs ml-1">({lead.review_count} reviews)</span> : null}
          </InfoRow>
          <InfoRow label="GBP Rating">
            {lead.gbp_rating !== null ? (
              <span className="text-orange-400">
                ★ {lead.gbp_rating.toFixed(1)}
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
          <InfoRow label="Is Zero State">
            <span className={lead.is_zero_state ? 'text-orange-400' : 'text-neutral-600'}>
              {lead.is_zero_state ? 'Yes' : 'No'}
            </span>
          </InfoRow>
          <InfoRow label="Enrichment Complete">
            <span className={lead.enrichment_complete ? 'text-green-400' : 'text-neutral-600'}>
              {lead.enrichment_complete ? '✅ Complete' : '—'}
            </span>
          </InfoRow>
          <InfoRow label="Assigned To">{lead.assigned_to}</InfoRow>
          <InfoRow label="Enriched By">{lead.enriched_by}</InfoRow>
        </div>
      </Section>

      {/* Section 2 — Links */}
      <Section title="Links & Actions">
        <div className="flex flex-wrap gap-3">
          {lead.google_maps_url && (
            <a
              href={lead.google_maps_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-neutral-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-neutral-700 jrv-transition border border-neutral-700"
            >
              📍 Google Maps
            </a>
          )}
          <a
            href={`/leads/${params.id}/proposal`}
            className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-orange-700 jrv-transition"
          >
            📋 Generate Proposal
          </a>
        </div>
      </Section>

      {/* Section 3 — Notes */}
      <Section title="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-lg p-3 text-sm jrv-transition resize-y"
          placeholder="Add notes about this lead..."
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-orange-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-orange-700 jrv-transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Section>

      {/* Section 4 — Status Management */}
      <Section title="Status Management">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
            className="bg-orange-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-orange-700 jrv-transition disabled:opacity-50"
          >
            {saving ? 'Updating...' : 'Update Status'}
          </button>
        </div>
      </Section>

      {/* Section 5 — Enrichment Data */}
      {enrichmentData && (
        <Section title="Enrichment Data">
          <div className="space-y-6">
            {enrichmentData.market_intel && (
              <div>
                <h3 className="text-sm font-semibold text-orange-400 mb-2">📊 Market Intel</h3>
                <div className="bg-neutral-800 rounded-lg p-4 text-sm text-neutral-300 whitespace-pre-wrap">
                  {typeof enrichmentData.market_intel === 'object'
                    ? JSON.stringify(enrichmentData.market_intel, null, 2)
                    : enrichmentData.market_intel}
                </div>
              </div>
            )}
            {enrichmentData.digital_audit && (
              <div>
                <h3 className="text-sm font-semibold text-orange-400 mb-2">🔍 Digital Audit</h3>
                <div className="bg-neutral-800 rounded-lg p-4 text-sm text-neutral-300 whitespace-pre-wrap">
                  {typeof enrichmentData.digital_audit === 'object'
                    ? JSON.stringify(enrichmentData.digital_audit, null, 2)
                    : enrichmentData.digital_audit}
                </div>
              </div>
            )}
            {enrichmentData.tech_scope && (
              <div>
                <h3 className="text-sm font-semibold text-orange-400 mb-2">⚙️ Tech Scope</h3>
                <div className="bg-neutral-800 rounded-lg p-4 text-sm text-neutral-300 whitespace-pre-wrap">
                  {typeof enrichmentData.tech_scope === 'object'
                    ? JSON.stringify(enrichmentData.tech_scope, null, 2)
                    : enrichmentData.tech_scope}
                </div>
              </div>
            )}
            {enrichmentData.pitch_deck && (
              <div>
                <h3 className="text-sm font-semibold text-orange-400 mb-2">🎯 Pitch Deck</h3>
                <div className="bg-neutral-800 rounded-lg p-4 text-sm text-neutral-300 whitespace-pre-wrap">
                  {typeof enrichmentData.pitch_deck === 'object'
                    ? JSON.stringify(enrichmentData.pitch_deck, null, 2)
                    : enrichmentData.pitch_deck}
                </div>
              </div>
            )}
            {enrichmentData.proposal_content && (
              <div>
                <h3 className="text-sm font-semibold text-orange-400 mb-2">📋 Proposal Content</h3>
                <a
                  href={`/leads/${params.id}/proposal`}
                  className="text-orange-400 hover:text-orange-300 text-sm underline underline-offset-2 jrv-transition"
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
        <Section title="Competitors">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competitors.map((comp: Record<string, any>, idx: number) => (
              <div
                key={idx}
                className="bg-neutral-800 rounded-lg border border-neutral-700 p-4"
              >
                <h3 className="text-sm font-semibold text-white mb-2">
                  {comp.name || comp.business_name || `Competitor ${idx + 1}`}
                </h3>
                <div className="text-xs text-neutral-400 space-y-1">
                  {comp.rating && (
                    <p><span className="text-neutral-500">Rating:</span> ★ {comp.rating}</p>
                  )}
                  {comp.reviews && (
                    <p><span className="text-neutral-500">Reviews:</span> {comp.reviews}</p>
                  )}
                  {comp.address && (
                    <p><span className="text-neutral-500">Address:</span> {comp.address}</p>
                  )}
                  {comp.website && (
                    <p>
                      <span className="text-neutral-500">Website:</span>{' '}
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
                  {comp.strengths && (
                    <p><span className="text-neutral-500">Strengths:</span> {comp.strengths}</p>
                  )}
                  {comp.weaknesses && (
                    <p><span className="text-neutral-500">Weaknesses:</span> {comp.weaknesses}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Friction Reviews */}
      {frictionReviews && frictionReviews.length > 0 && (
        <Section title="Friction Reviews">
          <div className="space-y-3">
            {frictionReviews.map((review: Record<string, any>, idx: number) => (
              <div
                key={idx}
                className="bg-neutral-800 rounded-lg border border-neutral-700 p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  {review.author && (
                    <span className="text-xs text-neutral-500">{review.author}</span>
                  )}
                  {review.rating && (
                    <span className="text-orange-400 text-xs">★ {review.rating}</span>
                  )}
                </div>
                <p className="text-sm text-neutral-300">{review.text || review.comment || ''}</p>
                {review.date && (
                  <p className="text-xs text-neutral-600 mt-1">{review.date}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
