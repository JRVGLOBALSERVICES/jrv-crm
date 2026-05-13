/**
 * social-apply.mjs
 * 
 * Read all 10 batch result files and update Supabase with 
 * REAL social media data.
 * 
 * Usage: node scripts/social-apply.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const resultsDir = resolve(__dirname, '..', '..', 'memory', 'social-research')

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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  // Read all batch result files
  const files = readdirSync(resultsDir)
    .filter(f => f.match(/^batch-\d+-results\.json$/))
    .sort((a, b) => {
      const na = parseInt(a.match(/batch-(\d+)/)[1])
      const nb = parseInt(b.match(/batch-(\d+)/)[1])
      return na - nb
    })

  console.log(`📂 Found ${files.length} batch result files\n`)

  // Merge all results
  const allResults = []
  for (const file of files) {
    const data = JSON.parse(readFileSync(resolve(resultsDir, file), 'utf-8'))
    allResults.push(...data)
  }

  console.log(`📊 Total leads with results: ${allResults.length}`)

  // Fetch all leads from Supabase for ID lookup
  const { data: leads } = await supabase
    .from('leads')
    .select('id, business_name')
    .order('business_name')

  const leadMap = new Map()
  for (const lead of leads) {
    leadMap.set(lead.business_name.toLowerCase().trim(), lead.id)
  }

  // Process results
  let updated = 0
  let skipped = 0
  let noMatch = 0
  let totalSocialFound = 0

  for (const result of allResults) {
    const name = result.business_name
    const social = result.social_media || []

    // Find matching lead in Supabase
    const leadId = leadMap.get(name.toLowerCase().trim())
    if (!leadId) {
      console.log(`❌ No match: ${name}`)
      noMatch++
      continue
    }

    // Filter to only include valid social media platforms with social URLs
    const validSocial = social.filter(sm => {
      if (!sm.url || !sm.platform) return false
      // Only include high or medium confidence
      if (sm.confidence === 'low') return false
      // Must be a valid-looking URL
      try {
        const u = new URL(sm.url)
        return u.protocol === 'https:' || u.protocol === 'http:'
      } catch {
        return false
      }
    })

    if (validSocial.length === 0) {
      console.log(`⏭️  ${name}: No social found`)
      skipped++
      continue
    }

    // Build proper social_media array
    const socialMedia = validSocial.map(sm => ({
      platform: sm.platform.toLowerCase(),
      url: sm.url,
      label: sm.label || sm.platform.charAt(0).toUpperCase() + sm.platform.slice(1),
    }))

    // Deduplicate by platform
    const seen = new Set()
    const deduped = socialMedia.filter(sm => {
      if (seen.has(sm.platform)) return false
      seen.add(sm.platform)
      return true
    })

    const { error } = await supabase
      .from('leads')
      .update({ social_media: deduped })
      .eq('id', leadId)

    if (error) {
      console.log(`❌ ${name}: ${error.message}`)
    } else {
      console.log(`✅ ${name}: ${deduped.map(s => s.platform).join(', ')}`)
      totalSocialFound += deduped.length
      updated++
    }
  }

  console.log(`\n📊 FINAL SUMMARY:`)
  console.log(`  Total results processed: ${allResults.length}`)
  console.log(`  Updated with social media: ${updated}`)
  console.log(`  Skipped (no social found): ${skipped}`)
  console.log(`  No match in Supabase: ${noMatch}`)
  console.log(`  Total social links added: ${totalSocialFound}`)
  console.log(`  Done! ✅`)
}

main().catch(console.error)
