import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'leads.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2))
  }
}

function readLeads(): any[] {
  ensureDataDir()
  const raw = fs.readFileSync(DATA_FILE, 'utf-8')
  return JSON.parse(raw)
}

function writeLeads(leads: any[]) {
  ensureDataDir()
  fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2))
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export async function GET() {
  const leads = readLeads()
  // Sort by created_at desc
  leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return NextResponse.json(leads)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const leads = readLeads()

    const newLead = {
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
      notes: body.notes || null,
      status: 'new',
      contacted_at: null,
      replied_at: null,
      pitched_at: null,
      closed_at: null,
      assigned_to: 'Vir',
    }

    leads.push(newLead)
    writeLeads(leads)

    return NextResponse.json(newLead, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
