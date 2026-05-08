'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/types'

export default function ProposalPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [proposalContent, setProposalContent] = useState<string | null>(null)
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
            if (notes.proposal_content) {
              setProposalContent(notes.proposal_content)
            }
          } catch {
            // notes is not JSON, no proposal
          }
        }
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="max-w-4xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-neutral-800 rounded w-1/3" />
          <div className="h-64 bg-neutral-800 rounded" />
        </div>
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-red-400 text-lg">{error || 'Lead not found'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-orange-600 rounded hover:bg-orange-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!proposalContent) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push(`/leads/${id}`)}
            className="mb-6 text-orange-400 hover:text-orange-300 transition flex items-center gap-2"
          >
            ← Back to {lead.business_name}
          </button>

          <div className="text-center py-20">
            <div className="text-6xl mb-4">📋</div>
            <h1 className="text-2xl font-bold mb-2">No Proposal Yet</h1>
            <p className="text-neutral-400 mb-8">
              A proposal hasn't been generated for <strong>{lead.business_name}</strong> yet.
              {lead.status === 'replied' || lead.status === 'pitched'
                ? ' The system will generate one automatically on the next hourly cycle.'
                : ' The lead needs to be in "Replied" or "Pitched" status first.'}
            </p>
            <p className="text-sm text-neutral-500">
              Status: <span className="capitalize">{lead.status}</span>
            </p>
            <button
              onClick={() => router.push(`/leads/${id}`)}
              className="mt-6 px-6 py-3 bg-orange-600 rounded-lg hover:bg-orange-700 transition font-medium"
            >
              Back to Lead Details
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push(`/leads/${id}`)}
          className="mb-6 text-orange-400 hover:text-orange-300 transition flex items-center gap-2"
        >
          ← Back to {lead.business_name}
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Proposal: {lead.business_name}</h1>
          <span className="text-xs text-neutral-500">
            {(() => {
              try {
                const parsed = JSON.parse(lead.notes || '{}')
                if (parsed.proposal_generated_at) {
                  return new Date(parsed.proposal_generated_at).toLocaleDateString('en-MY', {
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })
                }
              } catch {}
              return ''
            })()}
          </span>
        </div>

        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 md:p-10 overflow-x-auto">
          <div className="prose prose-invert max-w-none prose-headings:text-orange-400 prose-a:text-orange-400 prose-strong:text-white prose-code:text-orange-300 prose-pre:bg-neutral-800 prose-pre:border prose-pre:border-neutral-700">
            <RenderMarkdown content={proposalContent} />
          </div>
        </div>
      </div>
    </div>
  )
}

function RenderMarkdown({ content }: { content: string }) {
  // Simple markdown renderer for basic formatting
  const lines = content.split('\n')
  const html = lines
    .map(line => {
      if (line.startsWith('# ')) return `<h1 class="text-3xl font-bold mt-8 mb-4 text-orange-400">${line.slice(2)}</h1>`
      if (line.startsWith('## ')) return `<h2 class="text-2xl font-bold mt-6 mb-3 text-orange-400">${line.slice(3)}</h2>`
      if (line.startsWith('### ')) return `<h3 class="text-xl font-semibold mt-5 mb-2">${line.slice(4)}</h3>`
      if (line.startsWith('#### ')) return `<h4 class="text-lg font-semibold mt-4 mb-2">${line.slice(5)}</h4>`
      if (line.startsWith('- ')) return `<li class="ml-4 text-neutral-300">${line.slice(2)}</li>`
      if (line.startsWith('> ')) return `<blockquote class="border-l-4 border-orange-500 pl-4 italic text-neutral-400 my-2">${line.slice(2)}</blockquote>`
      if (line.match(/^\d+\. /)) return `<li class="ml-6 list-decimal text-neutral-300">${line.replace(/^\d+\. /, '')}</li>`
      if (line.startsWith('| ')) {
        // Simple table handling
        if (line.includes('---')) return ''
        const cells = line.split('|').filter(Boolean).map(c => c.trim())
        return `<tr>${cells.map(c => `<td class="border border-neutral-700 px-3 py-1.5 text-sm">${c}</td>`).join('')}</tr>`
      }
      if (line.startsWith('```')) return '<pre class="bg-neutral-800 p-4 rounded-lg overflow-x-auto my-4 text-sm"><code>'
      if (line === '') return '<br/>'
      return `<p class="text-neutral-300 leading-relaxed my-1.5">${line}</p>`
    })
    .join('\n')

  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
