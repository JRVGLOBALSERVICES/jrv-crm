'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function NewLeadPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    business_name: '',
    sector: '',
    rating: '',
    review_count: '',
    current_web_presence: '',
    why_they_need_website: '',
    recommended_domain: '',
    google_maps_url: '',
    phone: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (!form.business_name.trim()) {
      setError('Business name is required')
      setSaving(false)
      return
    }

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        review_count: form.review_count ? parseInt(form.review_count) : null,
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

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add New Lead</h1>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Name *
          </label>
          <input
            type="text"
            name="business_name"
            value={form.business_name}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. Seremban Auto Spa"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sector
            </label>
            <input
              type="text"
              name="sector"
              value={form.sector}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              placeholder="e.g. Auto Services"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rating
            </label>
            <input
              type="text"
              name="rating"
              value={form.rating}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              placeholder="e.g. 4.8 Stars"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Review Count
            </label>
            <input
              type="number"
              name="review_count"
              value={form.review_count}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              placeholder="e.g. 150"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              placeholder="+6012-345 6789"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Web Presence
          </label>
          <input
            type="text"
            name="current_web_presence"
            value={form.current_web_presence}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm"
            placeholder="No website / Facebook only / Outdated template"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Why They Need a Website
          </label>
          <input
            type="text"
            name="why_they_need_website"
            value={form.why_they_need_website}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm"
            placeholder="e.g. Losing customers to competitors with online booking"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recommended Domain
            </label>
            <input
              type="text"
              name="recommended_domain"
              value={form.recommended_domain}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              placeholder="business.com.my"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Maps URL
            </label>
            <input
              type="text"
              name="google_maps_url"
              value={form.google_maps_url}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              placeholder="https://maps.google.com/..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm"
            placeholder="Any additional info..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Lead'}
          </button>
          <a
            href="/"
            className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
