'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Lead, STATUS_LABELS, STATUS_COLORS, LeadStatus } from '@/lib/types'

interface LeadsResponse {
  data: Lead[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const SECTORS = [
  'Auto Services',
  'Restaurant / F&B',
  'Retail',
  'Healthcare',
  'Education',
  'Beauty & Salon',
  'Home Services',
  'Professional Services',
  'Technology',
  'Real Estate',
  'Travel & Hospitality',
  'Other',
]

export default function DashboardPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [sort, setSort] = useState('created_at')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  const LIMIT = 25

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (sectorFilter) params.set('sector', sectorFilter)
    params.set('page', String(page))
    params.set('limit', String(LIMIT))
    params.set('sort', sort)
    params.set('order', order)

    const res = await fetch(`/api/leads?${params.toString()}`)
    if (res.ok) {
      const data: LeadsResponse = await res.json()
      setLeads(data.data)
      setTotal(data.total)
      setPage(data.page)
      setTotalPages(data.totalPages)
    }
    setLoading(false)
  }, [search, statusFilter, sectorFilter, page, sort, order])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Stats
  const stats = {
    total,
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    replied: leads.filter((l) => l.status === 'replied').length,
    pitched: leads.filter((l) => l.status === 'pitched').length,
    closed: leads.filter((l) => l.status === 'closed').length,
    lost: leads.filter((l) => l.status === 'lost').length,
  }

  const statsCards = [
    { label: 'Total', count: stats.total, color: 'bg-neutral-600' },
    { label: 'New', count: stats.new, color: 'bg-orange-500' },
    { label: 'Contacted', count: stats.contacted, color: 'bg-amber-500' },
    { label: 'Replied', count: stats.replied, color: 'bg-purple-500' },
    { label: 'Pitched', count: stats.pitched, color: 'bg-orange-400' },
    { label: 'Closed', count: stats.closed, color: 'bg-green-500' },
    { label: 'Lost', count: stats.lost, color: 'bg-red-500' },
  ]

  const handleSort = (field: string) => {
    if (sort === field) {
      setOrder(order === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(field)
      setOrder('desc')
    }
    setPage(1)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sort !== field) return <span className="text-neutral-600 ml-1">↕</span>
    return <span className="text-orange-500 ml-1">{order === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <span className="text-sm text-neutral-500">{total} total leads</span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        {statsCards.map((card) => (
          <div
            key={card.label}
            className="bg-neutral-900 rounded-xl border border-neutral-800 p-4 jrv-transition hover:border-neutral-700"
          >
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${card.color}`} />
              <span className="text-sm text-neutral-400">{card.label}</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-white">{card.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <label className="block text-xs text-neutral-500 mb-1 uppercase tracking-wider">Search</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search business name..."
                className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg text-sm jrv-transition focus:border-orange-500"
              />
              <button
                type="submit"
                className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 jrv-transition"
              >
                Search
              </button>
            </div>
          </form>

          <div>
            <label className="block text-xs text-neutral-500 mb-1 uppercase tracking-wider">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg text-sm jrv-transition"
            >
              <option value="">All Statuses</option>
              {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1 uppercase tracking-wider">Sector</label>
            <select
              value={sectorFilter}
              onChange={(e) => { setSectorFilter(e.target.value); setPage(1) }}
              className="bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg text-sm jrv-transition"
            >
              <option value="">All Sectors</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {(search || statusFilter || sectorFilter) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setSectorFilter(''); setPage(1) }}
              className="text-orange-400 hover:text-orange-300 text-sm jrv-transition h-[38px] flex items-center"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50">
                <th
                  className="text-left p-3 font-medium text-neutral-400 cursor-pointer hover:text-orange-400 jrv-transition"
                  onClick={() => handleSort('business_name')}
                >
                  Business <SortIcon field="business_name" />
                </th>
                <th
                  className="text-left p-3 font-medium text-neutral-400 cursor-pointer hover:text-orange-400 jrv-transition"
                  onClick={() => handleSort('sector')}
                >
                  Sector <SortIcon field="sector" />
                </th>
                <th className="text-left p-3 font-medium text-neutral-400">Rating / Reviews</th>
                <th className="text-left p-3 font-medium text-neutral-400">Web Presence</th>
                <th className="text-left p-3 font-medium text-neutral-400">GBP</th>
                <th className="text-left p-3 font-medium text-neutral-400">Address</th>
                <th
                  className="text-left p-3 font-medium text-neutral-400 cursor-pointer hover:text-orange-400 jrv-transition"
                  onClick={() => handleSort('status')}
                >
                  Status <SortIcon field="status" />
                </th>
                <th className="text-left p-3 font-medium text-neutral-400">Enriched</th>
                <th
                  className="text-left p-3 font-medium text-neutral-400 cursor-pointer hover:text-orange-400 jrv-transition"
                  onClick={() => handleSort('created_at')}
                >
                  Added <SortIcon field="created_at" />
                </th>
                <th className="text-left p-3 font-medium text-neutral-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-neutral-500">
                    <div className="animate-pulse flex flex-col items-center gap-2">
                      <div className="h-4 w-32 bg-neutral-800 rounded" />
                      <div className="h-3 w-48 bg-neutral-800 rounded" />
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-neutral-500">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-lg font-medium text-neutral-400 mb-1">No leads found</p>
                    <p className="text-sm text-neutral-600">
                      {search || statusFilter || sectorFilter
                        ? 'Try adjusting your filters'
                        : 'Add your first lead to get started'}
                    </p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-neutral-800/50 cursor-pointer jrv-transition"
                    onClick={() => router.push(`/leads/${lead.id}`)}
                  >
                    <td className="p-3 font-medium text-white">{lead.business_name}</td>
                    <td className="p-3 text-neutral-400">{lead.sector || '—'}</td>
                    <td className="p-3 text-neutral-400">
                      <span className="text-orange-400">★</span>{' '}
                      {lead.rating || '—'}
                      {lead.review_count ? (
                        <span className="text-neutral-500 text-xs ml-1">({lead.review_count})</span>
                      ) : ''}
                    </td>
                    <td className="p-3 text-neutral-400 max-w-[120px] truncate" title={lead.current_web_presence || ''}>
                      {lead.current_web_presence || '—'}
                    </td>
                    <td className="p-3">
                      {lead.gbp_rating ? (
                        <span className="text-orange-400">
                          ★ {lead.gbp_rating.toFixed(1)}
                          {lead.gbp_review_count ? (
                            <span className="text-neutral-500 text-xs ml-1">({lead.gbp_review_count})</span>
                          ) : ''}
                        </span>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                    <td className="p-3 text-neutral-400 max-w-[150px] truncate" title={lead.address || ''}>
                      {lead.address || '—'}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[lead.status]}`}>
                        {STATUS_LABELS[lead.status]}
                      </span>
                    </td>
                    <td className="p-3">
                      {lead.enrichment_complete ? (
                        <span className="text-green-400 text-xs">✅ Complete</span>
                      ) : lead.enriched_by ? (
                        <span className="text-amber-400 text-xs">⏳ Partial</span>
                      ) : (
                        <span className="text-neutral-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 text-neutral-500 text-xs whitespace-nowrap">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/leads/${lead.id}`) }}
                        className="text-orange-400 hover:text-orange-300 text-sm font-medium jrv-transition"
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-800 bg-neutral-900/50">
            <span className="text-sm text-neutral-500">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-sm bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 jrv-transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 7) {
                  pageNum = i + 1
                } else if (page <= 4) {
                  pageNum = i + 1
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i
                } else {
                  pageNum = page - 3 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg text-sm jrv-transition ${
                      page === pageNum
                        ? 'bg-orange-600 text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg text-sm bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 jrv-transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
