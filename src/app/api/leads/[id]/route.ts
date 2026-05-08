import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'data', 'leads.json')

function readLeads(): any[] {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  } catch {
    return []
  }
}

function writeLeads(leads: any[]) {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2))
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const leads = readLeads()
  const lead = leads.find((l) => l.id === params.id)
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }
  return NextResponse.json(lead)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const leads = readLeads()
    const index = leads.findIndex((l: any) => l.id === params.id)

    if (index === -1) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Auto-set timestamp fields based on status
    const updates: Record<string, any> = { ...body, updated_at: new Date().toISOString() }
    if (body.status === 'contacted' && !leads[index].contacted_at) updates.contacted_at = new Date().toISOString()
    if (body.status === 'replied' && !leads[index].replied_at) updates.replied_at = new Date().toISOString()
    if (body.status === 'pitched' && !leads[index].pitched_at) updates.pitched_at = new Date().toISOString()
    if (body.status === 'closed' && !leads[index].closed_at) updates.closed_at = new Date().toISOString()

    leads[index] = { ...leads[index], ...updates }
    writeLeads(leads)

    return NextResponse.json(leads[index])
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  let leads = readLeads()
  const index = leads.findIndex((l: any) => l.id === params.id)

  if (index === -1) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  leads.splice(index, 1)
  writeLeads(leads)

  return NextResponse.json({ success: true })
}
