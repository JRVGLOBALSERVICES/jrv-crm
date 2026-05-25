const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nttlteuatltynftxnjbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dGx0ZXVhdGx0eW5mdHhuamJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgyMjY5MiwiZXhwIjoyMDgyMzk4NjkyfQ.AIagW5Hj7zKUKHJquGgrqIR5eiwTsDXtZKIjkN7ORbk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Just grab the 30 most recent leads to see what's going on
  const { data: recent } = await supabase
    .from('leads')
    .select('id, business_name, sector, created_at, enrichment_complete, updated_at')
    .order('updated_at', { ascending: false })
    .limit(30);

  console.log('=== 30 MOST RECENTLY UPDATED LEADS ===');
  recent.forEach((l, i) => {
    const c = l.created_at || 'N/A';
    const u = l.updated_at || 'N/A';
    const e = l.enrichment_complete ? '✅' : '⏳';
    console.log(`${i+1}. ${e} ${l.business_name?.slice(0,50)} | created: ${c?.slice(11,19)} | updated: ${u?.slice(11,19)} | ${l.sector?.slice(0,30) || 'N/A'}`);
  });

  // Check what fields have "lead" or "generated" status
  console.log('\n=== EXPLORE FIRST LEAD KEYS ===');
  if (recent && recent.length > 0) {
    console.log(Object.keys(recent[0]).join(', '));
  }
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
