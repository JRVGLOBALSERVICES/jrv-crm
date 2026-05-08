const postgres = require('postgres');

async function migrate() {
  // postgres.js handles IPv6 better and auto-falls back
  const sql = postgres({
    host: 'db.nttlteuatltynftxnjbp.supabase.co',
    port: 5432,
    database: 'postgres',
    username: 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: { rejectUnauthorized: false },
    connection: { timeout: 15000 },
  });

  try {
    await sql`SELECT 1 as test`;
    console.log('✅ Connected to database');

    await sql`
      CREATE TABLE IF NOT EXISTS leads (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        business_name text NOT NULL,
        sector text,
        rating text,
        review_count integer DEFAULT 0,
        current_web_presence text,
        why_they_need_website text,
        recommended_domain text,
        google_maps_url text,
        phone text,
        status text DEFAULT 'new' CHECK (status IN ('new','contacted','replied','pitched','closed','lost')),
        notes text,
        contacted_at timestamptz,
        replied_at timestamptz,
        pitched_at timestamptz,
        closed_at timestamptz,
        assigned_to text DEFAULT 'Vir'
      );
    `;
    console.log('✅ leads table created');

    const tables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema='public' AND table_type='BASE TABLE'
      ORDER BY table_name
    `;
    console.log('Tables:', tables.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.message.includes('password') || err.message.includes('auth')) {
      console.log('Need the Supabase database password.');
      console.log('Get it from: https://supabase.com/dashboard/project/nttlteuatltynftxnjbp/settings/database');
      console.log('Then run: DB_PASSWORD=your_password node scripts/migrate.js');
    }
    if (err.message.includes('connect')) {
      console.log('Direct DB connection not available from this environment.');
      console.log('Please run the SQL in Supabase Dashboard SQL Editor instead.');
    }
  } finally {
    await sql.end();
  }
}

migrate();
