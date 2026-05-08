const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve('.');
const DATA_FILE = path.join(ROOT, 'data', 'leads.json');

function readLeads() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); }
  catch { return []; }
}

function writeLeads(leads) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2));
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function serveFile(res, filepath, type = 'text/html') {
  try {
    const data = fs.readFileSync(path.join(ROOT, 'public', filepath), 'utf-8');
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

function jsonResponse(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve(null); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;
  const pathname = url.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // API Routes
  if (pathname === '/api/leads' && method === 'GET') {
    const leads = readLeads().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return jsonResponse(res, 200, leads);
  }

  if (pathname === '/api/leads' && method === 'POST') {
    const body = await parseBody(req);
    if (!body || !body.business_name) return jsonResponse(res, 400, { error: 'Business name required' });
    const leads = readLeads();
    const lead = {
      id: uuid(),
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
      contacted_at: null, replied_at: null, pitched_at: null, closed_at: null,
      assigned_to: 'Vir',
    };
    leads.push(lead);
    writeLeads(leads);
    return jsonResponse(res, 201, lead);
  }

  // PATCH /api/leads/:id
  const patchMatch = pathname.match(/^\/api\/leads\/([a-f0-9-]+)$/);
  if (patchMatch && method === 'PATCH') {
    const id = patchMatch[1];
    const body = await parseBody(req);
    const leads = readLeads();
    const idx = leads.findIndex(l => l.id === id);
    if (idx === -1) return jsonResponse(res, 404, { error: 'Not found' });
    const updates = { ...body, updated_at: new Date().toISOString() };
    if (body?.status === 'contacted' && !leads[idx].contacted_at) updates.contacted_at = new Date().toISOString();
    if (body?.status === 'replied' && !leads[idx].replied_at) updates.replied_at = new Date().toISOString();
    if (body?.status === 'pitched' && !leads[idx].pitched_at) updates.pitched_at = new Date().toISOString();
    if (body?.status === 'closed' && !leads[idx].closed_at) updates.closed_at = new Date().toISOString();
    leads[idx] = { ...leads[idx], ...updates };
    writeLeads(leads);
    return jsonResponse(res, 200, leads[idx]);
  }

  // DELETE /api/leads/:id
  if (patchMatch && method === 'DELETE') {
    const id = patchMatch[1];
    const leads = readLeads();
    const idx = leads.findIndex(l => l.id === id);
    if (idx === -1) return jsonResponse(res, 404, { error: 'Not found' });
    leads.splice(idx, 1);
    writeLeads(leads);
    return jsonResponse(res, 200, { success: true });
  }

  // GET single lead
  if (patchMatch && method === 'GET') {
    const id = patchMatch[1];
    const lead = readLeads().find(l => l.id === id);
    if (!lead) return jsonResponse(res, 404, { error: 'Not found' });
    return jsonResponse(res, 200, lead);
  }

  // HTML Pages
  if (pathname === '/') return serveFile(res, 'index.html');
  if (pathname === '/leads/new') return serveFile(res, 'new-lead.html');

  // Lead detail page (any /leads/:id)
  const leadMatch = pathname.match(/^\/leads\/(.+)$/);
  if (leadMatch) return serveFile(res, 'lead-detail.html');

  // Not found
  res.writeHead(404);
  res.end('Not found');
});

// Clean up old server
process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🧠 CRM running on http://localhost:${PORT}`);
});
