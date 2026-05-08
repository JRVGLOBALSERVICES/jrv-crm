'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Lead, STATUS_LABELS, STATUS_COLORS } from '@/lib/types'

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<Lead['status']>('new')
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
      router.refresh()
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this lead permanently?')) return
    setDeleting(true)
    await fetch(`/api/leads/${params.id}`, { method: 'DELETE' })
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>
  }

  if (!lead) {
    return <div className="text-center py-12 text-gray-400">Lead not found</div>
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{lead.business_name}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Added{' '}
            {new Date(lead.created_at).toLocaleDateString('en-MY', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/leads/${params.id}/proposal`}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition"
          >
            📋 Proposal
          </a>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 text-sm hover:text-red-800 px-3 py-1"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-xs text-gray-500 uppercase">Sector</label>
            <p className="mt-1">{lead.sector || '—'}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase">Rating</label>
            <p className="mt-1">
              <span className="text-yellow-500">★</span>{' '}
              {lead.rating || '—'}
              {lead.review_count ? ` (${lead.review_count} reviews)` : ''}
            </p>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase">Current Web Presence</label>
            <p className="mt-1">{lead.current_web_presence || '—'}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase">Why Need Website</label>
            <p className="mt-1">{lead.why_they_need_website || '—'}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase">Recommended Domain</label>
            <p className="mt-1">
              {lead.recommended_domain ? (
                <a
                  href={`https://${lead.recommended_domain}`}
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  {lead.recommended_domain}
                </a>
              ) : (
                '—'
              )}
            </p>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase">Phone</label>
            <p className="mt-1">{lead.phone || '—'}</p>
          </div>
          {lead.google_maps_url && (
            <div className="col-span-2">
              <label className="text-xs text-gray-500 uppercase">Google Maps</label>
              <p className="mt-1">
                <a
                  href={lead.google_maps_url}
                  target="_blank"
                  className="text-blue-600 hover:underline text-sm break-all"
                >
                  {lead.google_maps_url}
                </a>
              </p>
            </div>
          )}
          {(lead as any).address && (
            <div className="col-span-2">
              <label className="text-xs text-gray-500 uppercase">Address</label>
              <p className="mt-1 text-sm">{(lead as any).address}</p>
            </div>
          )}
          {(lead as any).hours && (
            <div>
              <label className="text-xs text-gray-500 uppercase">Hours</label>
              <p className="mt-1 text-sm">{(lead as any).hours}</p>
            </div>
          )}
          {(lead as any).gbp_rating && (
            <div>
              <label className="text-xs text-gray-500 uppercase">GBP Rating</label>
              <p className="mt-1">{'★'.repeat(Math.round((lead as any).gbp_rating))} ({(lead as any).gbp_rating})</p>
            </div>
          )}
          {(lead as any).enriched_by && (
            <div>
              <label className="text-xs text-gray-500 uppercase">Enriched By</label>
              <p className="mt-1 text-sm capitalize">{(lead as any).enriched_by}</p>
            </div>
          )}
        </div>
      </div>

      {/* Status & Notes Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Update Lead</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STATUS_LABELS) as Lead['status'][]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  status === s
                    ? `${STATUS_COLORS[s]} ring-2 ring-offset-2 ring-gray-400`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm"
            placeholder="Add notes about this lead..."
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <a
            href="/"
            className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
