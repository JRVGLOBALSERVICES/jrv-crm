/**
 * social-audit.mjs
 * 
 * Audit: Check leads marked "no social" against their enrichment notes.
 * If the full_dossier mentions specific social media handles (not competitors),
 * extract and add them.
 * 
 * Also flag any obviously wrong links for review.
 * 
 * Usage: node scripts/social-audit.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const env = Object.fromEntries(
  readFileSync(resolve(__dirname, '..', '.env.local'), 'utf8').split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => { const e = l.indexOf('='); return [l.slice(0, e).trim(), l.slice(e + 1).trim()] })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Strict extraction: only from first ~15 lines of full_dossier (business header section)
function extractStrictSocial(text) {
  const links = []
  if (!text) return links

  // Only scan first 15 lines - that's usually the business header/description
  const lines = text.split('\n').slice(0, 15)
  
  const platformMap = {
    facebook: { patterns: [/facebook\.com\/([\w.\/-]+)/i, /fb\.com\/([\w.\/-]+)/i], label: 'Facebook' },
    instagram: { patterns: [/instagram\.com\/([\w._-]+)/i, /@(\w[\w._]+)/], label: 'Instagram' },
    tiktok: { patterns: [/tiktok\.com\/@?([\w.]+)/i], label: 'TikTok' },
    youtube: { patterns: [/youtube\.com\/@?([\w.-]+)/i, /youtu\.be\/([\w-]+)/], label: 'YouTube' },
    twitter: { patterns: [/twitter\.com\/([\w]+)/i, /x\.com\/([\w]+)/i], label: 'Twitter' },
  }

  for (const line of lines) {
    for (const [platform, config] of Object.entries(platformMap)) {
      for (const pattern of config.patterns) {
        const match = line.match(pattern)
        if (match) {
          const handle = match[1]?.trim()
          if (handle && handle.length > 1 && !handle.includes(' ')) {
            // Build URL from handle
            let url
            if (platform === 'instagram') url = `https://www.instagram.com/${handle.replace(/^@/, '')}`
            else if (platform === 'facebook') url = line.match(/https?:\/\/[^\/]+\/[\w.\/-]+/)?.[0] || `https://www.facebook.com/${handle}`
            else if (platform === 'tiktok') url = `https://www.tiktok.com/@${handle.replace(/^@/, '')}`
            else if (platform === 'twitter') url = `https://twitter.com/${handle}`
            else if (platform === 'youtube') url = line.match(/https?:\/\/[^\s]+/)?.[0] || `https://www.youtube.com/@${handle}`
            
            if (url) links.push({ platform, url, label: config.label })
          }
          break
        }
      }
    }
  }

  return links
}

async function main() {
  console.log('🔍 Fetching all leads...')
  const { data: leads } = await supabase.from('leads')
    .select('id, business_name, social_media, notes')
    .order('business_name')

  let withSocial = 0
  let withoutSocial = 0
  let foundFromNotes = 0
  let foundFromExisting = 0
  let suspicious = []

  for (const lead of leads) {
    // Check existing social_media for suspicious accounts
    if (lead.social_media && Array.isArray(lead.social_media) && lead.social_media.length > 0) {
      withSocial++
      
      // Flag suspicious: accounts that seem like personal/dummy accounts
      for (const sm of lead.social_media) {
        const url = sm.url.toLowerCase()
        if (url.includes('profile.php') || url.includes('?id=') || 
            url.match(/facebook\.com\/\d+$/) ||
            url.match(/instagram\.com\/[a-z]{1,2}$/) ||
            url.match(/tiktok\.com\/@user\d+/)) {
          suspicious.push({ name: lead.business_name, platform: sm.platform, url: sm.url, issue: 'Looks like personal/dummy account' })
        }
      }
      continue
    }

    // No social - check notes
    withoutSocial++
    if (!lead.notes) continue

    try {
      const parsed = JSON.parse(lead.notes)
      
      // Check for structured social_media in notes
      if (parsed.social_media && Array.isArray(parsed.social_media) && parsed.social_media.length > 0) {
        const valid = parsed.social_media.filter(sm => {
          try { new URL(sm.url); return true } catch { return false }
        })
        if (valid.length > 0) {
          const { error } = await supabase.from('leads').update({ social_media: valid }).eq('id', lead.id)
          if (!error) {
            console.log(`📝 ${lead.business_name}: Found structured social in notes → ${valid.map(s => s.platform).join(', ')}`)
            foundFromNotes++
          }
          continue
        }
      }
      
      // Check full_dossier text
      const dossierText = parsed.full_dossier
      if (!dossierText) continue
      
      const extracted = extractStrictSocial(dossierText)
      if (extracted.length > 0) {
        // Deduplicate
        const seen = new Set()
        const deduped = extracted.filter(s => { if (seen.has(s.platform)) return false; seen.add(s.platform); return true })
        
        const { error } = await supabase.from('leads').update({ social_media: deduped }).eq('id', lead.id)
        if (!error) {
          console.log(`📝 ${lead.business_name}: Extracted from full_dossier → ${deduped.map(s => s.platform).join(', ')}`)
          foundFromNotes++
        }
      }
    } catch {}
  }

  console.log(`\n📊 AUDIT REPORT:`)
  console.log(`  Already had social media: ${withSocial}`)
  console.log(`  Was marked 'no social': ${withoutSocial}`)
  console.log(`  Found social from notes: ${foundFromNotes}`)
  console.log(`  Still no social: ${withoutSocial - foundFromNotes}`)
  
  if (suspicious.length > 0) {
    console.log(`\n⚠️  SUSPICIOUS ACCOUNTS (${suspicious.length}):`)
    for (const s of suspicious) {
      console.log(`  ${s.name} - ${s.platform}: ${s.url} (${s.issue})`)
    }
  }
  
  console.log(`\n✅ Done!`)
}

main().catch(console.error)
