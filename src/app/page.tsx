'use client'

import { useState, useEffect } from 'react'
import { Lead, STATUS_LABELS, STATUS_COLORS } from '@/lib/types'

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leads')
      .then((res) => res.json())
      .then((data) => {
        setLeads(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const counts = {
    total: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    replied: leads.filter((l) => l.status === 'replied').length,
    pitched: leads.filter((l) => l.status === 'pitched').length,
    closed: leads.filter((l) => l.status === 'closed').length,
    lost: leads.filter((l) => l.status === 'lost').length,
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        {[
          { label: 'Total', count: counts.total, color: 'bg-gray-600' },
          { label: 'New', count: counts.new, color: 'bg-blue-500' },
          { label: 'Contacted', count: counts.contacted, color: 'bg-yellow-500' },
          { label: 'Replied', count: counts.replied, color: 'bg-purple-500' },
          { label: 'Pitched', count: counts.pitched, color: 'bg-indigo-500' },
          { label: 'Closed', count: counts.closed, color: 'bg-green-500' },
          { label: 'Lost', count: counts.lost, color: 'bg-red-500' },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${card.color}`} />
              <span className="text-sm text-gray-600">{card.label}</span>
            </div>
            <p className="text-2xl font-bold mt-2">{card.count}</p>
          </div>
        ))}
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">All Leads</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">Business</th>
                <th className="text-left p-3 font-medium text-gray-600">Sector</th>
                <th className="text-left p-3 font-medium text-gray-600">Rating</th>
                <th className="text-left p-3 font-medium text-gray-600">Status</th>
                <th className="text-left p-3 font-medium text-gray-600">Added</th>
                <th className="text-left p-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">Loading...</td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">No leads yet. Add your first lead to get started.</td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium">{lead.business_name}</td>
                    <td className="p-3 text-gray-600">{lead.sector || '—'}</td>
                    <td className="p-3">
                      <span className="text-yellow-500">★</span>{' '}
                      {lead.rating || '—'}
                      {lead.review_count ? ` (${lead.review_count})` : ''}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status]}`}>
                        {STATUS_LABELS[lead.status]}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500 text-xs">
                      {new Date(lead.created_at).toLocaleDateString('en-MY', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-3">
                      <a href={`/leads/${lead.id}`} className="text-blue-600 hover:text-blue-800 text-sm">View</a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
