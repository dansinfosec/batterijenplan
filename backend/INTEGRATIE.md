# Blog-apps toevoegen aan je bestaande project

Jouw repo heeft al: config/, calculators/, leads/, manage.py.
Kopieer de mappen `blog/` en `api/` uit deze scaffold naast je bestaande apps.

## 1. Installeer dependencies
```bash
pip install djangorestframework django-cors-headers django-taggit Markdown Pillow
pip freeze > requirements.txt
```

## 2. config/settings.py — voeg toe

```python
INSTALLED_APPS += [
    "rest_framework",
    "corsheaders",
    "taggit",
    "blog",
    "api",
]

# corsheaders middleware BOVEN CommonMiddleware:
MIDDLEWARE.insert(
    MIDDLEWARE.index("django.middleware.common.CommonMiddleware"),
    "corsheaders.middleware.CorsMiddleware",
)

CORS_ALLOWED_ORIGINS = ["http://localhost:5173"]  # React dev server

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticatedOrReadOnly"],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
}

# Als je nog geen MEDIA-config hebt:
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
```

## 3. config/urls.py — voeg toe

```python
from django.urls import include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns += [path("api/", include("api.urls"))]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

## 4. Migreren en testen
```bash
python manage.py makemigrations blog
python manage.py migrate
python manage.py runserver
```

Maak in de admin (http://localhost:8000/admin/) een post aan met status
"published", en check http://localhost:8000/api/posts/ — daar hoort JSON
te staan.

## 5. Productie later (batterijenplan.nl)
- Voeg je domein toe aan CORS_ALLOWED_ORIGINS en ALLOWED_HOSTS
- Draai `npm run build` in frontend/ en serveer de `dist/` map via je
  webserver (bijv. nginx) op /blog, of op een subdomein zoals blog.batterijenplan.nl
