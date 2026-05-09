#!/usr/bin/env node
/**
 * Seremban Market Analysis Tool
 * Uses Google Places API to check qualifying leads per sector
 * Also outputs the master category list
 *
 * Usage: node scripts/seremban-market-analysis.mjs
 */

const PLACES_API_KEY = 'AIzaSyBFcHYlDBMHdtr3RmiUmp8AvPhAlGLjpJI';

const CATEGORIES = [
  // === ORIGINAL 20 (Old) ===
  { name: 'Automotive / Workshops', query: 'car workshop Seremban', group: 'old' },
  { name: 'Beauty / Salons / Spa', query: 'beauty salon Seremban', group: 'old' },
  { name: 'Pet Services / Grooming', query: 'pet shop Seremban', group: 'old' },
  { name: 'Healthcare / Clinics / Dental', query: 'clinic Seremban', group: 'old' },
  { name: 'F&B / Restaurants', query: 'restaurant Seremban', group: 'old' },
  { name: 'Fitness / Gyms', query: 'gym Seremban', group: 'old' },
  { name: 'Retail / Fashion', query: 'fashion boutique Seremban', group: 'old' },
  { name: 'Education / Training', query: 'tuition centre Seremban', group: 'old' },
  { name: 'Real Estate / Agencies', query: 'real estate agent Seremban', group: 'old' },
  { name: 'Home Services / Renovation', query: 'renovation contractor Seremban', group: 'old' },
  { name: 'Travel Agencies', query: 'travel agency Seremban', group: 'old' },
  { name: 'Hotels / Accommodation', query: 'hotel Seremban', group: 'old' },
  { name: 'Event Planning / Weddings', query: 'wedding planner Seremban', group: 'old' },
  { name: 'Laundry / Dry Clean', query: 'laundry service Seremban', group: 'old' },
  { name: 'Construction / Materials', query: 'building materials Seremban', group: 'old' },
  { name: 'Furniture / Home', query: 'furniture store Seremban', group: 'old' },
  { name: 'Financial Services', query: 'financial services Seremban', group: 'old' },
  { name: 'Legal / Law Firms', query: 'law firm Seremban', group: 'old' },
  { name: 'Electronics / IT', query: 'electronics shop Seremban', group: 'old' },
  { name: 'Photography / Studio', query: 'photography studio Seremban', group: 'old' },

  // === NEW CATEGORIES ===
  { name: 'Vet Clinic / Pet Shop', query: 'veterinary clinic Seremban', group: 'new' },
  { name: 'Tyre & Battery Shop', query: 'tyre shop Seremban', group: 'new' },
  { name: 'Cafe / Kopitiam', query: 'cafe Seremban', group: 'new' },
  { name: 'Cloud Kitchen / Home Cooking', query: 'home cooked food Seremban', group: 'new' },
  { name: 'Car Wash & Detailing', query: 'car wash Seremban', group: 'new' },
  { name: 'Computer / Skills Training', query: 'computer training Seremban', group: 'new' },
  { name: 'Massage / Reflexology', query: 'massage Seremban', group: 'new' },
  { name: 'Optical Shop', query: 'optician Seremban', group: 'new' },
  { name: 'Physiotherapy', query: 'physiotherapy Seremban', group: 'new' },
  { name: 'Traditional Chinese Medicine', query: 'traditional chinese medicine Seremban', group: 'new' },
  { name: 'Florist', query: 'florist Seremban', group: 'new' },
  { name: 'Car Accessories', query: 'car accessories Seremban', group: 'new' },
  { name: 'Pharmacy', query: 'pharmacy Seremban', group: 'new' },
  { name: 'Bakery / Confectionery', query: 'bakery Seremban', group: 'new' },
  { name: 'Catering Service', query: 'catering Seremban', group: 'new' },
  { name: 'Tailor / Alterations', query: 'tailor Seremban', group: 'new' },
  { name: 'Hardware Store', query: 'hardware store Seremban', group: 'new' },
  { name: 'Aircond Service', query: 'air conditioner service Seremban', group: 'new' },
  { name: 'Pest Control', query: 'pest control Seremban', group: 'new' },
  { name: 'Landscaping', query: 'landscaping Seremban', group: 'new' },
  { name: 'Wellness Centre', query: 'wellness centre Seremban', group: 'new' },
  { name: 'Nursery / Garden', query: 'plant nursery Seremban', group: 'new' },
  { name: 'Fishery', query: 'fishery Seremban', group: 'new' },
  { name: 'Used Car Dealers', query: 'used car dealer Seremban', group: 'new' },
  { name: 'Motorcycle Workshop', query: 'motorcycle workshop Seremban', group: 'new' },
  { name: 'Carpenter', query: 'carpenter Seremban', group: 'new' },
  { name: 'Electrical Contractor', query: 'electrician Seremban', group: 'new' },
  { name: 'Plumber', query: 'plumber Seremban', group: 'new' },
  { name: 'Cleaning Service', query: 'cleaning service Seremban', group: 'new' },
  { name: 'Security Guard Service', query: 'security service Seremban', group: 'new' },
  { name: 'Interior Designer', query: 'interior designer Seremban', group: 'new' },
  { name: 'Insurance Agent', query: 'insurance agent Seremban', group: 'new' },
  { name: 'Accounting / Tax', query: 'accountant Seremban', group: 'new' },
  { name: 'Recruitment Agency', query: 'recruitment agency Seremban', group: 'new' },
  { name: 'Marketing Agency', query: 'marketing agency Seremban', group: 'new' },
  { name: 'Courier Service', query: 'courier service Seremban', group: 'new' },
  { name: 'Business Consultancy', query: 'business consultant Seremban', group: 'new' },
  { name: 'Yoga Studio', query: 'yoga Seremban', group: 'new' },
  { name: 'Tent / Canopy Rental', query: 'canopy rental Seremban', group: 'new' },
  { name: 'Sound System Rental', query: 'sound system rental Seremban', group: 'new' },
  { name: 'Homestay / Hostel', query: 'homestay Seremban', group: 'new' },
  { name: 'Budget Hotel', query: 'budget hotel Seremban', group: 'new' },
  { name: 'Resort', query: 'resort Seremban', group: 'new' },
  { name: 'Farm / Orchard', query: 'farm Seremban', group: 'new' },
  { name: 'Banner / Signage Printing', query: 'banner printing Seremban', group: 'new' },
  { name: 'Uniform Supplier', query: 'uniform supplier Seremban', group: 'new' },
  { name: 'Batik / Traditional Textile', query: 'batik Seremban', group: 'new' },
  { name: 'Trucking / Logistics', query: 'logistics company Seremban', group: 'new' },
  { name: 'Moving Service', query: 'moving company Seremban', group: 'new' },
  { name: 'Freight Forwarding', query: 'freight forwarding Seremban', group: 'new' },
  { name: 'Recycling Centre', query: 'recycling Seremban', group: 'new' },
  { name: 'Drone Service', query: 'drone service Seremban', group: 'new' },
  { name: 'Bookstore / Stationery', query: 'bookstore Seremban', group: 'new' },
  { name: 'Daycare / Kindergarten', query: 'kindergarten Seremban', group: 'new' },
  { name: 'Music / Dance School', query: 'music school Seremban', group: 'new' },
  { name: 'Driving School', query: 'driving school Seremban', group: 'new' },
  { name: 'Language Centre', query: 'language centre Seremban', group: 'new' },
  { name: 'Karaoke / Arcade', query: 'karaoke Seremban', group: 'new' },
  { name: 'Escape Room / Bowling', query: 'entertainment Seremban', group: 'new' },
  { name: 'T-shirt Printing / Embroidery', query: 'printing shop Seremban', group: 'new' },
];

