# Deployment — Batterijenplan.nl

Architecture: Django backend (Render / Railway / VPS) + PostgreSQL + React/Vite frontend (Vercel).

---

## 1. Backend (Django)

### Environment variables (required in production)

| Variable | Example | Notes |
|---|---|---|
| `SECRET_KEY` | *(long random string)* | Generate: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DEBUG` | `False` | Must be `False` in production |
| `ALLOWED_HOSTS` | `your-backend.onrender.com` | Comma-separated hostnames, no scheme |
| `DATABASE_URL` | `postgres://user:pass@host:5432/db` | Provided by Render/Railway when you attach PostgreSQL |
| `CORS_ALLOWED_ORIGINS` | `https://your-frontend.vercel.app` | Comma-separated, with `https://` |
| `CSRF_TRUSTED_ORIGINS` | `https://your-backend.onrender.com,https://your-frontend.vercel.app` | Comma-separated, with `https://` |

Optional: `SECURE_SSL_REDIRECT=False` if your platform already handles HTTPS redirects (default is `True` when `DEBUG=False`).

### Render

1. New → Web Service → connect this repo, branch `claude-scaffold-backup` (or `main` after merging).
2. Runtime: Python. Root directory: repo root.
3. **Build command:**
   ```
   pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
   ```
4. **Start command:**
   ```
   gunicorn config.wsgi:application
   ```
5. Add the environment variables from the table above.
6. New → PostgreSQL → create a database, then copy its **Internal Database URL** into `DATABASE_URL` on the web service.
7. After the first deploy, create an admin user from the service **Shell** tab:
   ```
   python manage.py createsuperuser
   ```
8. Admin is available at `https://your-backend.onrender.com/admin/`.

### Railway

1. New Project → Deploy from GitHub repo.
2. Add a **PostgreSQL** plugin; Railway injects `DATABASE_URL` automatically.
3. Set the remaining environment variables in the service → Variables.
4. Build command: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
5. Start command (Custom Start Command):
   ```
   python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
   ```
6. Create the superuser via `railway run python manage.py createsuperuser` (Railway CLI) or a one-off shell.

### VPS (Ubuntu, outline)

```bash
git clone <repo> && cd batterijenplan
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# put the env vars in /etc/environment, a systemd unit, or a .env loader of your choice
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
gunicorn config.wsgi:application --bind 127.0.0.1:8000   # behind nginx with TLS
```

---

## 2. PostgreSQL

- The app reads `DATABASE_URL` (via `dj-database-url`). Any standard `postgres://` URL works.
- Without `DATABASE_URL`, it falls back to local SQLite (`db.sqlite3`) — development only.
- Driver: `psycopg[binary]` (psycopg 3) is in `requirements.txt`; Django 6 no longer supports the old `psycopg2` package.
- Run `python manage.py migrate` against the new database before first use (included in the build/start commands above).
- Existing local SQLite content (posts, leads) is **not** migrated automatically. Re-create posts via `/admin/`, or use `python manage.py dumpdata blog leads taggit > data.json` locally and `loaddata` on the server.

---

## 3. Frontend (Vercel)

1. Import the repo in Vercel.
2. **Root Directory:** `frontend`
3. Framework preset: Vite (build command `npm run build`, output `dist` — the defaults).
4. Environment variable:
   - `VITE_API_BASE_URL` = `https://your-backend.onrender.com` (no `/api`, no trailing slash)
5. Deploy. Then set the resulting Vercel URL in the backend's `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`.

Because the app uses `react-router-dom`, deep links (e.g. `/post/some-slug`) need a rewrite to `index.html`. This is already handled by `frontend/vercel.json`, included in this repo.

Local development is unchanged: `npm run dev` proxies `/api` to `http://localhost:8000` (leave `VITE_API_BASE_URL` unset).

---

## 4. Command reference

| Task | Command |
|---|---|
| Install backend deps | `pip install -r requirements.txt` |
| Sanity check | `python manage.py check` |
| Migrations up to date? | `python manage.py makemigrations --check --dry-run` |
| Apply migrations | `python manage.py migrate` |
| Collect static (admin CSS etc.) | `python manage.py collectstatic --noinput` |
| Create admin user | `python manage.py createsuperuser` |
| Run backend (prod) | `gunicorn config.wsgi:application` |
| Build frontend | `cd frontend && npm install && npm run build` |

---

## 5. Known limitations / manual steps

- **Uploaded media (blog cover images):** in production (`DEBUG=False`) Django does not serve `/media/` and WhiteNoise only handles static files, not uploads. On Render's free tier the filesystem is also ephemeral. Options: attach a persistent disk and serve media via the web server, or move uploads to S3/Cloudinary (`django-storages`) later. Posts without cover images work fine as-is.
- **Root URL of the backend** serves the server-rendered calculator page (`/thuisbatterij-calculator/` via `calculators.urls`); the React frontend on Vercel is the public site.
- The `backend/` directory in the repo is an unused leftover scaffold — it is not part of the running app.
