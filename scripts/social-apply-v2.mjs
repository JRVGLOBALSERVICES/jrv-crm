/**
 * social-apply-v2.mjs
 * 
 * Apply V2 social media research results to Supabase.
 * Strict filter: no profile.php, no personal accounts, 
 * only verified business pages.
 * 
 * Usage: node scripts/social-apply-v2.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const resultsDir = resolve(__dirname, '..', '..', 'memory', 'social-research-v2')

const env = Object.fromEntries(
  readFileSync(resolve(__dirname, '..', '.env.local'), 'utf8').split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => { const e = l.indexOf('='); return [l.slice(0, e).trim(), l.slice(e + 1).trim()] })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Strict URL validation - reject anything suspicious
function isValidSocialUrl(platform, url, businessName) {
  try {
    const u = new URL(url)
    if (!u.protocol.startsWith('http')) return false
    
    // REJECT: profile.php templates
    if (url.includes('profile.php') || url.includes('pages/people/')) return false
    
    // REJECT: numeric ID Facebook URLs (personal accounts)
    if (url.match(/facebook\.com\/\d+(\?|$)/)) return false
    if (url.match(/facebook\.com\/profile\.php/)) return false
    
    // REJECT: URL too short to be real
    const domain = u.hostname.replace('www.', '')
    const pathParts = u.pathname.split('/').filter(Boolean)
    
    if (domain.includes('facebook') && pathParts.length === 0) return false
    if (domain.includes('instagram') && pathParts.length === 0) return false
    if (domain.includes('tiktok') && pathParts.length === 0) return false
    
    return true
  } catch {
    return false
  }
}

async function main() {
  const files = readdirSync(resultsDir)
    .filter(f => f.match(/^batch-\d+-results\.json$/))
    .sort()

  const allResults = []
  for (const file of files) {
    const data = JSON.parse(readFileSync(resolve(resultsDir, file), 'utf-8'))
    if (Array.isArray(data)) {
      allResults.push(...data)
    } else if (data && typeof data === 'object' && data.results && Array.isArray(data.results)) {
      allResults.push(...data.results)
    } else if (data && typeof data === 'object') {
      // Fallback: extract any array-like values
      for (const val of Object.values(data)) {
        if (Array.isArray(val)) allResults.push(...val)
        else if (val && typeof val === 'object' && val.business_name) allResults.push(val)
      }
    }
  }

  console.log(`📊 ${allResults.length} results loaded from ${files.length} batches\n`)

  // Fetch Supabase leads for ID lookup
  const { data: leads } = await supabase.from('leads').select('id, business_name')
  const leadsArray = leads || []
  const leadMap = new Map(leadsArray.map(l => [l.business_name.toLowerCase().trim(), l.id]))

  let updated = 0
  let skippedNoSocial = 0
  let skippedNoMatch = 0
  let totalLinks = 0
  let rejectedLinks = 0

  for (const result of allResults) {
    const name = result.business_name
    // Normalize social_media to array, handling multiple formats
    let raw = result.social_media
    let social = []
    if (raw) {
      if (Array.isArray(raw)) {
        social = raw
      } else if (typeof raw === 'object') {
        // Object format: {platform: urlOrObject} or {platform: {url: ...}}
        for (const [key, val] of Object.entries(raw)) {
          if (val === null || val === undefined || val === '') continue
          if (typeof val === 'string' && val.startsWith('http')) {
            social.push({ platform: key.toLowerCase(), url: val, label: key.charAt(0).toUpperCase() + key.slice(1) })
          } else if (typeof val === 'object' && val.url) {
            social.push({ platform: key.toLowerCase(), url: val.url, label: val.label || key })
          }
        }
      }
    }

    const leadId = leadMap.get(name.toLowerCase().trim())
    if (!leadId) {
      console.log(`❌ No match: ${name}`)
      skippedNoMatch++
      continue
    }

    // Validate each link - filter out items without url or platform
    const valid = social.filter(sm => {
      if (!sm.platform || !sm.url) return false
      const ok = isValidSocialUrl(sm.platform, sm.url, name)
      if (!ok) {
        console.log(`  ⚠️  REJECTED ${name}: ${sm.platform} ${sm.url}`)
        rejectedLinks++
      }
      return ok
    })

    if (valid.length === 0) {
      skippedNoSocial++
      continue
    }

    // Build clean social_media array
    const seen = new Set()
    const deduped = valid.filter(sm => {
      const key = sm.platform.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).map(sm => ({
      platform: sm.platform.toLowerCase(),
      url: sm.url,
      label: sm.label || sm.platform.charAt(0).toUpperCase() + sm.platform.slice(1),
    }))

    const { error } = await supabase.from('leads').update({ social_media: deduped }).eq('id', leadId)
    if (error) {
      console.log(`❌ ${name}: ${error.message}`)
    } else {
      console.log(`✅ ${name}: ${deduped.map(s => s.platform).join(', ')}`)
      totalLinks += deduped.length
      updated++
    }
  }

  console.log(`\n📊 FINAL:`)
  console.log(`  Updated: ${updated}`)
  console.log(`  No social found: ${skippedNoSocial}`)
  console.log(`  No match: ${skippedNoMatch}`)  
  console.log(`  Total links added: ${totalLinks}`)
  console.log(`  Rejected (suspicious): ${rejectedLinks}`)
  console.log(`  Done!`)
}

main().catch(console.error)
