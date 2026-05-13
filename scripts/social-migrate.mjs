/**
 * social-migrate.mjs
 * 
 * Extract social media links from existing leads' notes/full_dossier
 * and populate the social_media column in Supabase.
 * 
 * Usage: node scripts/social-migrate.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load env
const envPath = resolve(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars = Object.fromEntries(
  envContent.split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => {
      const eq = l.indexOf('=')
      return [l.slice(0, eq).trim(), l.slice(eq + 1).trim()]
    })
)

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Parse social media from full_dossier text
function extractSocialMedia(text) {
  const links = []
  if (!text) return links

  const patterns = [
    { platform: 'facebook', regex: /(?:facebook|fb)\s*[:：]?\s*([@\w.\/-]+)/i, urlFn: (m) => m.startsWith('http') ? m : `https://www.facebook.com/${m.replace(/^@/, '')}` },
    { platform: 'instagram', regex: /(?:instagram|ig)\s*[:：]?\s*@?(\w[\w._]+)/i, urlFn: (m) => `https://www.instagram.com/${m.replace(/^@/, '')}` },
    { platform: 'tiktok', regex: /(?:tiktok|tt)\s*[:：]?\s*@?(\w[\w.]+)/i, urlFn: (m) => `https://www.tiktok.com/@${m.replace(/^@/, '')}` },
    { platform: 'twitter', regex: /(?:twitter|x)\s*[:：]?\s*@?(\w[\w]+)/i, urlFn: (m) => `https://twitter.com/${m.replace(/^@/, '')}` },
    { platform: 'youtube', regex: /(?:youtube|yt)\s*[:：]?\s*@?(\w[\w.-]+)/i, urlFn: (m) => m.startsWith('http') ? m : `https://www.youtube.com/@${m.replace(/^@/, '')}` },
    { platform: 'linkedin', regex: /(?:linkedin|linked in)\s*[:：]?\s*(?:company\/)?([\w.-]+)/i, urlFn: (m) => m.startsWith('http') ? m : `https://www.linkedin.com/company/${m}` },
    { platform: 'blogspot', regex: /(?:blogspot|blog)\s*[:：]?\s*([\w.]+\.blogspot\.com)/i, urlFn: (m) => m.startsWith('http') ? m : `https://${m}` },
  ]

  const lines = text.split('\n')
  for (const line of lines) {
    for (const p of patterns) {
      const match = line.match(p.regex)
      if (match) {
        const raw = match[1]?.trim()
        if (raw && raw.length > 2) {
          links.push({
            platform: p.platform,
            url: p.urlFn(raw),
            label: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
          })
        }
        break
      }
    }
  }

  return links
}

async function main() {
  console.log('🔍 Fetching all leads from Supabase...')
  
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, business_name, notes, social_media, website_url')
    .order('business_name')

  if (error) {
    console.error('❌ Query error:', error.message)
    process.exit(1)
  }

  console.log(`✅ Found ${leads.length} leads\n`)

  let updated = 0
  let skipped = 0

  for (const lead of leads) {
    let socialMedia = null

    if (lead.notes) {
      try {
        const parsed = JSON.parse(lead.notes)
        
        // Check for structured social_media in enrichment (preferred)
        if (parsed.social_media && Array.isArray(parsed.social_media) && parsed.social_media.length > 0) {
          socialMedia = parsed.social_media
        }
        // Fallback: extract from full_dossier text
        else if (parsed.full_dossier) {
          const extracted = extractSocialMedia(parsed.full_dossier)
          if (extracted.length > 0) {
            socialMedia = extracted
          }
        }
        // Last resort: scan all text in notes JSON
        else if (typeof parsed === 'object') {
          const allText = JSON.stringify(parsed)
          const extracted = extractSocialMedia(allText)
          if (extracted.length > 0) {
            // Only use this if it found something plausible
            // Filter to only well-formed links
            socialMedia = extracted.filter(sm => {
              try { new URL(sm.url); return true } catch { return false }
            })
          }
        }
      } catch {
        // plain text notes - try direct extraction
        const extracted = extractSocialMedia(lead.notes)
        if (extracted.length > 0) {
          socialMedia = extracted
        }
      }
    }

    if (socialMedia && socialMedia.length > 0) {
      // Deduplicate by platform (keep first occurrence of each unique URL)
      const seenUrls = new Set()
      const deduped = socialMedia.filter(sm => {
        const key = sm.url.toLowerCase()
        if (seenUrls.has(key)) return false
        seenUrls.add(key)
        return true
      })

      // If deduping reduced it significantly, show both
      const display = deduped.map(s => s.platform).join(', ')
      console.log(`📝 ${lead.business_name}: ${display}`)
      
      const { error: updateError } = await supabase
        .from('leads')
        .update({ social_media: deduped })
        .eq('id', lead.id)

      if (updateError) {
        console.error(`  ❌ Update failed: ${updateError.message}`)
      } else {
        updated++
      }
    } else {
      console.log(`⏭️  ${lead.business_name}: No social media found`)
      skipped++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`  Total leads: ${leads.length}`)
  console.log(`  Updated (deduped): ${updated}`)
  console.log(`  Skipped (no social): ${skipped}`)
  console.log(`  Done!`)
}

main().catch(console.error)
