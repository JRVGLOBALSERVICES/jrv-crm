import { createClient } from '@supabase/supabase-js';
const c = createClient('https://nttlteuatltynftxnjbp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dGx0ZXVhdGx0eW5mdHhuamJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgyMjY5MiwiZXhwIjoyMDgyMzk4NjkyfQ.AIagW5Hj7zKUKHJquGgrqIR5eiwTsDXtZKIjkN7ORbk');
const { data } = await c.from('leads').select('id,business_name,google_maps_url').eq('google_maps_url','https://maps.app.goo.gl/ontKjoD4sf4AnhKF7');
for (const l of data||[]) console.log(l.id, '|', l.business_name);
