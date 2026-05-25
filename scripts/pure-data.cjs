const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nttlteuatltynftxnjbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dGx0ZXVhdGx0eW5mdHhuamJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgyMjY5MiwiZXhwIjoyMDgyMzk4NjkyfQ.AIagW5Hj7zKUKHJquGgrqIR5eiwTsDXtZKIjkN7ORbk';

const supabase = createClient(supabaseUrl, supabaseKey);
const cutoff = '2026-05-18T02:00:00+00:00';

async function main() {
  const { data: todayLeads, error: err } = await supabase
    .from('leads')
    .select('id, business_name, sector, created_at, enrichment_complete, phone, address, website_url, gbp_rating, gbp_review_count, status')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true });

  if (err) { console.error('Query error:', err.message); process.exit(1); }

  const totalToday = todayLeads?.length || 0;
  console.log(`TOTAL|${totalToday}`);

  if (todayLeads && todayLeads.length > 0) {
    const enriched = todayLeads.filter(l => l.enrichment_complete === true).length;
    const pending = todayLeads.filter(l => l.enrichment_complete === false).length;
    console.log(`ENRICHED|${enriched}`);
    console.log(`PENDING|${pending}`);

    // Sector breakdown
    const sectorCounts = {};
    todayLeads.forEach(l => {
      const s = l.sector || 'Unknown';
      sectorCounts[s] = (sectorCounts[s] || 0) + 1;
    });
    console.log(`SECTORS|${JSON.stringify(sectorCounts)}`);

    // Enriched leads data
    const top = todayLeads.filter(l => l.enrichment_complete);
    console.log(`DATA|${JSON.stringify(top.map(l => ({
      name: l.business_name,
      sector: l.sector,
      phone: l.phone,
      rating: l.gbp_rating,
      reviews: l.gbp_review_count,
      address: l.address ? l.address.slice(0,80) : null
    })))}`);
  }

  // Overall
  const { count: totalAll } = await supabase.from('leads').select('id', { count: 'exact', head: true });
  const { count: enrichedAll } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('enrichment_complete', true);
  console.log(`ALL|${totalAll}|${enrichedAll}|${totalAll - enrichedAll}`);
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
