# Batterijenplan — Django + React

Django backend (calculator, blog API, admin) with a React frontend (blog + calculator UI).

## Structure

```
manage.py
config/            # Django project settings/urls
calculators/        # Thuisbatterij calculator (Django view + /api/calculator/)
leads/               # Leads app — Lead model + POST /api/leads/
blog/                # Blog models/admin
api/                 # DRF endpoints (/api/posts/, /api/calculator/, /api/leads/, ...)
frontend/            # React (Vite) app — blog + /calculator route + lead capture
```

`backend/` contains the original scaffold copy of `blog`/`api` and is unused —
the real, wired-up apps are `blog/` and `api/` at the repo root.

## Backend setup

### Windows (PowerShell)

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser   # optional, needed to add blog posts
python manage.py runserver
```

### Linux / macOS (bash)

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser   # optional, needed to add blog posts
python manage.py runserver
```

Django runs on **http://127.0.0.1:8000**.

### Creating migrations

After changing any model (e.g. `leads/models.py`):

```bash
python manage.py makemigrations
python manage.py migrate
```

## Frontend setup

Same commands on Windows and Linux/macOS:

```bash
cd frontend
npm install
npm run dev
```

React (Vite) runs on **http://localhost:5173**. In development, Vite proxies
`/api` and `/media` requests to `http://localhost:8000` (see
`frontend/vite.config.js`), so both servers must be running at the same time.

## Endpoints

- `http://127.0.0.1:8000/thuisbatterij-calculator/` — original Django calculator page
- `http://127.0.0.1:8000/admin/` — Django admin (create blog posts here, status "published")
- `http://127.0.0.1:8000/api/posts/` — blog posts (JSON)
- `http://127.0.0.1:8000/api/calculator/` — calculator (POST, JSON)
- `http://127.0.0.1:8000/api/leads/` — lead capture (POST, JSON)
- `http://localhost:5173/` — React blog (articles)
- `http://localhost:5173/calculator` — React calculator, backed by `/api/calculator/`

## Testing the integration

1. Start the Django server (port 8000) and the Vite dev server (port 5173) as above.
2. Visit `http://127.0.0.1:8000/thuisbatterij-calculator/` — the original calculator
   should still work unchanged.
3. Visit `http://127.0.0.1:8000/api/posts/` — should return a JSON list (empty until
   you publish a post in the admin).
4. Visit `http://localhost:5173/calculator` — fill in the form and submit; it calls
   `POST /api/calculator/` and reuses the exact same calculation logic as the Django
   view (`calculators/services.py`).

## Lead capture

After a calculation on `http://localhost:5173/calculator`, an inline form
appears under the result ("Gratis batterijadvies ontvangen"). Four seconds
after the result, a modal popup opens ("Laat uw berekening gratis
controleren") with the same form — the modal and inline form share state, so
anything typed in one shows in the other. The modal shows at most once per
calculation (closing it keeps it closed until a new calculation) and never
again after a lead was submitted. Submitting either form sends a
`POST /api/leads/` with the contact details **plus** the calculator inputs
and result as JSON. The consent text links to a placeholder privacy page at
`/privacy`.

To test:

1. Run both servers, do a calculation on `/calculator`.
2. Wait 4 seconds — the modal appears. Close it with the ×,
   "Ik bekijk eerst mijn resultaat", the backdrop, or Escape; the inline
   form stays available under the result.
3. Fill in naam / telefoonnummer / e-mail, tick the consent checkbox, and
   submit. You should see "Bedankt, wij nemen binnenkort contact met u op."
4. Open `http://127.0.0.1:8000/admin/` → **Leads** → **Leads**. The new lead
   is listed with name, phone, email, postcode, source (`react_calculator`),
   consent and created-at. Open it to see `calculator_inputs` and
   `calculator_result` (read-only JSON).

Spam protection: the form contains a hidden `website` honeypot field. If a bot
fills it, the API responds as if it succeeded but stores nothing. Submissions
without consent are rejected with a Dutch error message.

## Design

"Industrieel energielabel": papierwit, inktzwart, hazard-geel, koper.
- Elke artikelkaart is een batterijcel: nokje bovenop, laadbalk onderaan
  waarvan de vulling de leestijd toont.
- De calculator-pagina hergebruikt dezelfde stijl: batterijcel-kaart voor het
  resultaat, geel/koper accenten, mono labels.

## Security note

`body_html` on blog posts is rendered with `dangerouslySetInnerHTML`. That's
fine as long as only you (via the Django admin) write posts. If third parties
can ever submit posts, add sanitization (e.g. `bleach` in the serializer or
`dompurify` in React).