async function searchCategory(cat) {
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.rating,places.userRatingCount,places.websiteUri',
      },
      body: JSON.stringify({ textQuery: cat.query, maxResultCount: 20 }),
    });
    if (!res.ok) return { ...cat, total: 0, qualified: 0, highReviews: 0, highStars: 0, noWebsite: 0, samples: [] };

    const data = await res.json();
    const places = data?.places || [];
    let highReviews = 0, highStars = 0, noWebsite = 0, qualifies = 0;
    const samples = [];

    for (const p of places) {
      const r = p.rating || 0, rc = p.userRatingCount || 0, w = !!p.websiteUri;
      if (rc >= 100) highReviews++;
      if (r >= 4.5) highStars++;
      if (!w) noWebsite++;
      if (rc >= 100 && r >= 4.5 && !w) { qualifies++; samples.push(`${p.displayName?.text || 'X'} (${r}★, ${rc} reviews)`); }
    }

    return { ...cat, total: places.length, qualified: qualifies, highReviews, highStars, noWebsite, samples: samples.slice(0, 3) };
  } catch {
    return { ...cat, total: 0, qualified: 0, highReviews: 0, highStars: 0, noWebsite: 0, samples: [] };
  }
}

async function main() {
  const mode = process.argv[2] || 'full';

  if (mode === 'list') {
    // Just print the master category list
    console.log('// MASTER CATEGORY LIST — Seremban Lead Gen');
    console.log('// Old 20 + New categories with qualifying leads\n');
    console.log('export const SEREMBAN_CATEGORIES = [');
    CATEGORIES.forEach(c => console.log(`  { name: "${c.name}", query: "${c.query}", group: "${c.group}" },`));
    console.log('];');
    return;
  }

  // Full analysis
  console.log('Seremban Market Analysis\n');

  const results = [];
  for (let i = 0; i < CATEGORIES.length; i += 5) {
    const batch = CATEGORIES.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(c => searchCategory(c)));
    results.push(...batchResults);
    if (i + 5 < CATEGORIES.length) await new Promise(r => setTimeout(r, 200));
  }

  const qualified = results.filter(r => r.qualified > 0).sort((a, b) => b.qualified - a.qualified);
  const oldQualified = results.filter(r => r.group === 'old' && r.qualified > 0).length;
  const newQualified = results.filter(r => r.group === 'new' && r.qualified > 0).length;

  console.log(`Total categories scanned: ${CATEGORIES.length}`);
  console.log(`Old categories: 20`);
  console.log(`New categories: ${CATEGORIES.length - 20}`);
  console.log(`Categories with qualified leads: ${qualified.length}`);
  console.log(`  Old: ${oldQualified}`);
  console.log(`  New: ${newQualified}`);
  console.log(`Total qualified leads across all sectors: ${qualified.reduce((s, r) => s + r.qualified, 0)}`);

  console.log('\n--- MASTER LIST (ranked by qualified leads) ---');
  qualified.forEach((r, i) => {
    const icon = r.group === 'old' ? '🔵' : '🆕';
    console.log(`${i+1}. ${icon} ${r.name} — ${r.qualified} leads (${r.highReviews} high-reviews, ${r.highStars} high-stars, ${r.noWebsite} no-website)`);
    r.samples.forEach(s => console.log(`     → ${s}`));
  });

  console.log(`\nTotal qualifying categories: ${qualified.length}`);
}

main().catch(console.error);
