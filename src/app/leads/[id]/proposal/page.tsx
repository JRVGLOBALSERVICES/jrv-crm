'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/types'

const TIERS = [
  { key: 'tier1', label: 'Tier 1', price: 'RM 2,500' },
  { key: 'tier2', label: 'Tier 2', price: 'RM 8,000' },
  { key: 'tier3', label: 'Tier 3', price: 'RM 18,000+' },
]

// Normalize all sub-agent output formats to { tier1: { stitch, claude }, ... }
function extractPrompts(raw: any) {
  const out: Record<string, Record<string, string>> = {
    tier1: { stitch: '', claude: '' },
    tier2: { stitch: '', claude: '' },
    tier3: { stitch: '', claude: '' },
  }
  if (!raw) return { data: out, research: null }

  let source: any = null
  let research: any = null

  // Determine source — could be raw itself, raw.prompts, raw.prompt, or stitch_prompts/claude_prompts
  if (raw.tier1 || raw.tier_1) source = raw
  else if (raw.prompts) { source = raw.prompts; research = raw.research_summary || raw.research }
  else if (raw.prompt) source = raw.prompt
  else if (raw.stitch_prompts && typeof raw.stitch_prompts === 'object') {
    // Handle { stitch_prompts: { tier1: '...', ... }, claude_prompts: { tier1: '...', ... } } format
    for (const tier of ['tier1', 'tier2', 'tier3']) {
      if (raw.stitch_prompts[tier]) out[tier].stitch = raw.stitch_prompts[tier];
      if (raw.claude_prompts?.[tier]) out[tier].claude = raw.claude_prompts[tier];
    }
    source = out;
    research = raw.research_summary || raw.research || null;
  }

  if (!source) return { data: out, research: raw.research_summary || raw.research || null }

  // Get text from an entry (handles string, {content}, {prompt}, {text} etc.)
  const getText = (entry: any): string => {
    if (!entry) return ''
    if (typeof entry === 'string') return entry
    if (typeof entry.content === 'string') return entry.content
    if (typeof entry.prompt === 'string') return entry.prompt
    if (typeof entry.text === 'string') return entry.text
    return JSON.stringify(entry)
  }

  for (const short of ['tier1', 'tier2', 'tier3']) {
    const full = 'tier_' + short.slice(4) // tier_1, tier_2, tier_3
    const tierData = source[short] || source[full]
    if (tierData) {
      out[short].stitch = getText(tierData.stitch)
      out[short].claude = getText(tierData.claude)
    }

    // Also check flat keys like tier1_stitch/tier_1_stitch
    for (const prefix of [short, full]) {
      const s = source[prefix + '_stitch']
      const c = source[prefix + '_claude']
      if (s) out[short].stitch = getText(s)
      if (c) out[short].claude = getText(c)
    }
  }

  return { data: out, research }
}

export default function ProposalPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [prompts, setPrompts] = useState<Record<string, Record<string, string>> | null>(null)
  const [research, setResearch] = useState<any>(null)
  const [activeTier, setActiveTier] = useState('tier1')
  const [activeTool, setActiveTool] = useState('claude')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) { setError(error.message); setLoading(false); return }
        setLead(data)
        if (data.notes) {
          try {
            const notes = JSON.parse(data.notes)
            const lap = notes.lead_architect_prompts
            if (lap) {
              const { data: pd, research: rs } = extractPrompts(lap)
              setPrompts(pd)
              setResearch(rs)
            }
          } catch {}
        }
        setLoading(false)
      })
  }, [id])

  const activeContent = prompts?.[activeTier]?.[activeTool] || ''

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-8">
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
      <div className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-red-400">{error || 'Not found'}</p>
          <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-orange-600 rounded-lg text-sm">Back</button>
        </div>
      </div>
    )
  }

  if (!prompts) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => router.push(`/leads/${id}`)} className="mb-6 text-sm text-orange-400 flex items-center gap-1.5">← Back</button>
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📋</div>
            <h1 className="text-2xl font-bold mb-2">No Proposal Yet</h1>
            <p className="text-sm text-neutral-400 mb-8">
              No proposal for <strong>{lead.business_name}</strong> yet.
              {lead.status === 'replied' || lead.status === 'pitched' ? ' Will generate on next cycle.' : ' Lead needs to be Replied/Pitched.'}
            </p>
            <button onClick={() => router.push(`/leads/${id}`)} className="px-6 py-3 bg-orange-600 rounded-lg text-sm font-medium">Back to Lead</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => router.push(`/leads/${id}`)} className="mb-4 text-sm text-orange-400 flex items-center gap-1.5">← Back to Lead</button>

        <h1 className="text-xl sm:text-2xl font-bold break-words mb-1">{lead.business_name}</h1>
        <p className="text-sm text-neutral-500 mb-6">{lead.sector || 'General'} · {lead.gbp_rating}★ ({lead.gbp_review_count} reviews)</p>

        {/* Research Summary */}
        {research && (
          <details className="mb-4 bg-neutral-900/60 rounded-xl border border-neutral-800 overflow-hidden">
            <summary className="text-xs sm:text-sm font-medium text-neutral-400 hover:text-orange-400 cursor-pointer select-none px-4 py-3">🔍 Research Summary — click to expand</summary>
            <div className="px-4 pb-4 space-y-2 text-xs text-neutral-500 max-h-48 overflow-y-auto">
              {research.social_media && <p><span className="text-neutral-400 font-medium">Social:</span> {research.social_media}</p>}
              {research.google_maps_visuals && <p><span className="text-neutral-400 font-medium">Visuals:</span> {research.google_maps_visuals}</p>}
              {research.sector_trends && <p><span className="text-neutral-400 font-medium">Trends:</span> {typeof research.sector_trends === 'string' ? research.sector_trends : JSON.stringify(research.sector_trends).slice(0, 500)}</p>}
            </div>
          </details>
        )}

        {/* Tier Tabs */}
        <div className="flex gap-2 mb-3">
          {TIERS.map(t => (
            <button key={t.key} onClick={() => setActiveTier(t.key)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                activeTier === t.key ? 'bg-orange-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}>
              {t.label}
              <span className="block text-[9px] sm:text-[10px] opacity-70">{t.price}</span>
            </button>
          ))}
        </div>

        {/* Tool Toggle */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setActiveTool('claude')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium border transition ${
              activeTool === 'claude' ? 'bg-orange-600/20 border-orange-500/40 text-orange-400' : 'bg-neutral-800 border-neutral-700 text-neutral-500'
            }`}>
            🤖 Claude Build Prompt
          </button>
          <button onClick={() => setActiveTool('stitch')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium border transition ${
              activeTool === 'stitch' ? 'bg-orange-600/20 border-orange-500/40 text-orange-400' : 'bg-neutral-800 border-neutral-700 text-neutral-500'
            }`}>
            🎨 Stitch Image Prompt
          </button>
        </div>

        {/* Copy + Stats */}
        <div className="flex items-center gap-4 mb-4 text-xs text-neutral-600">
          <button onClick={() => { navigator.clipboard.writeText(activeContent); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="hover:text-orange-400 transition flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <span>{activeContent.split(/\s+/).filter(Boolean).length} words</span>
          <span>{activeContent.length} chars</span>
        </div>

        {/* Prompt Content */}
        {activeContent ? (
          <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-4 sm:p-8 overflow-x-auto">
            <pre className="text-xs sm:text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap font-sans break-words">{activeContent}</pre>
          </div>
        ) : (
          <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-8 text-center">
            <p className="text-sm text-neutral-600">No content for this selection</p>
          </div>
        )}
      </div>
    </div>
  )
}
