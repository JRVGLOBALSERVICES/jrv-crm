-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- Creates the leads CRM table

CREATE TABLE IF NOT EXISTS leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Business Info
  business_name text NOT NULL,
  sector text,
  rating text,
  review_count integer DEFAULT 0,
  current_web_presence text,
  why_they_need_website text,
  recommended_domain text,
  google_maps_url text,
  phone text,
  
  -- CRM Fields
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'replied', 'pitched', 'closed', 'lost')),
  notes text,
  contacted_at timestamptz,
  replied_at timestamptz,
  pitched_at timestamptz,
  closed_at timestamptz,
  assigned_to text DEFAULT 'Vir',
  social_media jsonb DEFAULT '[]'::jsonb
);

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow all operations with service_role key (admin access)
CREATE POLICY "Full access via API key" ON leads
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at on any change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add social_media column (safe for existing tables)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS social_media jsonb DEFAULT '[]'::jsonb;
