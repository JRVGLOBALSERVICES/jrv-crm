#!/usr/bin/env node
/**
 * social-pipeline.mjs
 * 
 * Helper script for the Social Media Research pipeline.
 * Finds leads needing social research, manages batch spawning.
 *
 * Usage:
 *   node scripts/social-pipeline.mjs list-pending       # List leads needing social research
 *   node scripts/social-pipeline.mjs save-results <json-path>  # Apply batch results
 *   node scripts/social-pipeline.mjs count               # Count remaining
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, '..', '.env.local');

function getEnv(key) {
  if (existsSync(ENV_PATH)) {
    const m = readFileSync(ENV_PATH, 'utf-8').match(new RegExp(`${key}=(.+)`));
    return m ? m[1].trim() : null;
  }
  return null;
}

const supabase = createClient(
  getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } }
);

const cmd = process.argv[2];

// ─── List leads needing social research ───
if (cmd === 'list-pending') {
  const { data } = await supabase
    .from('leads')
    .select('id, business_name, website_url, address')
    .is('social_media', null);

  console.log(JSON.stringify({
    total: (data || []).length,
    leads: data || [],
  }));
  process.exit(0);
}

// ─── Apply batch results from JSON file ───
if (cmd === 'save-results') {
  const jsonPath = process.argv[3];
  if (!jsonPath) { console.error('JSON path required'); process.exit(1); }
  
  const results = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  if (!Array.isArray(results)) { console.error('Results must be array'); process.exit(1); }

  // Get leads for name matching
  const { data: leads } = await supabase.from('leads').select('id, business_name');
  const leadMap = new Map(leads.map(l => [l.business_name.toLowerCase().trim(), l.id]));

  let updated = 0;
  let skipped = 0;

  for (const result of results) {
    const name = result.business_name;
    let social = result.social_media || [];
    if (!Array.isArray(social)) social = [];

    const leadId = leadMap.get(name.toLowerCase().trim());
    if (!leadId) { console.error(`No match: ${name}`); continue; }

    // Filter invalid (profile.php, numeric IDs, no URL)
    const valid = social.filter(s => {
      if (!s || !s.url || !s.platform) return false;
      if (s.url.includes('profile.php')) return false;
      if (s.url.match(/facebook\.com\/\d+(\/|$)/) && !s.url.match(/facebook\.com\/pages\//)) return false;
      try { new URL(s.url); return true } catch { return false; }
    });

    if (valid.length === 0) { skipped++; continue; }

    // Deduplicate by platform
    const seen = new Set();
    const deduped = valid.filter(s => { if (seen.has(s.platform)) return false; seen.add(s.platform); return true; })
      .map(s => ({ platform: s.platform, url: s.url.replace(/\/+$/, ''), label: s.label || s.platform }));

    await supabase.from('leads').update({ social_media: deduped }).eq('id', leadId);
    updated++;
  }

  console.log(`Applied: ${updated} updated, ${skipped} skipped (no social)`);
  process.exit(0);
}

// ─── Count remaining ───
if (cmd === 'count') {
  const { data } = await supabase.from('leads').select('id').is('social_media', null);
  const { data: total } = await supabase.from('leads').select('id');
  console.log(`${data?.length || 0} of ${total?.length || 0} leads need social research`);
  process.exit(0);
}

// ─── Generate batch files for un-researched leads ───
if (cmd === 'generate-batches') {
  const outputDir = process.argv[3] || '/tmp/social-batches';
  const batchSize = parseInt(process.argv[4] || '5');

  const { data: leads } = await supabase
    .from('leads')
    .select('id, business_name, website_url, address')
    .is('social_media', null);

  const { mkdirSync, writeFileSync } = await import('fs');
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  let batchNum = 0;
  for (let i = 0; i < (leads || []).length; i += batchSize) {
    const batch = (leads || []).slice(i, i + batchSize);
    batchNum++;
    writeFileSync(
      join(outputDir, `batch-${batchNum}.json`),
      JSON.stringify(batch, null, 2)
    );
  }

  console.log(JSON.stringify({
    total: (leads || []).length,
    batches: batchNum,
    batchSize,
    outputDir,
  }));
  process.exit(0);
}

console.error('Unknown command. Usage: list-pending | save-results <json> | count | generate-batches [dir] [size]');
process.exit(1);
