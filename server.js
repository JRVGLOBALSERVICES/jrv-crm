const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.resolve(__dirname, 'data', 'leads.json');
const DATA_DIR = path.resolve(__dirname, 'data');

app.use(cors());
app.use(express.json());

// Ensure data file exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

function readLeads() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); }
  catch { return []; }
}

function writeLeads(leads) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2));
}

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// API Routes
app.get('/api/leads', (req, res) => {
  const leads = readLeads().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(leads);
});

app.post('/api/leads', (req, res) => {
  const body = req.body;
  if (!body.business_name) return res.status(400).json({ error: 'Business name required' });
  
  const leads = readLeads();
  const lead = {
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    business_name: body.business_name,
    sector: body.sector || null,
    rating: body.rating || null,
    review_count: body.review_count || null,
    current_web_presence: body.current_web_presence || null,
    why_they_need_website: body.why_they_need_website || null,
    recommended_domain: body.recommended_domain || null,
    google_maps_url: body.google_maps_url || null,
    phone: body.phone || null,
    status: body.status || 'new',
    notes: body.notes || null,
    contacted_at: body.contacted_at || null,
    replied_at: null,
    pitched_at: null,
    closed_at: null,
    assigned_to: 'Vir',
  };
  
  leads.push(lead);
  writeLeads(leads);
  res.status(201).json(lead);
});

app.get('/api/leads/:id', (req, res) => {
  const lead = readLeads().find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Not found' });
  res.json(lead);
});

app.patch('/api/leads/:id', (req, res) => {
  const leads = readLeads();
  const idx = leads.findIndex(l => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const updates = { ...req.body, updated_at: new Date().toISOString() };
  if (req.body.status === 'contacted' && !leads[idx].contacted_at) updates.contacted_at = new Date().toISOString();
  if (req.body.status === 'replied' && !leads[idx].replied_at) updates.replied_at = new Date().toISOString();
  if (req.body.status === 'pitched' && !leads[idx].pitched_at) updates.pitched_at = new Date().toISOString();
  if (req.body.status === 'closed' && !leads[idx].closed_at) updates.closed_at = new Date().toISOString();

  leads[idx] = { ...leads[idx], ...updates };
  writeLeads(leads);
  res.json(leads[idx]);
});

app.delete('/api/leads/:id', (req, res) => {
  let leads = readLeads();
  const idx = leads.findIndex(l => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  leads.splice(idx, 1);
  writeLeads(leads);
  res.json({ success: true });
});

const PUBLIC_DIR = path.resolve(__dirname, 'public');

function servePage(res, page) {
  fs.readFile(path.join(PUBLIC_DIR, page), 'utf-8', (err, data) => {
    if (err) return res.status(500).send('Page not found');
    res.set('Content-Type', 'text/html');
    res.send(data);
  });
}

// Serve frontend (using readFile instead of sendFile to avoid sendFile bugs)
app.get('/', (req, res) => servePage(res, 'index.html'));
app.get('/leads/new', (req, res) => servePage(res, 'new-lead.html'));
app.get('/leads/:id', (req, res) => servePage(res, 'lead-detail.html'));

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ CRM Server running on http://localhost:${PORT}`);
});
