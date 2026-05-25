const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nttlteuatltynftxnjbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dGx0ZXVhdGx0eW5mdHhuamJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgyMjY5MiwiZXhwIjoyMDgyMzk4NjkyfQ.AIagW5Hj7zKUKHJquGgrqIR5eiwTsDXtZKIjkN7ORbk';

const supabase = createClient(supabaseUrl, supabaseKey);

// 2026-05-18 10:00 MYT = 02:00 UTC
const cutoff = '2026-05-18T02:00:00+00:00';

async function main() {
  // Leads created today after 10AM MYT
  const { data: createdToday } = await supabase
    .from('leads')
    .select('id, business_name, sector, created_at, enrichment_complete, updated_at, address, phone, website, google_rating')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false });

  // Fallback: leads updated today (in case created_at not set properly)
  const { data: updatedToday } = await supabase
    .from('leads')
    .select('id, business_name, sector, created_at, enrichment_complete, updated_at, address, phone, website, google_rating')
    .gte('updated_at', cutoff)
    .lt('updated_at', '2026-05-19T00:00:00+00:00')
    .order('updated_at', { ascending: false });

  console.log('=== CREATED AFTER 10AM MYT TODAY ===');
  if (createdToday && createdToday.length > 0) {
    console.log(`Count: ${createdToday.length}`);
    createdToday.forEach((l, i) => {
      const c = new Date(l.created_at).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
      const e = l.enrichment_complete ? 'ENRICHED' : 'PENDING';
      console.log(`${i+1}. ${l.business_name} | ${l.sector || 'N/A'} | created ${c} | ${e}`);
    });
  } else {
    console.log('No leads created today after 10AM MYT');
  }

  console.log('\n=== UPDATED AFTER 10AM MYT TODAY ===');
  if (updatedToday && updatedToday.length > 0) {
    console.log(`Count: ${updatedToday.length}`);
    const updatedInPeriod = updatedToday.filter(l => {
      const u = new Date(l.updated_at);
      return u >= new Date(cutoff) && u < new Date('2026-05-19T00:00:00+00:00');
    });
    console.log(`(Within period: ${updatedInPeriod.length})`);
    updatedInPeriod.forEach((l, i) => {
      const c = l.created_at ? new Date(l.created_at).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : 'N/A';
      const u = new Date(l.updated_at).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
      const e = l.enrichment_complete ? '✅' : '⏳';
      console.log(`${i+1}. ${e} ${l.business_name} | created ${c} | updated ${u} | ${l.sector || 'N/A'}`);
    });
  } else {
    console.log('No leads updated today');
  }

  // Overall stats
  const { count: totalCount } = await supabase.from('leads').select('id', { count: 'exact', head: true });
  const { count: enrichedCount } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('enrichment_complete', true);
  
  console.log(`\n=== OVERALL ===`);
  console.log(`Total leads: ${totalCount}`);
  console.log(`Enriched: ${enrichedCount}`);
  console.log(`Pending: ${totalCount - enrichedCount}`);

  // Sector breakdown for today's leads
  if (createdToday && createdToday.length > 0) {
    const sectorCounts = {};
    createdToday.forEach(l => {
      const s = l.sector || 'Unknown';
      sectorCounts[s] = (sectorCounts[s] || 0) + 1;
    });
    console.log(`\n=== TODAY'S LEADS BY SECTOR ===`);
    Object.entries(sectorCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([sector, count]) => console.log(`  ${sector}: ${count}`));
  }
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
