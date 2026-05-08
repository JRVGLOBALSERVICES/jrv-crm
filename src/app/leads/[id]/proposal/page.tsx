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
      <div className="min-h-screen bg-neutral-950 text-white px-3 py-3 md:p-8">
        <div className="max-w-4xl mx-auto animate-pulse space-y-4">
          <div className="h-6 md:h-8 bg-neutral-800 rounded w-1/3" />
          <div className="h-48 md:h-64 bg-neutral-800 rounded" />
        </div>
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white px-3 py-3 md:p-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm md:text-lg text-red-400">{error || 'Lead not found'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-orange-600 rounded hover:bg-orange-700 transition text-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!proposalContent) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white px-3 py-3 md:p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push(`/leads/${id}`)}
            className="mb-4 md:mb-6 text-xs md:text-sm text-orange-400 hover:text-orange-300 transition flex items-center gap-1.5"
          >
            ← Back
          </button>

          <div className="text-center py-10 sm:py-20">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">📋</div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2">No Proposal Yet</h1>
            <p className="text-xs sm:text-sm text-neutral-400 mb-6 sm:mb-8 px-4">
              No proposal for <strong>{lead.business_name}</strong> yet.
              {lead.status === 'replied' || lead.status === 'pitched'
                ? ' It will generate on the next hourly cycle.'
                : ' Lead needs to be in Replied/Pitched status.'}
            </p>
            <p className="text-xs sm:text-sm text-neutral-500">
              Status: <span className="capitalize">{lead.status}</span>
            </p>
            <button
              onClick={() => router.push(`/leads/${id}`)}
              className="mt-4 sm:mt-6 px-5 sm:px-6 py-2.5 sm:py-3 bg-orange-600 rounded-lg hover:bg-orange-700 transition text-sm font-medium"
            >
              Back to Lead
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-3 py-3 md:p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push(`/leads/${id}`)}
          className="mb-4 md:mb-6 text-xs md:text-sm text-orange-400 hover:text-orange-300 transition flex items-center gap-1.5"
        >
          ← Back
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4 md:mb-6">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold break-words">Proposal: {lead.business_name}</h1>
          <span className="text-[10px] sm:text-xs text-neutral-500 shrink-0">
            {(() => {
              try {
                const parsed = JSON.parse(lead.notes || '{}')
                if (parsed.proposal_generated_at) {
                  return new Date(parsed.proposal_generated_at).toLocaleDateString('en-MY', {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })
                }
              } catch {}
              return ''
            })()}
          </span>
        </div>

        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-3 sm:p-6 md:p-10 overflow-x-auto">
          <div className="max-w-full prose prose-invert prose-headings:text-orange-400 prose-a:text-orange-400 prose-strong:text-white prose-code:text-orange-300 prose-pre:bg-neutral-800 prose-pre:border prose-pre:border-neutral-700">
            <RenderMarkdown content={proposalContent} />
          </div>
        </div>
      </div>
    </div>
  )
}

function RenderMarkdown({ content }: { content: string }) {
  const lines = content.split('\n')
  const html = lines
    .map(line => {
      if (line.startsWith('# ')) return `<h1 class="text-xl sm:text-2xl md:text-3xl font-bold mt-5 sm:mt-8 mb-3 sm:mb-4 text-orange-400 break-words">${line.slice(2)}</h1>`
      if (line.startsWith('## ')) return `<h2 class="text-lg sm:text-xl md:text-2xl font-bold mt-4 sm:mt-6 mb-2 sm:mb-3 text-orange-400 break-words">${line.slice(3)}</h2>`
      if (line.startsWith('### ')) return `<h3 class="text-base sm:text-lg md:text-xl font-semibold mt-3 sm:mt-5 mb-2 break-words">${line.slice(4)}</h3>`
      if (line.startsWith('#### ')) return `<h4 class="text-sm sm:text-base md:text-lg font-semibold mt-3 sm:mt-4 mb-1.5 break-words">${line.slice(5)}</h4>`
      if (line.startsWith('- ')) return `<li class="ml-3 sm:ml-4 text-sm sm:text-base text-neutral-300 break-words">${line.slice(2)}</li>`
      if (line.startsWith('> ')) return `<blockquote class="border-l-4 border-orange-500 pl-3 sm:pl-4 italic text-xs sm:text-sm text-neutral-400 my-2 break-words">${line.slice(2)}</blockquote>`
      if (line.match(/^\d+\. /)) return `<li class="ml-5 sm:ml-6 list-decimal text-sm sm:text-base text-neutral-300 break-words">${line.replace(/^\d+\. /, '')}</li>`
      if (line.startsWith('| ')) {
        if (line.includes('---')) return ''
        const cells = line.split('|').filter(Boolean).map(c => c.trim())
        return `<tr>${cells.map(c => `<td class="border border-neutral-700 px-1.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-sm break-words">${c}</td>`).join('')}</tr>`
      }
      if (line.startsWith('```')) return '<pre class="bg-neutral-800 p-2 sm:p-4 rounded-lg overflow-x-auto my-3 sm:my-4 text-[10px] sm:text-sm max-w-full"><code class="break-words">'
      if (line === '') return '<br/>'
      return `<p class="text-xs sm:text-sm md:text-base text-neutral-300 leading-relaxed my-1 sm:my-1.5 break-words">${line}</p>`
    })
    .join('\n')

  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
