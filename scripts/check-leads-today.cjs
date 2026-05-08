const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nttlteuatltynftxnjbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dGx0ZXVhdGx0eW5mdHhuamJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgyMjY5MiwiZXhwIjoyMDgyMzk4NjkyfQ.AIagW5Hj7zKUKHJquGgrqIR5eiwTsDXtZKIjkN7ORbk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Check today's updates (enrichment completed today)
  const todayStart = '2026-05-07T00:00:00+00:00';
  
  const { data: todayUpdates } = await supabase
    .from('leads')
    .select('*')
    .gte('updated_at', todayStart)
    .order('updated_at', { ascending: false })
    .limit(20);

  console.log('=== UPDATED TODAY ===');
  if (todayUpdates && todayUpdates.length > 0) {
    console.log(`Total: ${todayUpdates.length}`);
    todayUpdates.forEach(l => console.log(`  updated: ${l.updated_at} | ${l.business_name?.slice(0,50)} | enriched=${l.enrichment_complete}`));
  } else {
    console.log('No updates today');
  }

  // Check un-enriched leads
  const { data: notEnriched } = await supabase
    .from('leads')
    .select('id, business_name, created_at, enrichment_complete')
    .eq('enrichment_complete', false)
    .order('created_at', { ascending: false });

  console.log(`\n=== NOT ENRICHED: ${notEnriched?.length || 0} ===`);
  if (notEnriched) {
    notEnriched.forEach(l => console.log(`  ${l.created_at.slice(0,19)} | ${l.business_name?.slice(0,60)}`));
  }

  // Check enriched count overall
  const { data: enriched } = await supabase
    .from('leads')
    .select('id')
    .eq('enrichment_complete', true);

  console.log(`\n=== ENRICHED TOTAL: ${enriched?.length || 0} / 66 ===`);
  
  // Summary by sector
  const { data: sectorData } = await supabase
    .from('leads')
    .select('sector')
    .not('sector', 'is', null);

  if (sectorData && sectorData.length > 0) {
    const sectorCounts = {};
    sectorData.forEach(l => {
      const s = l.sector || 'Unknown';
      sectorCounts[s] = (sectorCounts[s] || 0) + 1;
    });
    console.log('\n=== LEADS BY SECTOR ===');
    Object.entries(sectorCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([sector, count]) => console.log(`  ${sector}: ${count}`));
  }
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
