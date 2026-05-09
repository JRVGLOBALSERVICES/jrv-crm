#!/usr/bin/env node
/**
 * lead-architect-helper.mjs
 * Helper script for the Lead Architect cron pipeline.
 * Handles Supabase read/write operations so the cron prompt stays clean.
 *
 * Usage:
 *   node scripts/lead-architect-helper.mjs list-pending
 *   node scripts/lead-architect-helper.mjs save-prompts <lead-id> <prompts-json-path>
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, '..', '.env.local');
const SUPABASE_URL = (() => {
  if (existsSync(ENV_PATH)) {
    const m = readFileSync(ENV_PATH, 'utf-8').match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    return m ? m[1].trim() : null;
  }
  return null;
})();
const SUPABASE_KEY = (() => {
  if (existsSync(ENV_PATH)) {
    const m = readFileSync(ENV_PATH, 'utf-8').match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
    return m ? m[1].trim() : null;
  }
  return null;
})();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const cmd = process.argv[2];

// ─── List pending leads (replied/pitched without prompts) ───
if (cmd === 'list-pending') {
  const { data } = await supabase
    .from('leads')
    .select('id, business_name, status, sector, gbp_rating, gbp_review_count, address, phone, website_url, google_maps_url, is_zero_state')
    .in('status', ['replied', 'pitched']);
  
  const pending = (data || []).filter(l => {
    // Check if notes contain lead_architect_prompts
    // This is a quick check — the cron will do the actual check via notes read
    return true;
  });

  console.log(JSON.stringify({
    total: (data || []).length,
    leads: (data || []),
  }));
  process.exit(0);
}

// ─── Read current notes for a lead ───
if (cmd === 'read-notes') {
  const leadId = process.argv[3];
  if (!leadId) { console.error('Lead ID required'); process.exit(1); }
  const { data } = await supabase.from('leads').select('notes').eq('id', leadId).single();
  console.log(data?.notes || '{}');
  process.exit(0);
}

// ─── Save prompts to a lead's notes ───
if (cmd === 'save-prompts') {
  const leadId = process.argv[3];
  const promptsJsonPath = process.argv[4];
  if (!leadId || !promptsJsonPath) {
    console.error('Usage: node lead-architect-helper.mjs save-prompts <lead-id> <json-file>');
    process.exit(1);
  }
  
  const prompts = JSON.parse(readFileSync(promptsJsonPath, 'utf-8'));
  
  // Read current notes
  const { data: lead } = await supabase.from('leads').select('notes').eq('id', leadId).single();
  let notes = {};
  try { notes = JSON.parse(lead?.notes || '{}'); } catch { notes = {}; }
  
  // Add prompts
  notes.lead_architect_prompts = prompts;
  
  // Clean up old proposal fields
  delete notes.proposal_content;
  delete notes.proposal_url;
  delete notes.proposal_generated_at;
  
  const { error } = await supabase.from('leads').update({ notes: JSON.stringify(notes) }).eq('id', leadId);
  if (error) {
    console.error(JSON.stringify({ success: false, error: error.message }));
    process.exit(1);
  }
  console.log(JSON.stringify({ success: true, lead_id: leadId, prompt_count: Object.keys(prompts).length }));
  process.exit(0);
}

// ─── Save prompts from stdin (for pipe) ───
if (cmd === 'save-prompts-stdin') {
  const leadId = process.argv[3];
  if (!leadId) { console.error('Lead ID required'); process.exit(1); }
  
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const prompts = JSON.parse(input);
  
  const { data: lead } = await supabase.from('leads').select('notes').eq('id', leadId).single();
  let notes = {};
  try { notes = JSON.parse(lead?.notes || '{}'); } catch { notes = {}; }
  notes.lead_architect_prompts = prompts;
  
  const { error } = await supabase.from('leads').update({ notes: JSON.stringify(notes) }).eq('id', leadId);
  if (error) {
    console.error(JSON.stringify({ success: false, error: error.message }));
    process.exit(1);
  }
  console.log(JSON.stringify({ success: true, lead_id: leadId }));
  process.exit(0);
}

console.error('Usage:');
console.error('  node lead-architect-helper.mjs list-pending');
console.error('  node lead-architect-helper.mjs read-notes <lead-id>');
console.error('  node lead-architect-helper.mjs save-prompts <lead-id> <json-file>');
console.error('  node lead-architect-helper.mjs save-prompts-stdin <lead-id>');
