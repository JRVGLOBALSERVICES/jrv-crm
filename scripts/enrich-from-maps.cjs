#!/usr/bin/env node
/**
 * enrich-from-maps.cjs
 * Standalone script that processes a Google Maps URL for a lead:
 * 1. Tries Playwright scraping of the Maps page
 * 2. Falls back to Google Places API if Playwright fails
 * 3. Stores GBP data to Supabase
 * 4. Outputs enrichment-ready data for Marvel sub-agents
 *
 * Usage:
 *   node scripts/enrich-from-maps.cjs <lead-id>          # Scrape + store a single lead
 *   node scripts/enrich-from-maps.cjs --list-unenriched   # List leads needing enrichment
 *
 * Environment: Expects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// ─── Config ───
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

// ─── Extract business name from Maps URL ───
function extractNameFromMapsUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('goo.gl')) return null; // short URL, can't extract
    const parts = u.pathname.split('/');
    const placeIdx = parts.findIndex(p => p === 'place');
    if (placeIdx !== -1 && parts[placeIdx + 1]) {
      return decodeURIComponent(parts[placeIdx + 1].replace(/\+/g, ' '));
    }
  } catch {}
  return null;
}

// ─── Follow redirect for shortened URLs ───
async function resolveShortUrl(url) {
  if (!url.includes('goo.gl') && !url.includes('maps.app.goo')) return url;
  console.error(`🌐 Resolving shortened URL: ${url}`);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await (await browser.newContext()).newPage();
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const resolved = response?.url() || url;
    console.error(`✅ Resolved to: ${resolved}`);
    return resolved;
  } catch (err) {
    console.error(`⚠️ Redirect follow failed: ${err.message}`);
    return url;
  } finally {
    await browser.close().catch(() => {});
  }
}

// ─── Google Maps Scraper (Playwright) ───
async function scrapeGoogleMaps(mapsUrl) {
  console.error(`🌐 [Playwright] Navigating to Maps URL...`);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
    });
    const page = await context.newPage();
    await page.goto(mapsUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const result = await page.evaluate(() => {
      const info = document.querySelector('[role="main"]');
      if (!info) return null;

      const name = info.querySelector('h1')?.textContent?.trim() || '';
      let rating = '';
      for (const el of info.querySelectorAll('[aria-label]')) {
        const m = (el.getAttribute('aria-label') || '').match(/^([\d.]+)\s*stars?$/i);
        if (m) { rating = m[1]; break; }
      }
      if (!rating) {
        const fbm = info.querySelector('.fontBodyMedium');
        if (fbm) {
          const rm = fbm.textContent?.match(/^([\d.]+)/);
          if (rm) rating = rm[1];
        }
      }
      const reviewMatch = (info.innerText || '').match(/\(([\d,]+)\s*\)/);
      const reviewCount = reviewMatch ? reviewMatch[1].replace(/,/g, '') : '';
      const addressEl = info.querySelector('[data-item-id="address"]');
      const hoursEl = info.querySelector('[data-item-id="oh"]');
      let hours = hoursEl?.textContent?.trim() || '';
      if (!hours && hoursEl?.parentElement) {
        const hMatch = hoursEl.parentElement.textContent?.match(/[A-Z][a-z].*(?:AM|PM)/);
        if (hMatch) hours = hMatch[0];
      }
      const phoneEl = info.querySelector('[data-item-id="phone"]');
      const websiteEl = info.querySelector('[data-item-id="authority"]');
      let website = '';
      if (websiteEl) website = websiteEl.getAttribute('href') || websiteEl.textContent?.trim() || '';

      let category = '';
      for (const el of info.querySelectorAll('button[jsaction]')) {
        const text = el.textContent?.trim() || '';
        if (text && text.length > 3 && text.length < 50 && !text.includes('$') &&
            !text.match(/^(Save|Share|Nearby|About|Reviews|Photos)/i) &&
            text.match(/Restaurant|Hotel|Clinic|Salon|Workshop|Store|Service|Centre|Center|Spa|Gym|School|Studio/i)) {
          category = text; break;
        }
      }

      return {
        business_name: name,
        gbp_rating: rating ? parseFloat(rating) : null,
        gbp_review_count: reviewCount ? parseInt(reviewCount) : null,
        address: addressEl?.textContent?.trim() || null,
        hours: hours || null,
        phone: phoneEl?.textContent?.trim() || null,
        website_url: website || null,
        sector: category || null,
        source_url: window.location.href,
      };
    });
    return result;
  } catch (err) {
    console.error(`❌ [Playwright] Error: ${err.message}`);
    return null;
  } finally {
    await browser.close().catch(() => {});
  }
}

// ─── Places API Fallback ───
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
      ? place.regularOpeningHours.weekdayDescriptions.join('\\n') : null;

    return {
      business_name: place.displayName?.text || null,
      gbp_rating: place.rating || null,
      gbp_review_count: place.userRatingCount || null,
      address: place.formattedAddress || null,
      hours: hours,
      phone: place.nationalPhoneNumber || null,
      website_url: place.websiteUri || null,
      sector: sector,
      source_url: null,
    };
  } catch (err) {
    console.error(`❌ [Places API] Error: ${err.message}`);
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

  // Get lead
  const { data: lead, error } = await supabase
    .from('leads').select('*').eq('id', LEAD_ID).single();
  if (error || !lead) { console.error(`❌ Lead not found`); process.exit(1); }
  if (!lead.google_maps_url) { console.error(`❌ No google_maps_url`); process.exit(1); }

  console.error(`📋 Lead: ${lead.business_name}`);

  // Step 1: Resolve shortened URLs then scrape
  const resolvedUrl = await resolveShortUrl(lead.google_maps_url);
  if (resolvedUrl !== lead.google_maps_url) {
    // Update the lead with the resolved full URL
    await supabase.from('leads').update({ google_maps_url: resolvedUrl }).eq('id', LEAD_ID);
  }
  let gbpData = await scrapeGoogleMaps(resolvedUrl);

  if (!gbpData || (!gbpData.business_name && !gbpData.gbp_rating)) {
    console.error('⚠️ Playwright returned limited data, trying Places API...');
    gbpData = await searchPlacesApi(lead.business_name, resolvedUrl);
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

  // Step 2: Build updates
  const updates = { updated_at: new Date().toISOString() };
  if (gbpData.business_name && lead.business_name === 'New Lead') updates.business_name = gbpData.business_name;
  if (gbpData.gbp_rating !== null) updates.gbp_rating = gbpData.gbp_rating;
  if (gbpData.gbp_review_count !== null) updates.gbp_review_count = gbpData.gbp_review_count;
  if (gbpData.address) updates.address = gbpData.address;
  if (gbpData.hours) updates.hours = gbpData.hours;
  if (gbpData.phone) updates.phone = gbpData.phone;
  if (gbpData.website_url) updates.website_url = gbpData.website_url;
  if (gbpData.sector && !lead.sector) updates.sector = gbpData.sector;
  updates.enriched_by = 'Maps Scraper';
  updates.is_zero_state = gbpData.website_url ? false : true;

  // Preserve notes with enrichment seed
  const seed = { source: 'maps-scraper', lead_name: gbpData.business_name || lead.business_name,
    gbp_rating: gbpData.gbp_rating, gbp_review_count: gbpData.gbp_review_count,
    address: gbpData.address, hours: gbpData.hours, phone: gbpData.phone,
    website_url: gbpData.website_url, sector: gbpData.sector || lead.sector,
    google_maps_url: lead.google_maps_url, raw_data: gbpData };
  let existingNotes = lead.notes || '';
  try { const p = JSON.parse(existingNotes); if (typeof p === 'object') { p.maps_scraper_data = seed; existingNotes = JSON.stringify(p, null, 2); }
    else { existingNotes = JSON.stringify({ maps_scraper_data: seed, user_notes: existingNotes }, null, 2); } }
  catch { existingNotes = JSON.stringify({ maps_scraper_data: seed, user_notes: existingNotes }, null, 2); }
  updates.notes = existingNotes;

  // Step 3: Store
  const { error: ue } = await supabase.from('leads').update(updates).eq('id', LEAD_ID);
  if (ue) { console.error(`❌ Update error: ${ue.message}`); console.log(JSON.stringify({ success: false, lead_id: LEAD_ID, error: ue.message })); process.exit(0); }

  console.error(`✅ Saved to Supabase`);

  // Step 4: Output for Marvel
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
      website_url: gbpData.website_url || lead.website_url,
      google_maps_url: lead.google_maps_url,
      is_zero_state: gbpData.website_url ? false : true,
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
