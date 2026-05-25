import { createClient } from '@supabase/supabase-js';
const k = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dGx0ZXVhdGx0eW5mdHhuamJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgyMjY5MiwiZXhwIjoyMDgyMzk4NjkyfQ.AIagW5Hj7zKUKHJquGgrqIR5eiwTsDXtZKIjkN7ORbk';

const leadIds = [
  'c2ea2200-8258-44fb-88f5-4b73b52afd08',
  '26d32199-87de-4007-97ed-88e80581e2bd',
  'a41ccbe8-e10c-40af-8bc7-c467da18ef23',
  'dac90534-899f-4b83-9a07-5c202713a0d5',
  '92680690-99bf-4563-8814-e555d6344d67',
  '595d72d2-ad70-4534-8b71-82f057aa8afd',
  'da49864a-b48d-47bb-98c6-47ac9d9fa5a0',
  '4ca615a9-6242-42b4-841f-6483dd3fff95',
  'db78438d-ef1b-464f-942a-b5753dd0f4df',
  '905dc980-4324-4ab8-b61b-4ab413b1d06c',
  'cd3183db-e1da-429d-a782-dfb1fe2f66ae',
  '95edfc34-563b-4ab6-a456-1e46e3b5471e',
  'ad9956a5-e69a-4fd7-8042-efcdbcef459e',
  'ba273d03-cbed-45c4-8962-edf267103e94',
  '31a034f6-5f11-4031-8842-caecbf9bbb6a',
  '437e8948-8ffd-4f0e-89f5-4350bc004698',
  '8695240f-b492-4e6d-89d1-0f7d7b5a855b',
  'e8d16adf-b00d-4ef9-ae0f-9e423380b489',
  'bfa4fe00-dc12-482c-ad15-d389f0a43342',
  'b8c8bb98-3138-4b13-8d45-b51d243b843e'
];

(async () => {
  const c = createClient('https://nttlteuatltynftxnjbp.supabase.co', k, { auth: { persistSession: false } });
  const { data, error } = await c.from('leads').select('id, notes').in('id', leadIds);
  if (error) { console.error(error); process.exit(1); }
  
  const hasPrompts = {};
  for (const row of data) {
    hasPrompts[row.id] = (row.notes || '').includes('lead_architect_prompts');
  }
  
  const pending = leadIds.filter(id => !hasPrompts[id]);
  console.log('NEED_PROCESSING:');
  for (const id of pending) {
    console.log(id);
  }
  console.log('---');
  console.log('Total pending: ' + pending.length);
  console.log('Pending IDs: ' + JSON.stringify(pending));
})();
