#!/usr/bin/env node
/**
 * enrich-from-maps.cjs — Rewritten with Obscura
 *
 * Processes a Google Maps URL for a lead:
 * 1. Resolves short URLs via Obscura fetch
 * 2. Primary: Google Places API (reliable, always works)
 * 3. Fallback: Obscura fetch to scrape whatever is visible on Maps page
 * 4. Stores GBP data to Supabase
 * 5. Outputs JSON for MARVEL sub-agent
 *
 * Usage:
 *   node scripts/enrich-from-maps.cjs <lead-id>
 *   node scripts/enrich-from-maps.cjs --list-unenriched
 */

const { execFileSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// ─── Config ───
const OBSCURA = join(__dirname, '..', '..', 'bin', 'obscura');
const ENV_PATH = join(__dirname, '..', '.env.local');
const SUPABASE_URL = (() => {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL;
  if (existsSync(ENV_PATH)) {
    const m = readFileSync(ENV_PATH, 'utf-8').match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    return m ? m[1].trim() : null;
  }
  return null;
})();
const SUPABASE_KEY = (() => {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (existsSync(ENV_PATH)) {
    const m = readFileSync(ENV_PATH, 'utf-8').match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
    return m ? m[1].trim() : null;
  }
  return null;
})();

const LEAD_ID = process.argv[2];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials. Check .env.local');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

if (!LEAD_ID) {
  console.error('Usage: node scripts/enrich-from-maps.cjs <lead-id>');
  console.error('       node scripts/enrich-from-maps.cjs --list-unenriched');
  process.exit(1);
}

function extractNameFromMapsUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('goo.gl')) return null;
    const parts = u.pathname.split('/');
    const placeIdx = parts.findIndex(p => p === 'place');
    if (placeIdx !== -1 && parts[placeIdx + 1]) return decodeURIComponent(parts[placeIdx + 1].replace(/\+/g, ' '));
  } catch {}
  return null;
}

// ─── Resolve short URLs via Obscura (lightweight, no Chrome) ───
function resolveShortUrl(url) {
  if (!url.includes('goo.gl') && !url.includes('maps.app.goo')) return url;
  console.error(`🌐 Resolving shortened URL: ${url}`);
  try {
    const out = execFileSync(OBSCURA, ['fetch', url, '--eval', 'window.location.href', '--wait-until', 'domcontentloaded', '--timeout', '10'], {
      encoding: 'utf-8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe']
    });
    // Obscura outputs the resolved URL as the eval result on stdout
    const lines = out.split('\n').map(l => l.trim()).filter(Boolean);
    // Try parsing as JSON first (Obscura may output {eval: 'url'} format)
    for (const line of lines) {
      if (line.startsWith('http')) {
        console.error(`✅ Resolved to: ${line}`);
        return line;
      }
      try {
        const parsed = JSON.parse(line);
        const found = parsed.url || parsed.eval;
        if (found && found.startsWith('http')) {
          console.error(`✅ Resolved to: ${found}`);
          return found;
        }
      } catch {}
    }
  } catch (err) {
    console.error(`⚠️ Redirect follow failed: ${err.message}`);
  }
  return url;
}

// ─── Google Places API (reliable primary source) ───
async function searchPlacesApi(businessName, mapsUrl) {
  let query = businessName && businessName !== 'New Lead' ? businessName : extractNameFromMapsUrl(mapsUrl);
  if (!query) query = 'business';
  const searchQuery = `${query} Seremban Malaysia`;
  console.error(`🌐 [Places API] Searching: "${searchQuery}"`);

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': 'AIzaSyBFcHYlDBMHdtr3RmiUmp8AvPhAlGLjpJI',
        'X-Goog-FieldMask': 'places.rating,places.userRatingCount,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.regularOpeningHours.weekdayDescriptions,places.displayName,places.types',
      },
      body: JSON.stringify({ textQuery: searchQuery, maxResultCount: 1 }),
    });
    if (!res.ok) { console.error(`❌ [Places API] HTTP ${res.status}`); return null; }
    const data = await res.json();
    const place = data?.places?.[0];
    if (!place) { console.error('❌ [Places API] No results'); return null; }
    console.error(`✅ [Places API] Found: ${place.displayName?.text || query}`);

    const typeMap = {
      restaurant: 'F&B/Restaurants', hotel: 'Hotels/Accommodation',
      car_repair: 'Automotive/Workshops', dentist: 'Healthcare/Clinics/Dental',
      doctor: 'Healthcare/Clinics/Dental', clinic: 'Healthcare/Clinics/Dental',
      school: 'Education/Training', university: 'Education/Training',
      real_estate_agency: 'Real Estate/Agencies', beauty_salon: 'Beauty/Salons/Spa',
      spa: 'Beauty/Salons/Spa', gym: 'Fitness/Gyms',
      store: 'Retail/Fashion', shopping_mall: 'Retail/Fashion',
      lawyer: 'Legal/Law Firms', accountant: 'Financial Services',
      travel_agency: 'Travel Agencies', pet_store: 'Pet Services/Grooming',
      photographer: 'Photography/Studio', hair_care: 'Beauty/Salons/Spa',
      moving_company: 'Home Services/Renovation', electrician: 'Home Services/Renovation',
      plumber: 'Home Services/Renovation',
    };
    let sector = null;
    for (const t of place.types || []) { if (typeMap[t]) { sector = typeMap[t]; break; } }

    const hours = place.regularOpeningHours?.weekdayDescriptions
      ? place.regularOpeningHours.weekdayDescriptions.join(', ') : null;

    return {
      business_name: place.displayName?.text || null,
      gbp_rating: place.rating || null,
      gbp_review_count: place.userRatingCount || null,
      address: place.formattedAddress || null,
      hours: hours,
      phone: place.nationalPhoneNumber || null,
      website_url: place.websiteUri || null,
      sector: sector,
    };
  } catch (err) {
    console.error(`❌ [Places API] Error: ${err.message}`);
    return null;
  }
}

