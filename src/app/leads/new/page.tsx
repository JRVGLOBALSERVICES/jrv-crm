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

const fieldVariants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.23, 1, 0.32, 1] as const,
      delay: 0.05 + i * 0.04,
    },
  }),
}

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setFieldErrors({})

    const errors: Record<string, string> = {}
    if (!form.business_name.trim()) {
      errors.business_name = 'Business name is required'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError('Please fix the errors below')
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
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    // Clear field error on change
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
    if (error) setError('')
  }

  const fields = [
    {
      key: 'business_name',
      label: 'Business Name',
      required: true,
      placeholder: 'e.g. Seremban Auto Spa',
      type: 'text',
      span: 'full',
    },
    {
      key: 'sector',
      label: 'Sector',
      placeholder: 'e.g. Auto Services',
      type: 'text',
      span: 'half',
    },
    {
      key: 'rating',
      label: 'Rating',
      placeholder: 'e.g. 4.8 Stars',
      type: 'text',
      span: 'half',
    },
    {
      key: 'review_count',
      label: 'Review Count',
      placeholder: 'e.g. 150',
      type: 'number',
      span: 'half',
    },
    {
      key: 'phone',
      label: 'Phone',
      placeholder: '+6012-345 6789',
      type: 'text',
      span: 'half',
    },
    {
      key: 'current_web_presence',
      label: 'Current Web Presence',
      placeholder: 'No website / Facebook only / Outdated template',
      type: 'text',
      span: 'full',
    },
    {
      key: 'why_they_need_website',
      label: 'Why They Need a Website',
      placeholder: 'e.g. Losing customers to competitors with online booking',
      type: 'text',
      span: 'full',
    },
    {
      key: 'recommended_domain',
      label: 'Recommended Domain',
      placeholder: 'business.com.my',
      type: 'text',
      span: 'half',
    },
    {
      key: 'google_maps_url',
      label: 'Google Maps URL',
      placeholder: 'https://maps.google.com/...',
      type: 'text',
      span: 'half',
    },
    {
      key: 'notes',
      label: 'Notes',
      placeholder: 'Any additional info...',
      type: 'textarea',
      span: 'full',
    },
  ]

  return (
    <motion.div
      className="max-w-2xl mx-auto"
      variants={formVariants}
      initial="hidden"
      animate="show"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Add New Lead</h1>
          <p className="text-sm text-neutral-500 mt-1">Enter the details of a new business lead</p>
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
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 sm:p-6 space-y-5">
          {fields.map((field, i) => (
            <motion.div
              key={field.key}
              custom={i}
              variants={fieldVariants}
              initial="hidden"
              animate="show"
              className={field.span === 'half' ? 'sm:col-span-1' : 'sm:col-span-2'}
              style={field.span === 'half' ? {} : {}}
            >
              <div className={field.span === 'half' && i % 2 === 0 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}>
                {field.span === 'half' && i % 2 === 1 ? null : (
                  <div className={field.span === 'half' ? '' : ''}>
                    <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                      {field.label}
                      {field.required && <span className="text-orange-500 ml-0.5">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        name={field.key}
                        value={form[field.key as keyof typeof form]}
                        onChange={handleChange}
                        rows={3}
                        className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2.5 rounded-lg text-sm jrv-transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-y placeholder:text-neutral-600"
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <input
                        type={field.type}
                        name={field.key}
                        value={form[field.key as keyof typeof form]}
                        onChange={handleChange}
                        className={`w-full bg-neutral-800 border text-white px-3 py-2.5 rounded-lg text-sm jrv-transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500 placeholder:text-neutral-600 ${
                          fieldErrors[field.key]
                            ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500'
                            : 'border-neutral-700'
                        }`}
                        placeholder={field.placeholder}
                      />
                    )}
                    {fieldErrors[field.key] && (
                      <p className="mt-1 text-xs text-red-400">{fieldErrors[field.key]}</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Manual rendering for grid layout */}
          {fields.filter(f => f.span === 'half').length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.filter(f => f.span === 'half').map((field, i) => (
                <motion.div
                  key={field.key}
                  custom={i + fields.indexOf(fields.find(f => f.span === 'full')!)}
                  variants={fieldVariants}
                  initial="hidden"
                  animate="show"
                >
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    {field.label}
                    {field.required && <span className="text-orange-500 ml-0.5">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      name={field.key}
                      value={form[field.key as keyof typeof form]}
                      onChange={handleChange}
                      rows={3}
                      className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2.5 rounded-lg text-sm jrv-transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-y placeholder:text-neutral-600"
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      type={field.type}
                      name={field.key}
                      value={form[field.key as keyof typeof form]}
                      onChange={handleChange}
                      className={`w-full bg-neutral-800 border text-white px-3 py-2.5 rounded-lg text-sm jrv-transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500 placeholder:text-neutral-600 ${
                        fieldErrors[field.key]
                          ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500'
                          : 'border-neutral-700'
                      }`}
                      placeholder={field.placeholder}
                    />
                  )}
                  {fieldErrors[field.key] && (
                    <p className="mt-1 text-xs text-red-400">{fieldErrors[field.key]}</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="submit"
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
            ) : 'Save Lead'}
          </button>
          <a
            href="/"
            className="bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 px-6 py-2.5 rounded-lg text-sm font-medium jrv-transition border border-neutral-700 press-feedback inline-flex items-center"
          >
            Cancel
          </a>
        </div>
      </form>
    </motion.div>
  )
}
