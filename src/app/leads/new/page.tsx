'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion } from 'framer-motion'

const formVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] as const },
  },
}

export default function NewLeadPage() {
  const router = useRouter()
  const [mapsUrl, setMapsUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function extractNameFromUrl(url: string): string | null {
    try {
      const u = new URL(url)
      // Typical: /maps/place/Business+Name/@lat,lng or /place/Business+Name/
      const parts = u.pathname.split('/')
      const placeIdx = parts.findIndex(p => p === 'place')
      if (placeIdx !== -1 && parts[placeIdx + 1]) {
        return decodeURIComponent(parts[placeIdx + 1].replace(/\+/g, ' '))
      }
      // Another pattern: /maps?q=Business+Name+Seremban
      const q = u.searchParams.get('q')
      if (q) return q.split(/[,+]/).filter(Boolean).slice(0, 2).join(' ')
    } catch {}
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = mapsUrl.trim()
    if (!url) {
      setError('Please paste a Google Maps link')
      return
    }

    // Validate it looks like a Google Maps URL
    if (!url.match(/google\.[a-z.]+\/maps/i)) {
      setError('That doesn\'t look like a Google Maps URL. Make sure it starts with https://maps.google.com/... or https://www.google.com/maps/...')
      return
    }

    setSaving(true)
    setError('')

    const businessName = extractNameFromUrl(url) || 'New Lead'

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: businessName,
        google_maps_url: url,
        status: 'new',
        assigned_to: 'Vir',
        notes: null,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to create lead')
      setSaving(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <motion.div
      className="max-w-lg mx-auto"
      variants={formVariants}
      initial="hidden"
      animate="show"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Add Lead</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Paste a Google Maps link — enrichment runs automatically
          </p>
        </div>
        <a
          href="/"
          className="text-sm text-neutral-500 hover:text-orange-400 jrv-transition press-feedback"
        >
          ← Back
        </a>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-900/20 border border-red-800/40 text-red-400 p-3 rounded-lg mb-4 text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 sm:p-6">
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Google Maps Link <span className="text-orange-500">*</span>
          </label>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={mapsUrl}
              onChange={(e) => {
                setMapsUrl(e.target.value)
                if (error) setError('')
              }}
              placeholder="https://maps.google.com/maps/place/Business+Name/"
              className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-3 rounded-lg text-sm jrv-transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500 placeholder:text-neutral-600"
              autoFocus
            />
            <p className="text-xs text-neutral-600 leading-relaxed">
              Open the business on Google Maps, copy the URL from your browser, and paste it here.
              Our system will automatically extract the business info and run a full research pipeline.
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg text-sm font-medium jrv-transition disabled:opacity-50 press-feedback"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Adding...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Lead & Auto-Enrich
                </span>
              )}
            </button>
            <a
              href="/"
              className="bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 px-5 py-3 rounded-lg text-sm font-medium jrv-transition border border-neutral-700 press-feedback inline-flex items-center"
            >
              Cancel
            </a>
          </div>
        </div>

        {/* How it works card */}
        <div className="mt-5 bg-neutral-900/60 rounded-xl border border-neutral-800 p-5">
          <h3 className="text-sm font-semibold text-orange-400 mb-3">What happens next</h3>
          <div className="space-y-2.5">
            {[
              { step: '1', text: 'Lead created with the business name extracted from the Maps URL' },
              { step: '2', text: 'Within 15 minutes, a system agent scrapes GBP data (rating, reviews, address, hours, phone, website)' },
              { step: '3', text: 'A research sub-agent runs the full Marvel enrichment pipeline — market intel, digital audit, tech scope, pitch deck' },
              { step: '4', text: 'You get a fully enriched lead with competitors analysis, friction reviews, and proposal-ready data' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-orange-600/20 border border-orange-600/40 flex items-center justify-center text-orange-400 text-[10px] font-bold shrink-0 mt-0.5">
                  {item.step}
                </span>
                <span className="text-xs text-neutral-400 leading-relaxed">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </form>
    </motion.div>
  )
}
