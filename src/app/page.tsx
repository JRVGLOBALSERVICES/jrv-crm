'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lead, STATUS_LABELS, STATUS_COLORS, LeadStatus } from '@/lib/types'

interface LeadsResponse {
  data: Lead[]
  total: number
  page: number
  limit: number
  totalPages: number
  counts: Record<string, number>
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

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] as const },
  },
}

const tableRowVariants = {
  hidden: { opacity: 0, x: -12 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.23, 1, 0.32, 1] as const,
      delay: 0.08 + i * 0.035,
    },
  }),
}

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
  const [counts, setCounts] = useState({ new: 0, contacted: 0, replied: 0, pitched: 0, closed: 0, lost: 0 })

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
      if (data.counts) setCounts(data.counts as { new: number; contacted: number; replied: number; pitched: number; closed: number; lost: number })
    }
    setLoading(false)
  }, [search, statusFilter, sectorFilter, page, sort, order])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Stats
  const stats = {
    total,
    new: counts.new,
    contacted: counts.contacted,
    replied: counts.replied,
    pitched: counts.pitched,
    closed: counts.closed,
    lost: counts.lost,
  }

  const statsCards = [
    { label: 'Total', count: stats.total, color: 'bg-neutral-500' },
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
    if (sort !== field) return <span className="text-neutral-700 ml-1 text-xs">↕</span>
    return <span className="text-orange-500 ml-1 text-xs">{order === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {total} lead{total !== 1 ? 's' : ''} tracked
          </p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-3 mb-6 sm:mb-8"
      >
        {statsCards.map((card) => (
          <motion.div
            key={card.label}
            whileHover={{ scale: 1.02, borderColor: '#FF4500' }}
            className="bg-neutral-900 rounded-xl border border-neutral-800 p-3 sm:p-4 jrv-transition cursor-default"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${card.color}`} />
              <span className="text-[10px] sm:text-xs text-neutral-500 font-medium uppercase tracking-wider">{card.label}</span>
            </div>
            <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-white tabular-nums">{card.count}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="bg-neutral-900 rounded-xl border border-neutral-800 p-4 sm:p-5 mb-6">
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 items-stretch sm:items-end">
          <form onSubmit={handleSearch} className="flex-1 min-w-0 sm:min-w-[200px]">
            <label className="block text-[10px] sm:text-[11px] text-neutral-500 mb-1 uppercase tracking-wider font-medium">Search</label>
            <div className="flex gap-1.5 sm:gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Business name..."
                className="w-full bg-neutral-800 border border-neutral-700 text-white px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm jrv-transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
              <button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium jrv-transition press-feedback"
              >
                Search
              </button>
            </div>
          </form>

          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
            <div>
              <label className="block text-[10px] sm:text-[11px] text-neutral-500 mb-1 uppercase tracking-wider font-medium">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                className="w-full bg-neutral-800 border border-neutral-700 text-white px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm jrv-transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              >
                <option value="">All</option>
                {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] text-neutral-500 mb-1 uppercase tracking-wider font-medium">Sector</label>
              <select
                value={sectorFilter}
                onChange={(e) => { setSectorFilter(e.target.value); setPage(1) }}
                className="w-full bg-neutral-800 border border-neutral-700 text-white px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm jrv-transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              >
                <option value="">All</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {(search || statusFilter || sectorFilter) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setSectorFilter(''); setPage(1) }}
              className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm jrv-transition h-auto sm:h-[42px] py-2 sm:py-0 flex items-center press-feedback font-medium"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </motion.div>

      {/* Leads Table */}
      <motion.div variants={itemVariants} className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-neutral-800">
                {[
                  { label: 'Business', field: 'business_name', hide: '' },
                  { label: 'Sector', field: 'sector', hide: 'hidden lg:table-cell' },
                  { label: 'Rtg', field: null, hide: 'hidden md:table-cell' },
                  { label: 'Web', field: null, hide: 'hidden lg:table-cell' },
                  { label: 'GBP', field: null, hide: 'hidden lg:table-cell' },
                  { label: 'Address', field: null, hide: 'hidden xl:table-cell' },
                  { label: 'Status', field: 'status', hide: '' },
                  { label: 'Enr', field: null, hide: 'hidden sm:table-cell' },
                  { label: 'Added', field: 'created_at', hide: 'hidden md:table-cell' },
                  { label: '', field: null, hide: '' },
                ].map((col, i) => (
                  <th
                    key={i}
                    className={`text-left p-2 sm:p-3 font-medium text-neutral-500 text-[10px] sm:text-xs uppercase tracking-wider whitespace-nowrap ${
                      col.field ? 'cursor-pointer hover:text-orange-400 jrv-transition select-none' : ''
                    } ${col.hide}`}
                    onClick={() => col.field && handleSort(col.field)}
                  >
                    {col.label}
                    {col.field && <SortIcon field={col.field} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="p-2 sm:p-3">
                        <div className="skeleton h-3 sm:h-4 w-full max-w-[80px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 sm:p-16 text-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                    >
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                        <svg className="w-7 h-7 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                      </div>
                      <p className="text-lg font-semibold text-neutral-300 mb-1">No leads found</p>
                      <p className="text-sm text-neutral-600">
                        {search || statusFilter || sectorFilter
                          ? 'Try adjusting your filters or clear them'
                          : 'Start by adding your first lead'}
                      </p>
                      {!(search || statusFilter || sectorFilter) && (
                        <a
                          href="/leads/new"
                          className="inline-flex mt-4 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium jrv-transition press-feedback"
                        >
                          + Add Lead
                        </a>
                      )}
                      {(search || statusFilter || sectorFilter) && (
                        <button
                          onClick={() => { setSearch(''); setStatusFilter(''); setSectorFilter(''); setPage(1) }}
                          className="inline-flex mt-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-5 py-2.5 rounded-lg text-sm font-medium jrv-transition press-feedback"
                        >
                          Clear Filters
                        </button>
                      )}
                    </motion.div>
                  </td>
                </tr>
              ) : (
                leads.map((lead, i) => (
                  <motion.tr
                    key={lead.id}
                    custom={i}
                    variants={tableRowVariants}
                    initial="hidden"
                    animate="show"
                    className="hover:bg-neutral-800/40 cursor-pointer jrv-transition table-row-accent group"
                    onClick={() => router.push(`/leads/${lead.id}`)}
                  >
                    <td className="p-2 sm:p-3 font-medium text-white group-hover:text-orange-400 jrv-transition text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
                      {lead.business_name}
                    </td>
                    <td className="p-2 sm:p-3 text-neutral-400 text-[10px] sm:text-xs hidden lg:table-cell">{lead.sector || <span className="text-neutral-700">—</span>}</td>
                    <td className="p-2 sm:p-3 text-neutral-400 text-[10px] sm:text-xs hidden md:table-cell">
                      {lead.rating ? (
                        <span>
                          <span className="text-orange-400">★</span> {lead.rating}
                          {lead.review_count && (
                            <span className="text-neutral-600 ml-1">({lead.review_count})</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-neutral-700">—</span>
                      )}
                    </td>
                    <td className="p-2 sm:p-3 max-w-[100px] sm:max-w-[120px] hidden lg:table-cell">
                      <span className="text-neutral-400 text-[10px] sm:text-xs truncate block" title={lead.current_web_presence || ''}>
                        {lead.current_web_presence || <span className="text-neutral-700">—</span>}
                      </span>
                    </td>
                    <td className="p-2 sm:p-3 text-[10px] sm:text-xs hidden lg:table-cell">
                      {lead.gbp_rating !== null ? (
                        <span className="text-orange-400">
                          ★ {lead.gbp_rating.toFixed(1)}
                          {lead.gbp_review_count ? (
                            <span className="text-neutral-500 ml-0.5">({lead.gbp_review_count})</span>
                          ) : ''}
                        </span>
                      ) : (
                        <span className="text-neutral-700">—</span>
                      )}
                    </td>
                    <td className="p-2 sm:p-3 max-w-[120px] sm:max-w-[150px] hidden xl:table-cell">
                      <span className="text-neutral-400 text-[10px] sm:text-xs truncate block" title={lead.address || ''}>
                        {lead.address || <span className="text-neutral-700">—</span>}
                      </span>
                    </td>
                    <td className="p-2 sm:p-3">
                      <span className={`inline-flex px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold border ${STATUS_COLORS[lead.status]}`}>
                        {STATUS_LABELS[lead.status]}
                      </span>
                    </td>
                    <td className="p-2 sm:p-3 hidden sm:table-cell">
                      {lead.enrichment_complete ? (
                        <span className="text-green-400/80 text-[10px] sm:text-[11px] font-medium">On</span>
                      ) : lead.enriched_by ? (
                        <span className="text-amber-400/80 text-[10px] sm:text-[11px] font-medium">Partial</span>
                      ) : (
                        <span className="text-neutral-700 text-[10px] sm:text-[11px]">—</span>
                      )}
                    </td>
                    <td className="p-2 sm:p-3 text-neutral-500 text-[10px] sm:text-[11px] whitespace-nowrap tabular-nums hidden md:table-cell">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="p-2 sm:p-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/leads/${lead.id}`) }}
                        className="text-orange-400/70 hover:text-orange-400 text-[10px] sm:text-xs font-semibold jrv-transition press-feedback"
                      >
                        View →
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 border-t border-neutral-800 bg-neutral-900/50">
            <span className="text-xs sm:text-sm text-neutral-500 tabular-nums">
              <span className="text-neutral-300 font-medium">{(page - 1) * LIMIT + 1}</span>–
              <span className="text-neutral-300 font-medium">{Math.min(page * LIMIT, total)}</span>
              <span className="hidden sm:inline"> of <span className="text-neutral-300 font-medium">{total}</span></span>
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 jrv-transition disabled:opacity-30 disabled:cursor-not-allowed press-feedback"
              >
                ←
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-7 sm:w-8 h-7 sm:h-8 rounded-lg text-xs sm:text-sm jrv-transition press-feedback ${
                      page === pageNum
                        ? 'bg-orange-600 text-white font-medium'
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
                className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 jrv-transition disabled:opacity-30 disabled:cursor-not-allowed press-feedback"
              >
                →
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
