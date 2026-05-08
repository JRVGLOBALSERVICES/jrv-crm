import http.server
import json
import os
import uuid
from datetime import datetime

DATA_FILE = os.path.join(os.path.dirname(__file__), 'data', 'leads.json')
PUBLIC_DIR = os.path.join(os.path.dirname(__file__), 'public')

def read_leads():
    try:
        with open(DATA_FILE) as f:
            return json.load(f)
    except:
        return []

def write_leads(leads):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, 'w') as f:
        json.dump(leads, f, indent=2)

def json_response(resp, status, data):
    resp.send_response(status)
    resp.send_header('Content-Type', 'application/json')
    resp.send_header('Access-Control-Allow-Origin', '*')
    resp.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE')
    resp.send_header('Access-Control-Allow-Headers', 'Content-Type')
    resp.end_headers()
    resp.wfile.write(json.dumps(data).encode())

class CRMHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/leads':
            leads = sorted(read_leads(), key=lambda l: l.get('created_at', ''), reverse=True)
            return json_response(self, 200, leads)

        if self.path.startswith('/api/leads/'):
            lid = self.path.split('/')[-1]
            leads = read_leads()
            lead = next((l for l in leads if l['id'] == lid), None)
            if not lead:
                return json_response(self, 404, {'error': 'Not found'})
            return json_response(self, 200, lead)

        # Serve static files
        if self.path == '/':
            self.path = '/index.html'
        elif self.path.startswith('/leads/'):
            self.path = '/lead-detail.html'

        return super().do_GET()

    def do_POST(self):
        if self.path == '/api/leads':
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length)) if length else {}
            
            if not body.get('business_name'):
                return json_response(self, 400, {'error': 'Business name required'})

            leads = read_leads()
            now = datetime.utcnow().isoformat() + 'Z'
            lead = {
                'id': str(uuid.uuid4()),
                'created_at': now,
                'updated_at': now,
                'business_name': body['business_name'],
                'sector': body.get('sector'),
                'rating': body.get('rating'),
                'review_count': body.get('review_count'),
                'current_web_presence': body.get('current_web_presence'),
                'why_they_need_website': body.get('why_they_need_website'),
                'recommended_domain': body.get('recommended_domain'),
                'google_maps_url': body.get('google_maps_url'),
                'phone': body.get('phone'),
                'status': body.get('status', 'new'),
                'notes': body.get('notes'),
                'contacted_at': None, 'replied_at': None, 'pitched_at': None, 'closed_at': None,
                'assigned_to': 'Vir',
            }
            leads.append(lead)
            write_leads(leads)
            return json_response(self, 201, lead)

    def do_PATCH(self):
        if self.path.startswith('/api/leads/'):
            lid = self.path.split('/')[-1]
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length)) if length else {}

            leads = read_leads()
            for i, l in enumerate(leads):
                if l['id'] == lid:
                    now = datetime.utcnow().isoformat() + 'Z'
                    updates = {**body, 'updated_at': now}
                    if body.get('status') == 'contacted' and not l.get('contacted_at'):
                        updates['contacted_at'] = now
                    if body.get('status') == 'replied' and not l.get('replied_at'):
                        updates['replied_at'] = now
                    if body.get('status') == 'pitched' and not l.get('pitched_at'):
                        updates['pitched_at'] = now
                    if body.get('status') == 'closed' and not l.get('closed_at'):
                        updates['closed_at'] = now
                    leads[i] = {**l, **updates}
                    write_leads(leads)
                    return json_response(self, 200, leads[i])

            return json_response(self, 404, {'error': 'Not found'})

    def do_DELETE(self):
        if self.path.startswith('/api/leads/'):
            lid = self.path.split('/')[-1]
            leads = read_leads()
            new_leads = [l for l in leads if l['id'] != lid]
            if len(new_leads) == len(leads):
                return json_response(self, 404, {'error': 'Not found'})
            write_leads(new_leads)
            return json_response(self, 200, {'success': True})

if __name__ == '__main__':
    os.chdir(PUBLIC_DIR)
    port = int(os.environ.get('PORT', 3000))
    server = http.server.HTTPServer(('0.0.0.0', port), CRMHandler)
    print(f'🧠 CRM running on http://localhost:{port}')
    server.serve_forever()
