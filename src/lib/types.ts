export type Lead = {
  id: string
  created_at: string
  updated_at: string
  business_name: string
  sector: string | null
  rating: string | null
  review_count: number | null
  current_web_presence: string | null
  why_they_need_website: string | null
  recommended_domain: string | null
  google_maps_url: string | null
  phone: string | null
  status: 'new' | 'contacted' | 'replied' | 'pitched' | 'closed' | 'lost'
  notes: string | null
  contacted_at: string | null
  replied_at: string | null
  pitched_at: string | null
  closed_at: string | null
  assigned_to: string | null
}

export type LeadFormData = {
  business_name: string
  sector?: string
  rating?: string
  review_count?: number
  current_web_presence?: string
  why_they_need_website?: string
  recommended_domain?: string
  google_maps_url?: string
  phone?: string
  status?: Lead['status']
  notes?: string
}

export const STATUS_LABELS: Record<Lead['status'], string> = {
  new: 'New',
  contacted: 'Contacted',
  replied: 'Replied',
  pitched: 'Pitched',
  closed: 'Closed',
  lost: 'Lost',
}

export const STATUS_COLORS: Record<Lead['status'], string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  replied: 'bg-purple-100 text-purple-800',
  pitched: 'bg-indigo-100 text-indigo-800',
  closed: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
}
