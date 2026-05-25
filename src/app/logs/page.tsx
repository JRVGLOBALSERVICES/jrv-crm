'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'

interface AuditLog {
  id: string
  created_at: string
  user_id: string | null
  user_email: string | null
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, any> | null
  ip_address: string | null
}

interface LogsResponse {
  data: AuditLog[]
  total: number
  page: number
  limit: number
  totalPages: number
  actions: string[]
}

const ACTION_COLORS: Record<string, string> = {
  'lead.created': 'bg-green-500/20 text-green-400 border-green-500/30',
  'lead.updated': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'lead.deleted': 'bg-red-500/20 text-red-400 border-red-500/30',
  'lead.viewed': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'lead.searched': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'system.online': 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30',
}

function getActionColor(action: string): string {
  return ACTION_COLORS[action] || 'bg-neutral-700/20 text-neutral-400 border-neutral-700/30'
}

function getActionLabel(action: string): string {
  return action
    .replace(/^lead\./, '')
    .replace(/^system\./, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c: string) => c.toUpperCase())
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function truncate(str: string | null, max: number) {
  if (!str) return '—'
  return str.length > max ? str.slice(0, max) + '…' : str
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [actions, setActions] = useState<string[]>([])

  const [actionFilter, setActionFilter] = useState('')
  const [emailFilter, setEmailFilter] = useState('')

  const LIMIT = 50

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (actionFilter) params.set('action', actionFilter)
    if (emailFilter) params.set('email', emailFilter)
    params.set('page', String(page))
    params.set('limit', String(LIMIT))

    const res = await fetch(`/api/logs?${params.toString()}`)
    if (res.ok) {
      const data: LogsResponse = await res.json()
      setLogs(data.data)
      setTotal(data.total)
      setPage(data.page)
      setTotalPages(data.totalPages)
      setActions(data.actions)
    }
    setLoading(false)
  }, [page, actionFilter, emailFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Audit Logs</h1>
          <p className="text-sm text-neutral-500 mt-1">{total} log entries tracked</p>
        </div>
        <button
          onClick={() => { setPage(1); setActionFilter(''); setEmailFilter('') }}
          className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm jrv-transition px-3 py-2 rounded-lg border border-neutral-700 hover:border-orange-500/50 press-feedback"
        >
          ✕ Clear
        </button>
      </div>

      {/* Filters */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-[11px] text-neutral-500 mb-1 uppercase tracking-wider font-medium">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
              className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2.5 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            >
              <option value="">All Actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>{getActionLabel(a)} ({a})</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-[11px] text-neutral-500 mb-1 uppercase tracking-wider font-medium">User Email</label>
            <input
              type="text"
              value={emailFilter}
              onChange={(e) => { setEmailFilter(e.target.value); setPage(1) }}
              placeholder="Filter by email..."
              className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2.5 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 placeholder:text-neutral-600"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="text-left p-3 font-medium text-neutral-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Time</th>
                <th className="text-left p-3 font-medium text-neutral-500 text-[11px] uppercase tracking-wider whitespace-nowrap">User</th>
                <th className="text-left p-3 font-medium text-neutral-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Action</th>
                <th className="text-left p-3 font-medium text-neutral-500 text-[11px] uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">Entity</th>
                <th className="text-left p-3 font-medium text-neutral-500 text-[11px] uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">Details</th>
                <th className="text-left p-3 font-medium text-neutral-500 text-[11px] uppercase tracking-wider whitespace-nowrap hidden xl:table-cell">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="p-3"><div className="skeleton h-4 w-full max-w-[100px]" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                      <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    </div>
                    <p className="text-neutral-300 font-medium mb-1">No logs found</p>
                    <p className="text-neutral-600 text-sm">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-800/30 jrv-transition">
                    <td className="p-3 text-neutral-300 whitespace-nowrap tabular-nums text-[11px] sm:text-xs">
                      {formatTime(log.created_at)}
                    </td>
                    <td className="p-3">
                      <span className="text-neutral-300 text-xs sm:text-sm">{log.user_email || 'system'}</span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getActionColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="p-3 text-neutral-400 hidden sm:table-cell">
                      <span className="text-[11px]">{log.entity_type}</span>
                      {log.entity_id && (
                        <span className="text-neutral-600 text-[10px] ml-1 font-mono">({log.entity_id.slice(0, 8)}…)</span>
                      )}
                    </td>
                    <td className="p-3 text-neutral-500 text-[11px] hidden lg:table-cell max-w-[300px]">
                      {log.details ? (
                        <span className="truncate block">
                          {log.details.business_name || log.details.changes
                            ? JSON.stringify(log.details).slice(0, 120)
                            : JSON.stringify(log.details).slice(0, 80)}
                        </span>
                      ) : (
                        <span className="text-neutral-700">—</span>
                      )}
                    </td>
                    <td className="p-3 text-neutral-600 text-[10px] font-mono hidden xl:table-cell">
                      {log.ip_address || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-800 bg-neutral-900/50">
            <span className="text-sm text-neutral-500 tabular-nums">
              <span className="text-neutral-300 font-medium">{(page - 1) * LIMIT + 1}</span>–
              <span className="text-neutral-300 font-medium">{Math.min(page * LIMIT, total)}</span>
              {' '}of <span className="text-neutral-300 font-medium">{total}</span>
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-sm bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 jrv-transition disabled:opacity-30 disabled:cursor-not-allowed press-feedback"
              >
                ←
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) pageNum = i + 1
                else if (page <= 3) pageNum = i + 1
                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i
                else pageNum = page - 2 + i
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm jrv-transition press-feedback ${
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
                className="px-3 py-1.5 rounded-lg text-sm bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 jrv-transition disabled:opacity-30 disabled:cursor-not-allowed press-feedback"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
