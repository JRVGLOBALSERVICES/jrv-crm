import { createClient } from '@supabase/supabase-js';
const c = createClient('https://nttlteuatltynftxnjbp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dGx0ZXVhdGx0eW5mdHhuamJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgyMjY5MiwiZXhwIjoyMDgyMzk4NjkyfQ.AIagW5Hj7zKUKHJquGgrqIR5eiwTsDXtZKIjkN7ORbk');

// Try with count:exact like the working script
const { data, error, count } = await c.from('leads').select('*', { count: 'exact' }).order('created_at',{ascending:false}).limit(5);
if (error) { console.log('Error:', error.message); process.exit(1); }
console.log('Found:', data?.length, 'leads');
for (const l of data||[]) console.log(l.created_at?.substring(11,19), l.business_name?.substring(0,40), l.google_maps_url?.substring(0,60)||'(no url)');
