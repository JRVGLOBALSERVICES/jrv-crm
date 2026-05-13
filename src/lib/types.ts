export type LeadStatus = 'new' | 'contacted' | 'replied' | 'pitched' | 'closed' | 'lost'

export type SocialMediaLink = {
  platform: string  // 'instagram' | 'facebook' | 'tiktok' | 'twitter' | 'youtube' | 'linkedin' | 'other'
  url: string
  label?: string
}

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
  status: LeadStatus
  notes: string | null
  contacted_at: string | null
  replied_at: string | null
  pitched_at: string | null
  closed_at: string | null
  assigned_to: string | null
  enriched_by: string | null
  gbp_rating: number | null
  gbp_review_count: number | null
  is_zero_state: boolean | null
  website_url: string | null
  social_media: SocialMediaLink[] | null
  competitors: Record<string, any>[] | null
  friction_reviews: Record<string, any>[] | null
  address: string | null
  hours: string | null
  enrichment_complete: boolean | null
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
  status?: LeadStatus
  notes?: string
}

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  replied: 'Replied',
  pitched: 'Pitched',
  closed: 'Closed',
  lost: 'Lost',
}

export const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  contacted: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  replied: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  pitched: 'bg-orange-400/20 text-orange-300 border-orange-400/30',
  closed: 'bg-green-500/20 text-green-400 border-green-500/30',
  lost: 'bg-red-500/20 text-red-400 border-red-500/30',
}
