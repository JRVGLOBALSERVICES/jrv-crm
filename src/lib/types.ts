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

/**
 * Extract social media links from the full_dossier raw text as a fallback
 * when structured social_media data isn't available.
 */
export function extractSocialMedia(text: string): SocialMediaLink[] {
  const links: SocialMediaLink[] = [];
  if (!text) return links;

  const patterns: { platform: string; regex: RegExp; urlFn: (m: string) => string }[] = [
    { platform: 'facebook', regex: /(?:facebook|fb)\s*[:：]?\s*([@\w.\/-]+)/i, urlFn: (m) => m.startsWith('http') ? m : `https://www.facebook.com/${m.replace(/^@/, '')}` },
    { platform: 'instagram', regex: /(?:instagram|ig)\s*[:：]?\s*@?(\w[\w._]+)/i, urlFn: (m) => `https://www.instagram.com/${m.replace(/^@/, '')}` },
    { platform: 'tiktok', regex: /(?:tiktok|tt)\s*[:：]?\s*@?(\w[\w.]+)/i, urlFn: (m) => `https://www.tiktok.com/@${m.replace(/^@/, '')}` },
    { platform: 'twitter', regex: /(?:twitter|x)\s*[:：]?\s*@?(\w[\w]+)/i, urlFn: (m) => `https://twitter.com/${m.replace(/^@/, '')}` },
    { platform: 'youtube', regex: /(?:youtube|yt)\s*[:：]?\s*@?(\w[\w.-]+)/i, urlFn: (m) => `https://www.youtube.com/@${m.replace(/^@/, '')}` },
    { platform: 'linkedin', regex: /(?:linkedin|linked in)\s*[:：]?\s*(?:company\/)?([\w.-]+)/i, urlFn: (m) => m.startsWith('http') ? m : `https://www.linkedin.com/company/${m}` },
  ];

  const lines = text.split('\n');
  for (const line of lines) {
    for (const p of patterns) {
      const match = line.match(p.regex);
      if (match) {
        const raw = match[1]?.trim();
        if (raw && raw.length > 2) {
          links.push({ platform: p.platform, url: p.urlFn(raw), label: p.platform.charAt(0).toUpperCase() + p.platform.slice(1) });
        }
        break;
      }
    }
  }

  return links;
}
