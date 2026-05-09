#!/usr/bin/env node
/**
 * store-marvel-enrichment.cjs
 * Stores a MARVEL enrichment JSON payload to a lead in Supabase.
 *
 * Usage:
 *   cat enrichment.json | node scripts/store-marvel-enrichment.cjs <lead-id>
 */

const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

const ENV_PATH = join(__dirname, '..', '.env.local');
const SUPABASE_URL = process.env.SUPABASE_URL ||
  (existsSync(ENV_PATH) && readFileSync(ENV_PATH, 'utf-8').match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim());
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  (existsSync(ENV_PATH) && readFileSync(ENV_PATH, 'utf-8').match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim());

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const LEAD_ID = process.argv[2];

if (!LEAD_ID) {
  console.error('Usage: node scripts/store-marvel-enrichment.cjs <lead-id>');
  console.error('Expects enrichment JSON on stdin');
  process.exit(1);
}

// Read stdin
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', async () => {
  let enrichment;
  try {
    enrichment = JSON.parse(input);
  } catch (e) {
    console.error('Invalid JSON on stdin:', e.message);
    process.exit(1);
  }

  console.error(`📦 Storing enrichment for lead ${LEAD_ID}...`);

  // Merge the enrichment into the lead record
  const updates = {
    updated_at: new Date().toISOString(),
    enrichment_complete: true,
    enriched_by: 'MARVEL-EE5',
  };

  // Update core fields if present
  if (enrichment.gbp_rating) updates.gbp_rating = enrichment.gbp_rating;
  if (enrichment.gbp_review_count) updates.gbp_review_count = enrichment.gbp_review_count;
  if (enrichment.primary_contact?.phone) updates.phone = enrichment.primary_contact.phone;
  if (enrichment.primary_contact?.email) updates.email = enrichment.primary_contact.email;
  if (enrichment.address) updates.address = enrichment.address;
  if (enrichment.hours) updates.hours = enrichment.hours;
  if (enrichment.subcategory) updates.sector = enrichment.subcategory;
  if (enrichment.web_presence?.website) updates.website_url = enrichment.web_presence.website;

  // Mark zero-state if no website
  updates.is_zero_state = !enrichment.web_presence?.website;

  // Update notes with enrichment details
  updates.notes = JSON.stringify({
    marvel_enrichment: enrichment,
    enriched_at: new Date().toISOString(),
    enriched_by: 'MARVEL-EE5',
  }, null, 2);

  const { error: ue } = await supabase.from('leads').update(updates).eq('id', LEAD_ID);
  if (ue) {
    console.error(`❌ Update error: ${ue.message}`);
    console.log(JSON.stringify({ success: false, lead_id: LEAD_ID, error: ue.message }));
    process.exit(0);
  }

  console.error(`✅ Enrichment stored for ${LEAD_ID}`);

  // Verify
  const { data: verify, error: ve } = await supabase.from('leads').select('*').eq('id', LEAD_ID).single();
  if (ve) {
    console.error(`⚠️ Verification query failed: ${ve.message}`);
    console.log(JSON.stringify({ success: true, lead_id: LEAD_ID, note: 'stored but verify failed' }));
    process.exit(0);
  }

  console.error(`📋 Verified: ${verify.business_name} | enrichment_complete: ${verify.enrichment_complete} | is_zero_state: ${verify.is_zero_state}`);
  console.log(JSON.stringify({
    success: true,
    lead_id: LEAD_ID,
    business_name: verify.business_name,
    enrichment_complete: verify.enrichment_complete,
    is_zero_state: verify.is_zero_state,
  }));
  process.exit(0);
});
