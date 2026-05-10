import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nttlteuatltynftxnjbp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dGx0ZXVhdGx0eW5mdHhuamJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgyMjY5MiwiZXhwIjoyMDgyMzk4NjkyfQ.AIagW5Hj7zKUKHJquGgrqIR5eiwTsDXtZKIjkN7ORbk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 10AM MYT = 2:00 AM UTC on May 10, 2026
const todayStart = '2026-05-10T02:00:00Z';
const now = '2026-05-10T03:30:00Z';

async function main() {
  // Get all leads added today after 10AM MYT
  const { data: todayLeads, error: fetchError, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .gte('created_at', todayStart)
    .lte('created_at', now)
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('Error fetching leads:', fetchError);
    return;
  }

  console.log('REPORT_DATA_START');
  console.log(JSON.stringify({
    totalToday: todayLeads?.length || 0,
    enrichedCount: todayLeads?.filter(l => l.enrichment_complete === true).length || 0,
    leads: todayLeads || []
  }, null, 2));
  console.log('REPORT_DATA_END');
}

main().catch(console.error);