// ─── Obscura lightweight Maps scrape (fallback if Places fails) ───
function scrapeViaObscura(mapsUrl) {
  console.error(`🌐 [Obscura] Attempting to scrape page: ${mapsUrl}`);
  try {
    const out = execFileSync(OBSCURA, ['fetch', mapsUrl, '--dump', 'text', '--wait-until', 'networkidle0', '--stealth', '--timeout', '15'], {
      encoding: 'utf-8', timeout: 20000, stdio: ['ignore', 'pipe', 'pipe']
    });
    const text = out.replace(/\x1b\[[0-9;]*m/g, '').replace(/\s+/g, ' ').trim();
    if (!text || text.includes('Enable JavaScript')) return null;
    console.error(`✅ [Obscura] Got ${text.length} chars of text from page`);

    // Try to extract useful info from visible text
    const result = {};
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Look for rating pattern like "4.7 ★" or "4.7 (798)" or "4,7"
    for (const line of lines) {
      const ratingMatch = line.match(/([\d.]+)\s*(?:★|stars?|\(([\d,]+)\s*\))/i);
      if (ratingMatch) {
        result.gbp_rating = parseFloat(ratingMatch[1]);
        if (ratingMatch[2]) result.gbp_review_count = parseInt(ratingMatch[2].replace(/,/g, ''));
        break;
      }
    }

    // Look for phone numbers
    for (const line of lines) {
      const phoneMatch = line.match(/(?:\+?60|0)[-\s]?\d{1,3}[-\s]?\d{3,4}[-\s]?\d{3,4}/);
      if (phoneMatch && !result.phone) result.phone = phoneMatch[0];
    }

    // Look for website in text
    for (const line of lines) {
      const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch && !urlMatch[1].includes('google.com') && !result.website_url) result.website_url = urlMatch[1];
    }

    // Check for vercel.app in found URL
    if (result.website_url && (result.website_url.includes('.vercel.app') || result.website_url.includes('.netlify.app') || result.website_url.includes('.pages.dev'))) {
      console.error(`⚠️ Found demo URL (${result.website_url}) — treating as zero-state`);
      result.is_zero_state = true;
      result.website_url = null;
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (err) {
    console.error(`❌ [Obscura] Error: ${err.message}`);
    return null;
  }
}

// ─── Main ───
async function main() {
  // ─── LIST UNENRICHED ───
  if (LEAD_ID === '--list-unenriched') {
    const { data, error } = await supabase
      .from('leads')
      .select('id, business_name, google_maps_url, address, gbp_rating, enrichment_complete, created_at')
      .not('google_maps_url', 'is', null)
      .or('enrichment_complete.is.null,enrichment_complete.eq.false')
      .order('created_at', { ascending: true })
      .limit(10);
    if (error) { console.error(JSON.stringify({ success: false, error: error.message })); process.exit(1); }
    console.log(JSON.stringify({ success: true, leads: data || [], count: (data || []).length }));
    process.exit(0);
  }

  console.error(`🔍 Enriching lead: ${LEAD_ID}`);

  // Get lead from Supabase
  const { data: lead, error } = await supabase.from('leads').select('*').eq('id', LEAD_ID).single();
  if (error || !lead) { console.error(`❌ Lead not found`); process.exit(1); }
  if (!lead.google_maps_url) { console.error(`❌ No google_maps_url`); process.exit(1); }
  console.error(`📋 Lead: ${lead.business_name}`);

  // Resolve short URL
  const resolvedUrl = resolveShortUrl(lead.google_maps_url);
  if (resolvedUrl !== lead.google_maps_url) {
    await supabase.from('leads').update({ google_maps_url: resolvedUrl }).eq('id', LEAD_ID);
  }

  // Extract name from resolved URL (more accurate than lead's garbled name)
  const urlName = extractNameFromMapsUrl(resolvedUrl) || lead.business_name;
  if (urlName !== lead.business_name) {
    console.error(`📌 URL suggests name: "${urlName}" (was "${lead.business_name}")`);
  }

  // Try Places API (reliable, always works) with the name from the URL
  let gbpData = await searchPlacesApi(urlName, resolvedUrl);

  // Fallback: try Obscura on Maps page
  if (!gbpData) {
    console.error('⚠️ Places API failed, trying Obscura Maps scrape...');
    gbpData = scrapeViaObscura(resolvedUrl);
  }

  if (!gbpData) {
    console.error('❌ All data sources failed');
    console.log(JSON.stringify({ success: false, lead_id: LEAD_ID, error: 'All sources failed' }));
    process.exit(0);
  }

  console.error(`✅ Data collected:`);
  console.error(`   Name: ${gbpData.business_name || lead.business_name}`);
  console.error(`   Rating: ${gbpData.gbp_rating} (${gbpData.gbp_review_count} reviews)`);
  console.error(`   Address: ${gbpData.address}`);
  console.error(`   Phone: ${gbpData.phone}`);
  console.error(`   Website: ${gbpData.website_url}`);

  // Check for vercel.app demo URLs
  let isZeroState = gbpData.is_zero_state !== undefined ? gbpData.is_zero_state : (gbpData.website_url ? false : true);
  let websiteUrl = gbpData.website_url || null;
  if (websiteUrl && (websiteUrl.includes('.vercel.app') || websiteUrl.includes('.netlify.app') || websiteUrl.includes('.pages.dev'))) {
    console.error(`⚠️ Ignoring demo URL: ${websiteUrl}`);
    isZeroState = true;
    websiteUrl = null;
  }

  // Build updates
  const updates = { updated_at: new Date().toISOString() };
  // Always update business_name from Places API (more reliable than URL parsing)
  if (gbpData.business_name && gbpData.business_name !== lead.business_name) updates.business_name = gbpData.business_name;
  if (gbpData.gbp_rating !== null) updates.gbp_rating = gbpData.gbp_rating;
  if (gbpData.gbp_review_count !== null) updates.gbp_review_count = gbpData.gbp_review_count;
  if (gbpData.address) updates.address = gbpData.address;
  if (gbpData.hours) updates.hours = gbpData.hours;
  if (gbpData.phone) updates.phone = gbpData.phone;
  if (websiteUrl) updates.website_url = websiteUrl;
  if (gbpData.sector && !lead.sector) updates.sector = gbpData.sector;
  updates.enriched_by = 'Maps Scraper (Obscura)';
  updates.is_zero_state = isZeroState;

  // Preserve notes with enrichment seed
  const seed = { source: 'maps-scraper-obscura', lead_name: gbpData.business_name || lead.business_name,
    gbp_rating: gbpData.gbp_rating, gbp_review_count: gbpData.gbp_review_count,
    address: gbpData.address, hours: gbpData.hours, phone: gbpData.phone,
    website_url: websiteUrl, sector: gbpData.sector || lead.sector,
    google_maps_url: lead.google_maps_url, raw_data: gbpData };
  let existingNotes = lead.notes || '';
  try { const p = JSON.parse(existingNotes); if (typeof p === 'object') { p.maps_scraper_data = seed; existingNotes = JSON.stringify(p, null, 2); }
    else { existingNotes = JSON.stringify({ maps_scraper_data: seed, user_notes: existingNotes }, null, 2); } }
  catch { existingNotes = JSON.stringify({ maps_scraper_data: seed, user_notes: existingNotes }, null, 2); }
  updates.notes = existingNotes;

  // Store to Supabase
  const { error: ue } = await supabase.from('leads').update(updates).eq('id', LEAD_ID);
  if (ue) { console.error(`❌ Update error: ${ue.message}`); console.log(JSON.stringify({ success: false, lead_id: LEAD_ID, error: ue.message })); process.exit(0); }
  console.error(`✅ Saved to Supabase`);

  // Output for MARVEL sub-agent
  console.log(JSON.stringify({
    success: true, lead_id: LEAD_ID,
    lead: {
      id: lead.id,
      business_name: gbpData.business_name || lead.business_name,
      sector: gbpData.sector || lead.sector,
      rating: gbpData.gbp_rating || lead.rating,
      review_count: gbpData.gbp_review_count || lead.review_count,
      address: gbpData.address || lead.address,
      hours: gbpData.hours || lead.hours,
      phone: gbpData.phone || lead.phone,
      website_url: websiteUrl,
      google_maps_url: lead.google_maps_url,
      is_zero_state: isZeroState,
    },
    gbp_data: gbpData,
    needs_marvel_enrichment: true,
  }));
  process.exit(0);
}

main().catch(err => {
  console.error(`❌ Fatal: ${err.message}`);
  console.log(JSON.stringify({ success: false, lead_id: LEAD_ID, error: err.message }));
  process.exit(1);
});
