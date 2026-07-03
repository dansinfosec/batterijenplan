# Batterijenplan — Django + React

Django backend (calculator, blog API, admin) with a React frontend (blog + calculator UI).

## Structure

```
manage.py
config/            # Django project settings/urls
calculators/        # Thuisbatterij calculator (Django view + /api/calculator/)
leads/               # Leads app
blog/                # Blog models/admin
api/                 # DRF endpoints (/api/posts/, /api/calculator/, ...)
frontend/            # React (Vite) app — blog + /calculator route
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
