#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();
const c = createClient(url, key, { auth: { persistSession: false } });

async function checkUrl(targetUrl) {
  try {
    const resp = await fetch(targetUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000), redirect: 'manual' });
    const code = resp.status;
    return [200, 301, 302, 403].includes(code);
  } catch { return false; }
}

function genHandles(name) {
  const clean = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  const parts = clean.split(' ').filter(Boolean);
  const skip = ['sdn','bhd','berhad','enterprise','trading','services','seremban','malaysia','my','co','the','&','and','store','shop','centre','enterprise','restaurant','studio','bistro','cafe'];
  const sig = parts.filter(p => !skip.includes(p));
  const handles = new Set();
  if (parts.join('').length >= 3) handles.add(parts.join(''));
  if (sig.length > 1 && sig.join('').length >= 3) handles.add(sig.join(''));
  if (sig.length > 1 && sig.slice(0,2).join('').length >= 3) handles.add(sig.slice(0,2).join(''));
  if (sig[0] && sig[0].length >= 3) handles.add(sig[0]);
  // Try with - and _ variations
  const all = parts.join('');
  if (all.length >= 3) handles.add(all.replace(/ /g, '_'));
  if (all.length >= 3) handles.add(all.replace(/ /g, '-'));
  return [...handles].filter(h => h.length >= 3 && h.length <= 30);
}

async function main() {
  const { data: all } = await c.from('leads').select('id,business_name,social_media');
  if (!all) { console.log('No data'); return; }

  const empty = all.filter(l => Array.isArray(l.social_media) && l.social_media.length === 0);
  console.log('Leads to check:', empty.length);
  
  let found = 0, none = 0;

  for (const [idx, lead] of empty.entries()) {
    const handles = genHandles(lead.business_name);
    const social = [];

    for (const h of handles) {
      if (social.length >= 3) break;
      if (!social.find(s => s.platform === 'facebook')) {
        try { if (await checkUrl(`https://www.facebook.com/${h}`)) { social.push({ platform: 'facebook', url: `https://www.facebook.com/${h}`, label: 'Facebook' }); continue; } } catch {}
      }
      if (!social.find(s => s.platform === 'instagram')) {
        try { if (await checkUrl(`https://www.instagram.com/${h}/`)) { social.push({ platform: 'instagram', url: `https://www.instagram.com/${h}/`, label: 'Instagram' }); continue; } } catch {}
      }
      if (!social.find(s => s.platform === 'tiktok')) {
        try { if (await checkUrl(`https://www.tiktok.com/@${h}`)) { social.push({ platform: 'tiktok', url: `https://www.tiktok.com/@${h}`, label: 'TikTok' }); } } catch {}
      }
    }

    await c.from('leads').update({ social_media: social }).eq('id', lead.id);
    if (social.length > 0) { found++; process.stdout.write(`✅ ${lead.business_name} → ${social.map(s=>s.platform).join(', ')}\n`); }
    else none++;
    if ((idx + 1) % 10 === 0) process.stdout.write(`[${idx+1}/${empty.length}] ${found} found, ${none} none\n`);
  }
  
  console.log(`\nDone: ${found} with social, ${none} zero-state`);
}

main().catch(e => { console.error('FATAL:', e.message); });
