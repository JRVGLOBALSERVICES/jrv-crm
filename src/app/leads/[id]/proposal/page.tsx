'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/types'

interface TierPrompts {
  stitch: string
  claude: string
}

interface LeadPrompts {
  tier1?: TierPrompts
  tier2?: TierPrompts
  tier3?: TierPrompts
}

export default function ProposalPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [prompts, setPrompts] = useState<LeadPrompts | null>(null)
  const [activeTier, setActiveTier] = useState<'tier1' | 'tier2' | 'tier3'>('tier1')
  const [activeTool, setActiveTool] = useState<'claude' | 'stitch'>('claude')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message)
          setLoading(false)
          return
        }
        setLead(data)
        if (data.notes) {
          try {
            const notes = JSON.parse(data.notes)
            if (notes.lead_architect_prompts) {
              setPrompts(notes.lead_architect_prompts)
            }
          } catch {}
        }
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white px-4 py-8">
        <div className="max-w-4xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-neutral-800 rounded w-1/3" />
          <div className="h-12 bg-neutral-800 rounded" />
          <div className="h-96 bg-neutral-800 rounded" />
        </div>
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-red-400">{error || 'Lead not found'}</p>
          <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-orange-600 rounded-lg hover:bg-orange-700 transition text-sm">Go Back</button>
        </div>
      </div>
    )
  }

  if (!prompts) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => router.push(`/leads/${id}`)} className="mb-6 text-sm text-orange-400 hover:text-orange-300 transition flex items-center gap-1.5">
            ← Back
          </button>
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📋</div>
            <h1 className="text-2xl font-bold mb-2">No Proposal Yet</h1>
            <p className="text-sm text-neutral-400 mb-8">
              No proposal for <strong>{lead.business_name}</strong> yet.
              {lead.status === 'replied' || lead.status === 'pitched'
                ? ' It will generate on the next hourly cycle.'
                : ' Lead needs to be in Replied/Pitched status.'}
            </p>
            <p className="text-sm text-neutral-500">Status: <span className="capitalize">{lead.status}</span></p>
            <button onClick={() => router.push(`/leads/${id}`)} className="mt-6 px-6 py-3 bg-orange-600 rounded-lg hover:bg-orange-700 transition text-sm font-medium">
              Back to Lead
            </button>
          </div>
        </div>
      </div>
    )
  }

  const tiers: Array<{ key: 'tier1' | 'tier2' | 'tier3'; label: string; price: string }> = [
    { key: 'tier1', label: 'Tier 1 — Credibility', price: 'RM 2,500' },
    { key: 'tier2', label: 'Tier 2 — Lead Gen', price: 'RM 8,000' },
    { key: 'tier3', label: 'Tier 3 — Ecosystem', price: 'RM 18,000+' },
  ]

  const activePrompt = prompts[activeTier]?.[activeTool === 'claude' ? 'claude' : 'stitch'] || ''

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => router.push(`/leads/${id}`)} className="mb-4 text-sm text-orange-400 hover:text-orange-300 transition flex items-center gap-1.5">
          ← Back to Lead
        </button>

        <h1 className="text-xl sm:text-2xl font-bold break-words mb-1">Proposal: {lead.business_name}</h1>
        <p className="text-sm text-neutral-500 mb-6">
          {lead.sector || 'General'} · {lead.gbp_rating}★ ({lead.gbp_review_count} reviews)
        </p>

        {/* Tier Selector */}
        <div className="flex gap-2 mb-4">
          {tiers.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTier(t.key)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTier === t.key
                  ? 'bg-orange-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
              }`}
            >
              {t.label}
              <span className="block text-[10px] opacity-70">{t.price}</span>
            </button>
          ))}
        </div>

        {/* Tool Toggle */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'claude' as const, label: '🤖 Claude Build Prompt', desc: 'Vision for the website' },
            { key: 'stitch' as const, label: '🎨 Stitch Image Prompt', desc: 'Visual design mockup' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTool(t.key)}
              className={`px-4 py-2 rounded-lg text-sm transition flex-1 sm:flex-none ${
                activeTool === t.key
                  ? 'bg-orange-600/20 border border-orange-500/40 text-orange-400'
                  : 'bg-neutral-800 border border-neutral-700 text-neutral-500 hover:text-white'
              }`}
            >
              <div className="font-medium">{t.label}</div>
              <div className="text-[10px] opacity-60">{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Copy Button */}
        <button
          onClick={() => navigator.clipboard.writeText(activePrompt)}
          className="mb-4 text-xs text-neutral-500 hover:text-orange-400 transition flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy to clipboard
        </button>

        {/* Prompt Content */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 sm:p-8 overflow-x-auto">
          <div className="max-w-full prose prose-invert prose-headings:text-orange-400 prose-a:text-orange-400 prose-strong:text-white prose-code:text-orange-300 prose-pre:bg-neutral-800 prose-pre:border prose-pre:border-neutral-700">
            <RenderMarkdown content={activePrompt} />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 flex flex-wrap gap-4 text-xs text-neutral-600">
          <span>📝 {activePrompt.split(' ').length} words</span>
          <span>📐 {activePrompt.length} characters</span>
          <span>📄 {activePrompt.split('\n').length} lines</span>
        </div>
      </div>
    </div>
  )
}

function RenderMarkdown({ content }: { content: string }) {
  const lines = content.split('\n')
  const html = lines.map(line => {
    if (line.startsWith('# ')) return `<h1 class="text-xl sm:text-2xl font-bold mt-6 mb-3 text-orange-400 break-words">${line.slice(2)}</h1>`
    if (line.startsWith('## ')) return `<h2 class="text-lg sm:text-xl font-bold mt-5 mb-2 text-orange-400 break-words">${line.slice(3)}</h2>`
    if (line.startsWith('### ')) return `<h3 class="text-base sm:text-lg font-semibold mt-4 mb-2 break-words">${line.slice(4)}</h3>`
    if (line.startsWith('#### ')) return `<h4 class="text-sm sm:text-base font-semibold mt-3 mb-1 break-words">${line.slice(5)}</h4>`
    if (line.startsWith('- ')) return `<li class="ml-4 text-sm sm:text-base text-neutral-300 break-words">${line.slice(2)}</li>`
    if (line.startsWith('> ')) return `<blockquote class="border-l-4 border-orange-500 pl-4 italic text-sm text-neutral-400 my-2 break-words">${line.slice(2)}</blockquote>`
    if (line.match(/^\d+\. /)) return `<li class="ml-6 list-decimal text-sm sm:text-base text-neutral-300 break-words">${line.replace(/^\d+\. /, '')}</li>`
    if (line.startsWith('| ')) {
      if (line.includes('---')) return ''
      const cells = line.split('|').filter(Boolean).map(c => c.trim())
      return `<tr>${cells.map(c => `<td class="border border-neutral-700 px-3 py-1.5 text-sm break-words">${c}</td>`).join('')}</tr>`
    }
    if (line.startsWith('```')) return '<pre class="bg-neutral-800 p-4 rounded-lg overflow-x-auto my-4 text-sm max-w-full"><code class="break-words whitespace-pre-wrap">'
    if (line === '') return '<br/>'
    return `<p class="text-sm sm:text-base text-neutral-300 leading-relaxed my-1 break-words">${line}</p>`
  }).join('\n')

  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
