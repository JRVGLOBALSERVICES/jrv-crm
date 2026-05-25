const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nttlteuatltynftxnjbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dGx0ZXVhdGx0eW5mdHhuamJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgyMjY5MiwiZXhwIjoyMDgyMzk4NjkyfQ.AIagW5Hj7zKUKHJquGgrqIR5eiwTsDXtZKIjkN7ORbk';

const supabase = createClient(supabaseUrl, supabaseKey);
const cutoff = '2026-05-18T02:00:00+00:00';

async function main() {
  // ALL leads created today after 10AM MYT
  const { data: todayLeads, error: err } = await supabase
    .from('leads')
    .select('id, business_name, sector, created_at, enrichment_complete, phone, address, google_rating, website')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true });

  if (err) { console.error('Query error:', err.message); process.exit(1); }

  const totalToday = todayLeads?.length || 0;
  console.log(`TOTAL LEADS CREATED TODAY (after 10AM MYT): ${totalToday}`);
  console.log('');

  if (todayLeads && todayLeads.length > 0) {
    const enriched = todayLeads.filter(l => l.enrichment_complete === true).length;
    const pending = todayLeads.filter(l => l.enrichment_complete === false).length;
    
    console.log(`ENRICHED: ${enriched} / ${totalToday}`);
    console.log(`PENDING: ${pending}`);
    console.log('');

    // Sector breakdown
    const sectorCounts = {};
    todayLeads.forEach(l => {
      const s = l.sector || 'Unknown';
      sectorCounts[s] = (sectorCounts[s] || 0) + 1;
    });
    
    console.log('SECTOR BREAKDOWN:');
    Object.entries(sectorCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([sector, count]) => {
        const barLen = Math.round(count / totalToday * 20);
        console.log(`  ${'█'.repeat(barLen)}${'░'.repeat(20-barLen)} ${sector} (${count})`);
      });
    console.log('');

    // Top leads with enrichment
    console.log(`TOP LEADS (enriched):`);
    const top = todayLeads.filter(l => l.enrichment_complete).slice(0, 10);
    top.forEach((l, i) => {
      const rating = l.google_rating ? `⭐ ${l.google_rating}` : '';
      const phone = l.phone || 'N/A';
      const addr = l.address ? l.address.slice(0, 60) : '';
      console.log(`  ${i+1}. ${l.business_name}`);
      console.log(`     ${l.sector} | ${phone} ${rating}`);
      if (addr) console.log(`     ${addr}`);
      console.log('');
    });

    console.log(`SAMPLE CREATED_ATS:`);
    todayLeads.slice(0,3).forEach(l => {
      console.log(`  ${l.business_name?.slice(0,30)} → created_at: ${l.created_at}`);
    });
    todayLeads.slice(-2).forEach(l => {
      console.log(`  ${l.business_name?.slice(0,30)} → created_at: ${l.created_at}`);
    });
  }

  // Full stats
  const { count: totalAll } = await supabase.from('leads').select('id', { count: 'exact', head: true });
  const { count: enrichedAll } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('enrichment_complete', true);
  const pendingAll = totalAll - enrichedAll;
  
  console.log(`\n=== PIPELINE HEALTH ===`);
  console.log(`Total pipeline: ${totalAll} leads`);
  console.log(`Pipeline enriched: ${enrichedAll}/${totalAll} (${Math.round(enrichedAll/totalAll*100)}%)`);
  console.log(`Pipeline pending: ${pendingAll}`);
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
